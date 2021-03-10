import { Injectable } from '@angular/core';
import { parse } from 'psl';
import { BehaviorSubject, forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, filter, last, map, switchMap, tap } from 'rxjs/operators';
import { ExpertiseService } from '../shared/expertise/expertise.service';
import { binaryInsert, parseDomain } from '../shared/utils';
import { AppProfileService } from './app-profile.service';
import { AppProfile, LayeredProfile } from './app-profile.types';
import { ExpertiseLevel } from './config.types';
import { ConnectionStatistics } from './connection-tracker.types';
import { RiskLevel } from './core.types';
import { Connection, ScopeIdentifier, ScopeTranslation, Verdict } from './network.types';
import { PortapiService } from './portapi.service';
import { DataReply, retryPipeline } from './portapi.types';

/**
 * ConnectionAddedEvent is emitted by a Profile when a
 * new connection has been added.
 */
export interface ConnectionAddedEvent {
  type: 'added' | 'update';
  key: string;
  conn: Connection;
}

/**
 * ConnectionDeletedEvent is emitted by a Profile when a
 * connection has been deleted.
 */
export interface ConnectionDeletedEvent {
  type: 'deleted';
  key: string;
}

/**
 * ConnectionUpdateEvent can be emitted by a Profile whenever
 * a connection is added or removed from the profile.
 */
export type ConnectionUpdateEvent = ConnectionAddedEvent | ConnectionDeletedEvent;

export class ProcessGroup {
  /** A set of permitted conneciton keys */
  private permitted = new Set<string>();

  /** A set of not-permitted (verdict != accept) connection keys */
  private unpermitted = new Set<string>();

  /** A set of internal connections */
  private internal = new Set<string>();

  /** The current block status of the profile. */
  private _blockStatus: RiskLevel = RiskLevel.Off;

  /**
   * Subject used to notify subscribers about the addtion or removal
   * of a connection.
   */
  private _notifier = new Subject<ConnectionUpdateEvent>();

  /** The current (readlonly) block status of the profile. */
  get blockStatus() { return this._blockStatus; }

  /** Emits connection update events to any subscriber */
  get updates() {
    return this._notifier.asObservable();
  }

  /** Empty is true if there are not active connections for this profile */
  get empty() {
    return this.size === 0;
  }

  /** Returns the number of active connections of this profile */
  get size() {
    return this.permitted.size + this.unpermitted.size;
  }

  /** Returns the number of permitted connections. */
  get countAllowed() {
    return this.permitted.size;
  }

  /** Returns the number of unpermitted connections. */
  get countUnpermitted() {
    return this.unpermitted.size;
  }

  constructor(
    public readonly ID: string,
    public name: string,
    public readonly Source: string,
  ) { }

  /** Name is the name of the profile */
  get Name(): string {
    return this.name;
  }

  /** Sets a new name for the process group. */
  setName(name: string) {
    this.name = name;
  }

  /** Dispose the profile and all resources associated with it */
  dispose() {
    this._notifier.complete();
    this.permitted.clear();
    this.unpermitted.clear();
  }

  /**
   * Track tracks the connection and correctly calculates the
   * the profiles block status.
   * Internal connections are tracked as well but are not used
   * for statistic calculations.
   *
   * @param key The database key of the connection
   * @param conn The actual connection object.
   */
  track(key: string, conn: Connection, update = false) {
    if (conn.Internal) {
      this.internal.add(key);
    } else {
      let setToUse = conn.Verdict === Verdict.Accept
        ? this.permitted
        : this.unpermitted;

      setToUse.add(key);

      this.updateBlockStatus();
    }

    this._notifier.next({
      type: update ? 'update' : 'added',
      key,
      conn,
    })
  }

  /**
   * Forget a about a network connection and update
   * the profiles block status.
   *
   * @param connKey The database key of the connection
   */
  forget(connKey: string) {
    this.permitted.delete(connKey);
    this.unpermitted.delete(connKey);
    this.internal.delete(connKey);

    this.updateBlockStatus();
    this._notifier.next({
      type: 'deleted',
      key: connKey,
    });
  }

