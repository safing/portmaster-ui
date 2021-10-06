import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of, Subject, Subscription } from 'rxjs';
import { bufferTime, catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { SnapshotPaginator } from '../shared/types';
import { binaryInsert, binarySearch, parseDomain } from '../shared/utils';
import { AppProfileService } from './app-profile.service';
import { AppProfile, LayeredProfile } from './app-profile.types';
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
  conn?: Connection; // only set on InspectedProfile.connectionUpdates
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

/** Sort function for connections that sorts then by most recent. */
export const SortByMostRecent = (a: Connection, b: Connection) => {
  let diff = a.Started - b.Started;
  if (diff !== 0) {
    return diff;
  }

  if (a.ID > b.ID) {
    return 1;
  }
  if (a.ID < b.ID) {
    return -1;
  }
  return 0;
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

  public readonly pagination: SnapshotPaginator<Connection>;

  /** Connections is a list of all connections that belong
   *  to the scope. */
  private _connections: Connection[] = [];

  private _snapshot = new BehaviorSubject<Connection[]>([]);

  /** The current block status of the scope group. */
  private _blockStatus: RiskLevel = RiskLevel.Off;

  /** Returns whether or not the scope group is for incoming connections */
  get incoming() {
    return this.first?.Inbound || false;
  }

  /** Returns the first connection of the scope group */
  get first() {
    return this._connections[0] || null;
  }

  /** Holds the current block status of the scope group */
  get blockStatus() {
    return this._blockStatus;
  }

  /** Empty returns true if the scope group is empty */
  get empty() {
    return this.size === 0;
  }

  /** Size returns the number of (non-internal) connections */
  get size() {
    return this._connections.length - this.stats.countInternal;
  }

  constructor(
    public readonly scope: string,
  ) {
    this.domain = null;
    this.subdomain = null;

    // check if it's a scope by looking up the value in
    // our scope translation list.
    if (ScopeTranslation[this.scope] === undefined) {
      // If it's not a scope it must be a domain.
      Object.assign(this, parseDomain(this.scope));
    }

    this.pagination = new SnapshotPaginator(this._snapshot, 25);
  }

  publish() {
    this._snapshot.next([...this._connections]);
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

    binaryInsert(this._connections, conn, SortByMostRecent);

    // since this might be an update we might also need to perform an inline update
    // if conn is part of the current pagination page:
    const pgIdx = binarySearch(this.pagination.pageItems, conn, SortByMostRecent);
    if (pgIdx >= 0) {
      console.log(`${this.scope}: inline update for current page`);
      const newItems = [...this.pagination.snapshot];
      newItems[pgIdx] = conn;
      this._snapshot.next(newItems);
    }

    this.updateBlockStatus();
  }

  /**
   * Remove a connection from the scope group by updating
   * the statistics and block-status.
   *
   * @param conn The connection to remove
   * @param update Whether or not remove() is called as a part of a connection update.
   */
  remove(conn: Connection, update: boolean = false) {
    this.stats.remove(conn);

    this._connections = this._connections
      .filter(c => c.ID !== conn.ID);

    // we don't remove connections from the current
    // pagination page so no need to care about
    // inline updates here.

    this.updateBlockStatus();
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

export interface ScopeGroupUpdate {
  groups: ScopeGroup[];
  type: 'added' | 'deleted' | 'init';
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
  private _scopeUpdate = new BehaviorSubject<ScopeGroupUpdate>({ groups: [], type: 'init' });

  /** Completes when loading the inspected profile is finished */
  private _onLoadingDone = new Subject();

  /** Used to mark the inspected-profile as loading until all
   *  existing connections have been processed. */
  private _loading = true;

  /** Emits the underlying app profile whenever it changes or on first-time subscription */
  private _profileChanges = new BehaviorSubject<AppProfile | null>(null);

  /** The currently layered profile used */
  private _layeredProfile: LayeredProfile | null = null;

  /** Emits whenever that is an update to a profile connection */
  private _connUpdate = new Subject<ConnectionUpdateEvent>();

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

  /** Emits whenever there is an update to the profile's connections */
  get connectionUpdates() { return this._connUpdate.asObservable() }

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

  get connections() {
    return this._connections.values();
  }

  constructor(
    public readonly processGroup: ProcessGroup,
    private readonly portapi: PortapiService,
    private readonly profileService: AppProfileService,
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
                  console.error(`Error while loading layered profile: ${appProfile.ID} `, err);
                  return of(null);
                })
              ),
          ])
        })
      )
      .subscribe(([appProfile, layers]) => {
        this._profileChanges.next(appProfile);
        this._layeredProfile = layers;

        // Make sure to copy the new name to our process group.
        this.processGroup.setName(appProfile.Name);
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
        this._onLoadingDone.next();
        this._onLoadingDone.complete();

        // publish all groups
        for (let grp of this._scopeGroups.values()) {
          grp.publish();
        }
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
    this._connUpdate.complete();
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
      this.deleteConnection(key, true);
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

    const [grp, created] = this.getOrCreateScopeGroup(conn);
    grp.add(conn);

    this._connUpdate.next({
      type: update ? 'update' : 'added',
      conn: conn,
      key: key,
    });

    if (created && !this.loading) {
      grp.publish();
    }
  }

  /**
   * deleteConnection deletes a previously seen connection
   * and updates the overall profile statistics
   */
  private deleteConnection(key: string, update = false) {
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
      grp.remove(conn, update);

      // if the group is now empty, we're not loading and
      // we are not currenlty processing a connection update
      // then we can delete it.
      if (grp.empty && !this.loading) {
        this._scopeGroups.delete(conn.Scope);
        this.publishScopes('deleted');
      }
    }

    this._stats.remove(conn);

    this._connUpdate.next({
      key: key,
      type: 'deleted',
      conn: conn,
    });
  }

  /**
   * Returns (or creates) a scope group for the connection.
   */
  private getOrCreateScopeGroup(conn: Connection): [ScopeGroup, boolean] {
    let grp = this._scopeGroups.get(conn.Scope);
    let created = false;
    if (!grp) {
      created = true;
      grp = new ScopeGroup(conn.Scope);
      this._scopeGroups.set(conn.Scope, grp);

      this.publishScopes('added');
    }

    return [grp, created];
  }

  /**
   * Publish and update to the scope-groups collected in this
   * process group.
   */
  private publishScopes(type: 'added' | 'deleted') {
    // sort them by lastConn, scope
    const grps = Array.from(this._scopeGroups.values())
      .sort((a, b) => {
        if (a.domain === null && b.domain !== null) {
          return -1;
        }

        if (b.domain === null && a.domain !== null) {
          return 1;
        }

        if (a.domain === null && b.domain === null) {
          let scopeOrder = [
            ScopeIdentifier.PeerInternet,
            ScopeIdentifier.IncomingInternet,
            ScopeIdentifier.PeerLAN,
            ScopeIdentifier.IncomingLAN,
            ScopeIdentifier.PeerHost,
            ScopeIdentifier.IncomingHost,
            ScopeIdentifier.PeerInvalid,
            ScopeIdentifier.IncomingInvalid,
          ]

          return scopeOrder.indexOf(a.scope as ScopeIdentifier) - scopeOrder.indexOf(b.scope as ScopeIdentifier);
        }

        if (a.domain! > b.domain!) {
          return 1;
        }
        if (b.domain! > a.domain!) {
          return -1;
        }
        return 0;
      });

    this._scopeUpdate.next({
      groups: grps,
      type: type
    });
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
      // we might have a very very noise websocket connection because
      // some processes are freaking out. Make sure we don't trigger
      // angular change detection too often by buffering updates
      bufferTime(1000, null, 100),
      filter(msgs => !!msgs.length)
    );

    this._streamSubscription = new Subscription();
    const connectedSub = connectionStream.subscribe(
      msgs => msgs.forEach(msg => this.processUpdate(msg)),
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
    if (profile === null) {
      return;
    }

    this._connectionToProfile.set(msg.key, profile);

    profile.track(msg.key, msg.data, msg.type === 'upd');
  }

  /**
   * Returns (or creates) the profile the connection belongs
   * to.
   *
   * @param conn The connection object
   */
  private getOrCreateProfile(conn: Connection): ProcessGroup | null {
    const profileID = conn?.ProcessContext?.Profile;
    if (profileID === undefined) {
      return null;
    }

    let profile = this._profiles.get(profileID);
    if (!profile) {
      profile = new ProcessGroup(profileID, conn.ProcessContext.ProfileName, conn.ProcessContext.Source);
      this._profiles.set(profileID, profile);

      this.publishProfiles();
    }

    if (profile.Name !== conn.ProcessContext.ProfileName) {
      console.log(`Updating profile name of profile ${profile.ID} from ${profile.Name} to ${conn.ProcessContext.ProfileName} `);
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
