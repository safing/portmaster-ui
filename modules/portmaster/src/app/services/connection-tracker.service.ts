import { Injectable, isDevMode } from '@angular/core';
import { Connection, Verdict } from './network.types';
import { ConnectionStatistics } from './connection-tracker.types';
import { catchError, combineAll, filter, map, tap, refCount, multicast, take } from 'rxjs/operators';
import { RiskLevel } from './core.types';
import { PortapiService } from './portapi.service';
import { BehaviorSubject, forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { DataReply } from './portapi.types';
import { parse } from 'psl';
import { ThrowStmt } from '@angular/compiler';
import { AppProfile } from './app-profile.types';
import { AppProfileService } from './app-profile.service';
import { ExpertiseService } from '../shared/expertise/expertise.service';
import { ExpertiseLevelNumber, ExpertiseLevel } from './config.types';

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

  get countAllowed() {
    return this.permitted.size;
  }

  get countUnpermitted() {
    return this.unpermitted.size;
  }

  get ID(): string {
    return this.id;
  }

  get Name(): string {
    return this.name;
  }

  constructor(
    public readonly id: string,
    public readonly name: string,
    // TODO(ppacher): add support for profile icons
  ) { }

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

  /** An behavior subject to emit the current set of connections
   *  that are attributed to this scope group. */
  private _connectionUpdate = new BehaviorSubject<Connection[]>([]);

  /** The current block status of the scope group. */
  private _blockStatus: RiskLevel = RiskLevel.Off;

  /** Subscription to changes in the expertise level */
  private _expertiseSubscription = Subscription.EMPTY;

  /** Holds the current block status of the scope group */
  get blockStatus() {
    return this._blockStatus;
  }

  /** An observable that emits all connections that belong to the
   *  scope group. */
  get connections() {
    return this._connectionUpdate.asObservable();
  }

  /** Empty returns true if the scope group is empty */
  get empty() {
    return this.size === 0;
  }

  get size() {
    return this._connections.length - this.stats.countInternal;
  }

  constructor(
    public readonly scope: string,
    private expertiseService: ExpertiseService,
  ) {
    this.domain = null;
    this.subdomain = null;

    const parsed = parse(this.scope);
    if ('listed' in parsed) {
      this.domain = parsed.domain || this.scope;
      this.subdomain = parsed.subdomain;
    }

    // We republish the connections whenever the expertise changes.
    this._expertiseSubscription = this.expertiseService.change.subscribe(
      () => this.publishConnections()
    )
  }

  add(conn: Connection) {
    this.stats.update(conn);
    this._connections.push(conn);
    this.updateBlockStatus();
    this.publishConnections();
  }

  remove(conn: Connection) {
    this.stats.remove(conn);

    this._connections = this._connections
      .filter(c => c.ID !== conn.ID);

    this.updateBlockStatus();
    this.publishConnections();
  }

  /** Dispose the scope group an all associated resources. */
  dispose() {
    this._connectionUpdate.complete();
    this._connections = [];
  }

  private publishConnections() {
    this._connectionUpdate.next(
      this._connections
        .filter(conn => {
          if (this.expertiseService.currentLevel === ExpertiseLevel.Developer) {
            return true;
          }
          return !conn.Internal;
        })
        .sort((a, b) => {
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
        })
    );
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

  get loading() { return this._loading }
  get stats() { return this._stats; }
  get scopeGroups() { return this._scopeUpdate.asObservable(); }
  get size() {
    return this._connections.size - this.stats.countInternal;
  }
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

  get name() {
    return this.processGroup.name;
  }

  get ID() {
    return this.processGroup.id;
  }

  constructor(
    public readonly processGroup: ProcessGroup,
    private readonly portapi: PortapiService,
    private readonly profileService: AppProfileService,
    private readonly expertiseService: ExpertiseService,
  ) {
    this._profileSubscription = this.processGroup.updates
      .subscribe(
        upd => this.processUpdate(upd),
      );

    const appSub = this.profileService.watchAppProfile(this.processGroup.id)
      .subscribe(profile => {
        this._profileChanges.next(profile);
      });

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

  private publishScopes() {
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
    );

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

    this._streamSubscription = connectionStream.subscribe(
      msg => this.processUpdate(msg),
    );
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
      : processGroupOrID.id;

    const profile = this._profiles.get(id);
    if (!profile) {
      // if the profile does not exist we count it as
      // "null"
      this.inspect(null);
      return;
    }

    if (this._inspectedProfile !== null) {
      if (this._inspectedProfile.processGroup.id === id) {
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
          this._profiles.delete(profile.id);
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
    const profileID = conn.ProcessContext.ProfileID;
    let profile = this._profiles.get(profileID);
    if (!profile) {
      profile = new ProcessGroup(profileID, conn.ProcessContext.Name);
      this._profiles.set(profileID, profile);

      this.publishProfiles();
    }
    return profile;
  }

  private publishProfiles() {
    this._profileUpdates.next(
      Array.from(this._profiles.values())
    );
  }
}