  /**
   * Get all returns a list of all connection keys
   * that are currently associated to the profile.
   *
   * @param includeInternal Whether or not internal connections should be included.
   */
  getAll(includeInternal = false): string[] {
    return [
      ...Array.from(this.permitted),
      ...Array.from(this.unpermitted),
      ...(includeInternal ? Array.from(this.internal) : []),
    ]
  }

  /**
   * Updates the current block status value of the
   * profile.
   */
  private updateBlockStatus() {
    let bs = RiskLevel.Off;
    const permitted = this.permitted.size;
    const unpermitted = this.unpermitted.size;

    if (permitted == 0 && unpermitted > 0) {
      // everything has been blocked.
      bs = RiskLevel.High;
    } else
      if (unpermitted === 0 && permitted > 0) {
        // everything has been permitted
        bs = RiskLevel.Low;
      }

    this._blockStatus = bs;
  }
}

export class ScopeGroup {
  /** Domain holds the eTLD+1 of the scope group, if any */
  public readonly domain: string | null;

  /** Subdomain holds the sub-domain of the scope group,
   *  if any */
  public readonly subdomain: string | null;

  /** Stats holds connection statistics all connections
   *  in the scope group */
  public readonly stats = new ConnectionStatistics();

  /** Connections is a list of all connections that belong
   *  to the scope. */
  private _connections: Connection[] = [];

  /** Connections is a list of connections that belong
   *  to the scope but have been verdicted with a stale profile.
   */
  private _oldConnections: Connection[] = [];

  /** An behavior subject to emit the current set of connections
   *  that are attributed to this scope group. */
  private _connectionUpdate = new BehaviorSubject<Connection[]>([]);

  /** An behavior subject to emit the current set of old-connections
   *  that are attributed to this scope group. */
  private _oldConnectionUpdate = new BehaviorSubject<Connection[]>([]);

  /** The current block status of the scope group. */
  private _blockStatus: RiskLevel = RiskLevel.Off;

  /** Subscription to changes in the expertise level */
  private _expertiseSubscription = Subscription.EMPTY;

  /** Sort function for connections that sorts then by most recent. */
  public static readonly SortByMostRecent = (a: Connection, b: Connection) => {
    let diff = a.Started - b.Started;
    if (diff !== 0) {
      return diff;
    }

    diff = (a.Ended || 0) - (b.Ended || 0);
    if (diff !== 0) {
      return diff;
    }

    if (a.Scope > b.Scope) {
      return 1;
    }
    if (a.Scope < b.Scope) {
      return -1;
    }
    return 0;
  }

  /**
   * Highest revision holds the highest profile revision used to verdict
   * a connection.
   */
  highestRevision: number = 0;

  /** Holds the current block status of the scope group */
  get blockStatus() {
    return this._blockStatus;
  }

  /** An observable that emits all connections that belong to the
   *  scope group. */
  get connections() {
    return this._connectionUpdate.asObservable();
  }

  /**
   * True if there are still old connections that have been verdicted
   * using a stale profile.
   */
  hasOldConnections = false;

  /**
   * True if there are new (non-internal) connections.
   */
  hasNewConnections = false;

  /** An observable that emits all old-connections that belong to the
   *  scope group. */
  get oldConnections() {
    return this._oldConnectionUpdate.asObservable();
  }

  /** Empty returns true if the scope group is empty */
  get empty() {
    return this.size === 0;
  }

  /** Size returns the number of (non-internal) connections */
  get size() {
    return this._connections.length + this._oldConnections.length - this.stats.countInternal;
  }

  constructor(
    public readonly scope: string,
    private expertiseService: ExpertiseService,
  ) {
    this.domain = null;
    this.subdomain = null;

    // check if it's a scope by looking up the value in
    // our scope translation list.
    if (ScopeTranslation[this.scope] === undefined) {
      // If it's not a scope it must be a domain.
      Object.assign(this, parseDomain(this.scope));
    }

    // We republish the connections whenever the expertise changes.
    this._expertiseSubscription = this.expertiseService.change.subscribe(
      () => this.publishConnections()
    )
  }

  /**
   * Add a connection to the scope group and update
   * the current statistics, block-status and revision
   * tracker.
   *
   * @param conn The connection to add.
   */
  add(conn: Connection) {
    this.stats.update(conn);

    // check if the connection has a high revision counter than
    // we know of.
    this.checkRevisionCounter(conn.ProfileRevisionCounter, true);

    if (conn.ProfileRevisionCounter === this.highestRevision) {
      //this._connections.push(conn);
      binaryInsert(this._connections, conn, ScopeGroup.SortByMostRecent)
    } else {
      //this._oldConnections.push(conn);
      binaryInsert(this._oldConnections, conn, ScopeGroup.SortByMostRecent)
    }

    this.updateBlockStatus();
    this.publishConnections();
  }

  /**
   * Remove a connection from the scope group by updating
   * the statistics and block-status.
   *
   * @param conn The connection to remove
   */
  remove(conn: Connection) {
    this.stats.remove(conn);

    if (conn.ProfileRevisionCounter === this.highestRevision) {
      this._connections = this._connections
        .filter(c => c.ID !== conn.ID);
    } else {
      this._oldConnections = this._oldConnections
        .filter(c => c.ID !== conn.ID);
    }

    this.updateBlockStatus();
    this.publishConnections();
  }

  /** Dispose the scope group an all associated resources. */
  dispose() {
    this._connectionUpdate.complete();
    this._connections = [];
    this._expertiseSubscription.unsubscribe();
  }

  /**
   * Check the highest known revision counter againts newRec
   * and updates the internal revision and connections arrays
   * accordingly.
   *
   * @param newRev The new revision counter
   * @param internal True if called from the scope-group itself.
   */
  checkRevisionCounter(newRev: number, internal = false) {
    if (newRev > this.highestRevision) {
      // we have a new "highest" revision counter
      // so merge all "current" connections with the old ones
      // and start fresh.
      this.highestRevision = newRev;
      this._oldConnections = this._oldConnections.concat(this._connections);
      this._connections = [];

      if (!internal) {
        this.publishConnections();
      }
    }
  }

  /** Filter and publish a list of connection on a given subject */
  private filterAndPublish(conns: Connection[], subj: Subject<Connection[]>) {
    subj.next(
      conns
        .filter(conn => {
          if (this.expertiseService.currentLevel === ExpertiseLevel.Developer) {
            return true;
          }
          return !conn.Internal;
        })
    );
  }

  /** Publish all old-rev and current-rev connections */
  private publishConnections() {
    this.hasOldConnections = this._oldConnections.length > 0 && this._oldConnections.some(conn => conn.Ended === 0);
    this.hasNewConnections = this._connections.length > 0 && this._connections.some(conn => !conn.Internal);

    this.filterAndPublish(this._connections, this._connectionUpdate);
    this.filterAndPublish(this._oldConnections, this._oldConnectionUpdate);
  }

  /**
   * Updates the current block status value of the
   * scope group.
   */
  private updateBlockStatus() {
    let bs = RiskLevel.Off;
    const permitted = this.stats.countAccepted;
    const unpermitted = this.size - permitted;

    if (permitted == 0 && unpermitted > 0) {
      // everything has been blocked.
      bs = RiskLevel.High;
    } else
      if (unpermitted === 0 && permitted > 0) {
        // everything has been permitted
        bs = RiskLevel.Low;
      }

    this._blockStatus = bs;
  }
}

export class InspectedProfile {
  /** Subscription to the profiles notifier */
  private _profileSubscription = Subscription.EMPTY;

  /** Stats holds connection statistics for the whole profile */
  private _stats = new ConnectionStatistics();

  /** A map of connections indexed by the database key */
  private _connections = new Map<string, Connection>();

  /** A map of scope groupings index by the scope */
  private _scopeGroups = new Map<string, ScopeGroup>();

  /** An observable used to push a list of scope groups on update */
  private _scopeUpdate = new BehaviorSubject<ScopeGroup[]>([]);

  /** Completes when loading the inspected profile is finished */
  private _onLoadingDone = new Subject();

  /** Used to mark the inspected-profile as loading until all
   *  existing connections have been processed. */
  private _loading = true;

  /** Emits the underlying app profile whenever it changes or on first-time subscription */
  private _profileChanges = new BehaviorSubject<AppProfile | null>(null);

  /** The currently layered profile used */
  private _layeredProfile: LayeredProfile | null = null;

  /**
   * True if the inspected profile has still old connections
   * that have been verdicted using a stale profile.
   */
  hasOldConnections = false;

  /** The current profile revision */
  get currentProfileRevision() {
    if (!this._layeredProfile) {
      return -1;
    }
    return this._layeredProfile.RevisionCounter;
  }

  /** The list of layer IDs this profile is composed of */
  get layers() {
    if (!this._layeredProfile) {
      return [];
    }
    return this._layeredProfile.LayerIDs;
  }

  /** Whether or not we are currently loading all connections */
  get loading() { return this._loading }

  /** The connection statistics for all existing connections. */
  get stats() { return this._stats; }

  /** All connections of this profile grouped by scope.  */
  get scopeGroups() { return this._scopeUpdate.asObservable(); }

  /** The total number of not-internal connections associated with this profile. */
  get size() {
    return this._connections.size - this.stats.countInternal;
  }

  /** Emits when the initial loading of existing connections completes. */
  get onDone() { return this._onLoadingDone.asObservable() }

  /**
   * Emits updates to the underlying application profile whenever
   * they occure.
   */
  get profileUpdates(): Observable<AppProfile> {
    return this._profileChanges.pipe(
      filter(profileOrNull => profileOrNull !== null),
    ) as Observable<AppProfile>;
  }

  /**
   * Returns the underlying application profile or null if
   * it has not yet been loaded.
   */
  get profile(): AppProfile | null {
    return this._profileChanges.getValue();
  }

  /** The name of the process group */
  get Name() {
    return this.processGroup.Name;
  }

  /** The ID of the process group profile */
  get ID() {
    return this.processGroup.ID;
  }

  /** The source of the process group profile */
  get Source() {
    return this.processGroup.Source;
  }

  /**
   * Returns an array of all connections associated with this
   * profile sorted in a requested order.
   */
  getSortedConnections(sortBy = 'most-recent', filter?: (c: Connection) => boolean): Connection[] {
    let iterator = this._connections.values();

    filter = filter || (() => true);

    // there might be hundrets or even thousands of connections
    // for this profile so we do an inserationSort instead of iterating
    // the set multiple times with Array.from(iterator).sort()
    var result: Connection[] = [];
    for (let c of iterator) {
      if (!filter(c)) {
        continue
      }

      switch (sortBy) {
        case 'most-recent':
          binaryInsert(result, c, ScopeGroup.SortByMostRecent);
          break;
        default:
          throw new Error(`unsupported sort method`)
      }
    }
    return result;
  }

  constructor(
    public readonly processGroup: ProcessGroup,
    private readonly portapi: PortapiService,
    private readonly profileService: AppProfileService,
    private readonly expertiseService: ExpertiseService,
  ) {
    this._profileSubscription = new Subscription();
    // subscribe to all new connections published by the
    // process group.
    const updateSub = this.processGroup.updates
      .subscribe(
        upd => this.processUpdate(upd),
      );

    // start watching the actual application profile
    const appSub = this.profileService.watchAppProfile(this.processGroup.Source, this.processGroup.ID)
      .pipe(
        switchMap(appProfile => {
          // whenever the application profile changes we are going to reload
          // the layered profile as well.
          return forkJoin([
            of(appProfile),
            this.profileService.getLayeredProfile(appProfile)
              .pipe(
                catchError(err => {
                  console.error(`Error while loading layered profile: ${appProfile.ID}`, err);
                  return of(null);
                })
              ),
          ])
        })
      )
      .subscribe(([appProfile, layers]) => {
        this._profileChanges.next(appProfile);
        const prevProfileRevision = this.currentProfileRevision;
        this._layeredProfile = layers;

        // Make sure to copy the new name to our process group.
        this.processGroup.setName(appProfile.Name);

        // if it changed, update all scope-groups with the new revision counter
        if (this.currentProfileRevision > prevProfileRevision) {
          this.hasOldConnections = false;

          this._scopeGroups.forEach(grp => {
            grp.checkRevisionCounter(this.currentProfileRevision);

            if (grp.hasOldConnections) {
              this.hasOldConnections = true;
            }
          });
        }
      });

    this._profileSubscription.add(updateSub);
    this._profileSubscription.add(appSub);

    const loadObservables = this.processGroup.getAll(true)
      .map(connKey => {
        return this.portapi.get<Connection>(connKey)
          .pipe(
            //filter(c => !c.Internal),
            map(c => {
              return {
                conn: c,
                key: connKey,
              }
            }),
            catchError(err => {
              console.error(`${connKey} failed to load`, err);
              return of(null);
            }),
          );
      });

    const loadSub = forkJoin(loadObservables)
      .subscribe(conns => {
        conns.forEach(c => {
          if (c === null) {
            return;
          }
          this.addConnection(c.key, c.conn, false);
        });
        this._loading = false;
        this._onLoadingDone.complete();
      });

    // if we cancel early make sure we cancel all the load
    // queries (or at least our subscription) too.
    this._profileSubscription.add(loadSub);
  }

  /**
   * Dispose the inspected profile and all
   * associated resources.
   */
  dispose() {
    this._profileSubscription.unsubscribe();

    this._connections.clear();

    this._scopeGroups.forEach(grp => grp.dispose());
    this._scopeGroups.clear();
  }

  /**
   * processUpdate is called for all update notifications
   * from the underlying profile
   */
  private processUpdate(upd: ConnectionUpdateEvent) {
    if (upd.type === 'deleted') {
      this.deleteConnection(upd.key);
      return;
    }

    this.addConnection(upd.key, upd.conn, upd.type === 'update');
  }

  /**
   * addConnection handls the arriaval of a new or updated
   * connection and updates the overall profile statistics
   */
  private addConnection(key: string, conn: Connection, update: boolean) {
    if (update) {
      this.deleteConnection(key);
    } else {
      // we already processed this connection, skip it now
      // to keep the stats correct.
      if (this._connections.has(key)) {
        return;
      }
    }

    // Portmaster always starts with revision counter 1
    // if we get zero it's a new profile and the portmaster
    // has not yet set the correct revision counter.
    if (conn.ProfileRevisionCounter < 1) {
      conn.ProfileRevisionCounter = 1;
    }

    this._connections.set(key, conn);
    this._stats.update(conn);

    const grp = this.getOrCreateScopeGroup(conn);
    grp.add(conn);
  }

  /**
   * deleteConnection deletes a previously seen connection
   * and updates the overall profile statistics
   */
  private deleteConnection(key: string) {
    const conn = this._connections.get(key);
    if (!conn) {
      // This can happen if the user switches to fast
      // between the inspected profiles and a update
      // nofitication was still queued when we were
      // disposed (i.e. connections was cleaned).
      return;
    }
    this._connections.delete(key);

    const grp = this._scopeGroups.get(conn.Scope);
    if (!!grp) {
      grp.remove(conn);

      // if the group is now empty (and we're not loading)
      // we can delete it.
      if (grp.empty && !this.loading) {
        this._scopeGroups.delete(conn.Scope);
        grp.dispose();
        this.publishScopes();
      }
    }

    this._stats.remove(conn);
  }

  /**
   * Returns (or creates) a scope group for the connection.
   */
  private getOrCreateScopeGroup(conn: Connection): ScopeGroup {
    let grp = this._scopeGroups.get(conn.Scope);
    if (!grp) {
      grp = new ScopeGroup(conn.Scope, this.expertiseService);
      this._scopeGroups.set(conn.Scope, grp);
      this.publishScopes();
    }

    return grp;
  }

  /**
   * Publish and update to the scope-groups collected in this
   * process group.
   */
  private publishScopes() {
    // sort them by lastConn, scope
    this._scopeUpdate.next(
      Array.from(this._scopeGroups.values())
        .sort((a, b) => {
          let diff = a.stats.lastConn - b.stats.lastConn;
          if (diff !== 0) {
            return diff;
          }

          if (a.scope > b.scope) {
            return 1;
          }
          if (a.scope < b.scope) {
            return -1;
          }
          return 0;
        })
    );
  }
}

/**
 * ConnTracker is a connection tracking service. It tracks active application
 * profiles and associated connection IDs.
 * Profiles can be marked as "inspected" in which case the ConnTracker will
 * build a detailed view of the profile and it's connections.
 */
@Injectable({
  providedIn: 'root'
})
export class ConnTracker {
  /**
   * Ready is used to notify subribers that the inital collection of
   * connections and profiles has finished. That is, we recieved a 'done'
   * message for the query-part of the q-subscription.
  */
  private _ready = new BehaviorSubject<true | null>(null);

  /** Subscription to updates of the network: database system */
  private _streamSubscription = Subscription.EMPTY;

  /** A map of all active profiles indexed by the profile ID */
  private _profiles = new Map<string, ProcessGroup>();

  /** A map of connection-Key to profile */
  private _connectionToProfile = new Map<string, ProcessGroup>();

  /** inspected profile holds the currently inspected profile */
  private _inspectedProfile: InspectedProfile | null = null;

  /** Used to emit the inspected profile whenever it changes. */
  private _inspectedProfileChange = new BehaviorSubject<InspectedProfile | null>(null);

  /** Behavior subject used to push updates to the list of active
   *  profiles */
  private _profileUpdates = new BehaviorSubject<ProcessGroup[]>([]);

  /** Emits a list of active profiles whenever a change occurs. */
  get profiles() {
    return this._profileUpdates.asObservable();
  }

  /** Emits the inspected profile whenever it changes. */
  get inspectedProfileChange() {
    return this._inspectedProfileChange.asObservable();
  }

  /** The currently inspected profile, if any. */
  get inspected() {
    return this._inspectedProfile;
  }

  /** Returns true if the profile is currently active */
  has(id: string) {
    return this._profiles.has(id);
  }

  /**
   * Ready emits as soon as the all connections have been loaded
   * and the set of active profiles has been calculated.
   */
  get ready(): Observable<void> {
    return this._ready.pipe(
      filter(val => val !== null),
      map(() => { }),
    );
  }

  constructor(
    private portapi: PortapiService,
    private profileService: AppProfileService,
    private expertiseService: ExpertiseService
  ) {
    const stream = this.portapi.request(
      'qsub',
      { query: 'network:' },
      // we need to done message to inform subscribers
      // that we built the initial collection of all
      // active profiles.
      { forwardDone: true }
    ).pipe(retryPipeline());

    const connectionStream = stream.pipe(
      tap(
        msg => {
          // cast as any is required as we normally
          // don't expose the done message to subscribers.
          // See {forwardDone} parameter in portapi.request()
          if (msg.type as any === 'done') {
            this._ready.next(true);
          }
        }
      ),
      // don't forward the done message
      filter(msg => (msg.type as any !== 'done')),
      // don't forward process entires, checking for the existence
      // of keys is faster than splitting and parsing the key.
      filter(msg => !msg.data || !('CmdLine' in msg.data)),
    );

    this._streamSubscription = new Subscription();
    const connectedSub = connectionStream.subscribe(
      msg => this.processUpdate(msg),
    );

    const resetSub = this.portapi.connected$
      .pipe(filter(connected => !connected))
      .subscribe(() => {
        this.inspect(null);
        this._ready.next(null);
        this._profiles.forEach(p => p.dispose());
        this._profiles.clear();
        this._connectionToProfile.clear();
      })

    this._streamSubscription.add(connectedSub);
    this._streamSubscription.add(resetSub);
  }

  /**
   * Clear the inspection and stop tracking
   * the currently inspected process-group
   */
  clearInspection() {
    this.inspect(null);
  }

  /**
   * Start inspecting a process group.
   *
   * @param processGroupOrID The ID or ProcessGroup to inspect.
   */
  inspect(processGroupOrID: ProcessGroup | string | null) {
    if (processGroupOrID === null) {
      if (!!this._inspectedProfile) {
        this._inspectedProfile.dispose();
        this._inspectedProfile = null;
        this._inspectedProfileChange.next(null);
      }
      return;
    }

    const id = typeof processGroupOrID === 'string'
      ? processGroupOrID
      : processGroupOrID.ID;

    const profile = this._profiles.get(id);
    if (!profile) {
      // if the profile does not exist we count it as
      // "null"
      this.inspect(null);
      return;
    }

    if (this._inspectedProfile !== null) {
      if (this._inspectedProfile.processGroup.ID === id) {
        // if we already inspect this profile abort now
        return;
      }

      this._inspectedProfile.dispose();
    }

    this._inspectedProfile = new InspectedProfile(
      profile,
      this.portapi,
      this.profileService,
      this.expertiseService
    );
    this._inspectedProfileChange.next(this._inspectedProfile);
  }

  /**
   * Dispose disposes the connection tracker and all associated
   * resources and subscriptions.
   */
  dispose() {
    this._streamSubscription.unsubscribe();

    if (!!this._inspectedProfile) {
      this._inspectedProfile.dispose();
      this._inspectedProfile = null;
    }

    this._inspectedProfileChange.complete();
    this._profileUpdates.complete();
    this._ready.complete();
  }

  private processUpdate(msg: DataReply<Connection>) {
    if (msg.type === 'del') {
      const profile = this._connectionToProfile.get(msg.key);
      if (!!profile) {
        this._connectionToProfile.delete(msg.key);

        profile.forget(msg.key);

        if (profile.empty) {
          this._profiles.delete(profile.ID);
          profile.dispose();

          this.publishProfiles();
        }
      }
      return
    }

    const profile = this.getOrCreateProfile(msg.data);
    this._connectionToProfile.set(msg.key, profile);

    profile.track(msg.key, msg.data, msg.type === 'upd');
  }

  /**
   * Returns (or creates) the profile the connection belongs
   * to.
   *
   * @param conn The connection object
   */
  private getOrCreateProfile(conn: Connection): ProcessGroup {
    const profileID = conn.ProcessContext.Profile;
    let profile = this._profiles.get(profileID);
    if (!profile) {
      profile = new ProcessGroup(profileID, conn.ProcessContext.ProfileName, conn.ProcessContext.Source);
      this._profiles.set(profileID, profile);

      this.publishProfiles();
    }

    if (profile.Name !== conn.ProcessContext.ProfileName) {
      console.log(`Updating profile name of profile ${profile.ID} from ${profile.Name} to ${conn.ProcessContext.ProfileName}`);
      profile.setName(conn.ProcessContext.ProfileName);
    }

    return profile;
  }

  private publishProfiles() {
    this._profileUpdates.next(
      Array.from(this._profiles.values())
    );
  }
}
