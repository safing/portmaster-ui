import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, TrackByFunction } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { bufferTime, debounceTime, startWith, take, tap, withLatestFrom } from 'rxjs/operators';
import { Connection, ExpertiseLevel, IsGlobalScope, IsLANScope, IsLocalhost, ScopeTranslation, Verdict } from 'src/app/services';
import { ConnectionAddedEvent, InspectedProfile, ScopeGroup, ScopeGroupUpdate, SortByMostRecent } from 'src/app/services/connection-tracker.service';
import { SnapshotPaginator } from '../types';
import { binarySearch } from '../utils';
import { ConnectionHelperService } from './connection-helper.service';

export type ConnectionDisplayMode = 'grouped' | 'ungrouped';

interface ConnectionFilter {
  name: string;
  fn: (c: Connection) => boolean;
  expertiseLevel: ExpertiseLevel,
}

@Component({
  selector: 'app-connections-view',
  templateUrl: './connections-view.html',
  styleUrls: ['./content.scss', './connections-view.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConnectionHelperService],
})
export class ConnectionsViewComponent implements OnInit, OnDestroy {

  /** @private
   *  Contants made available for the template.
   */
  readonly scopeTranslation = ScopeTranslation;
  readonly connectionFilters: ConnectionFilter[] = [
    { name: "All", fn: () => true, expertiseLevel: ExpertiseLevel.User },
    { name: "Allowed", fn: c => c.Verdict !== Verdict.Block && c.Verdict !== Verdict.Drop, expertiseLevel: ExpertiseLevel.Expert },
    { name: "Blocked", fn: c => c.Verdict === Verdict.Block || c.Verdict === Verdict.Drop, expertiseLevel: ExpertiseLevel.User },
    { name: "Active", fn: c => !c.Ended, expertiseLevel: ExpertiseLevel.Expert },
    { name: "Ended", fn: c => !!c.Ended, expertiseLevel: ExpertiseLevel.Expert },
    { name: "Inbound", fn: c => c.Inbound, expertiseLevel: ExpertiseLevel.Developer },
    { name: "Outbound", fn: c => !c.Inbound, expertiseLevel: ExpertiseLevel.Developer },
    { name: "Local", fn: c => IsLocalhost(c.Entity.IPScope), expertiseLevel: ExpertiseLevel.Developer },
    { name: "LAN", fn: c => IsLANScope(c.Entity.IPScope), expertiseLevel: ExpertiseLevel.Developer },
    { name: "Global", fn: c => IsGlobalScope(c.Entity.IPScope), expertiseLevel: ExpertiseLevel.Developer },
  ]

  /** Subscription to profile updates. */
  private _profileUpdatesSub = Subscription.EMPTY;

  /** Subscription for the "ungrouped" and filtered connection view */
  private filterSub = Subscription.EMPTY;

  /** TrackByFunction for scope-groups */
  trackByScope: TrackByFunction<ScopeGroup> = (_: number, g: ScopeGroup) => g.scope;

  /** TrackByFunction for connection */
  trackByConnection: TrackByFunction<Connection> = (_: number, c: Connection | null) => c?.ID;

  /** Holds the filtered, ungrouped list of connections */
  filteredUngroupedConnections: Connection[] = [];

  /** displayed paginated items */
  paginatedItems = new BehaviorSubject<Connection[]>([]);

  pagination: SnapshotPaginator<Connection>;

  /** Pagination */
  readonly pageSize = 100;

  get loading() {
    return !this.profile || this.profile.loading || this.ungroupedLoading
  }

  get ungroupedLoading() {
    if (this.displayMode === 'grouped') {
      return false;
    }

    if (this._ungroupedModeLoaded) {
      return false;
    }

    const processGroupSize = this.profile?.processGroup.size || 0;
    return processGroupSize > 0 && this.filteredUngroupedConnections.length == 0;
  }
  private _ungroupedModeLoaded = false;

  ungroupedFilter = 'All';

  /** The current display type */
  @Input()
  displayMode: ConnectionDisplayMode = 'grouped';

  /** Output that emits whenever the users changes the display mode */
  @Output()
  displayModeChange = new EventEmitter<ConnectionDisplayMode>();

  @Input()
  set profile(p: InspectedProfile | null) {
    this._profile = p;
    this.helper.profile = p;
    this._profileUpdatesSub.unsubscribe();
    this.filterSub?.unsubscribe();

    if (!!this._profile) {
      this._profileUpdatesSub = new Subscription();

      // Reset the previous ScopeGroup list.
      this.scopeGroups = [];

      // handles updates for new scope-groups
      const scopeUpdateSub =
        this._profile.scopeGroups
          .pipe(debounceTime(500))
          .subscribe(upd => {
            const isFirstLoad = this.scopeGroups.length === 0 || this.loading;
            if (this._liveMode || isFirstLoad) {
              this.handleScopeGroupUpdate(upd.groups, upd.type);

              if (isFirstLoad) {
                this.refresh();
              }
            }
          });
      this._profileUpdatesSub.add(scopeUpdateSub);

      // reset once we unsubscribe from this profile.
      // the prevents flickering of old connections when we switch
      // to a different profile because angular would render stale data
      // first.
      this._profileUpdatesSub.add(() => {
        this.scopeGroups = [];
        this.countNewConn = 0;
        this.filteredUngroupedConnections = [];
        this.paginatedItems.next([]);
      })

      this.loadFilteredConnections()
    }
  }
  get profile() {
    return this._profile;
  }
  private _profile: InspectedProfile | null = null;

  /** Whether or not we display connections in "real" time */
  @Input()
  set liveMode(v: any) {
    this._liveMode = coerceBooleanProperty(v);
  }
  get liveMode() {
    return this._liveMode;
  }
  private _liveMode: boolean = false;

  /** Emits whenever the user enables or disables live-mode */
  @Output()
  liveModeChange = new EventEmitter<boolean>();

  /** Used to trigger a reload if live-mode is off */
  reload = new Subject<void>();

  /** @private - Counts the number of new connections if live-mode is off */
  countNewConn = 0;

  /** @private - The currenlty displayed scope-groups */
  scopeGroups: ScopeGroup[] = [];

  constructor(
    private changeDetector: ChangeDetectorRef,
    public helper: ConnectionHelperService,
  ) {
    this.pagination = new SnapshotPaginator(this.paginatedItems, 100);
  }

  ngOnInit() {
    this.reload.subscribe(() => {
      if (!this._profile) {
        return;
      }
      // reload now
      this._profile.scopeGroups.pipe(take(1))
        .subscribe(grps => {
          this.handleScopeGroupUpdate(grps.groups, grps.type);
          this.scopeGroups.forEach(grp => grp.publish());
        })
    })
  }

  ngOnDestroy() {
    this.reload.complete();
    this._profileUpdatesSub.unsubscribe();
  }


  /**
   * Toggles live mode and forces a reload of the current connections.
   *
   * @private
   */
  toggleLiveMode() {
    this._liveMode = !this._liveMode;
    this.liveModeChange.next(this._liveMode);
    this.countNewConn = 0;
    this.refresh();
  }

  /**
   * Switches the current display mode
   *
   * @private
   */
  selectDisplayMode(mode: ConnectionDisplayMode) {
    this.displayMode = mode;
    this.displayModeChange.next(mode);

    if (this.displayMode !== 'ungrouped') {
      this.ungroupedFilter = 'All';
    }
    this.refresh();

    if (this.displayMode === 'ungrouped') {
      this.openPage(1);
    }
  }

  /**
   * Changes the filter to use in ungrouped display mode.
   *
   * @private
   */
  setUngroupedFilter(filter: string) {
    const hasChanged = this.ungroupedFilter !== filter;
    this.ungroupedFilter = filter;

    if (this.displayMode === 'grouped') {
      this.selectDisplayMode('ungrouped');
    }

    if (hasChanged) {
      this.loadFilteredConnections();
    }
  }

  /**
   * Toggles between the supported display modes
   *
   * @private
   */
  cycleDisplayMode() {
    if (this.displayMode === 'grouped') {
      this.selectDisplayMode('ungrouped')
      return;
    }

    this.selectDisplayMode('grouped');
  }

  private resetUngroupedView() {
    this.filteredUngroupedConnections = [];
    this.refresh();
    this._ungroupedModeLoaded = false;
    this.changeDetector.markForCheck();
  }

  /**
   * Updates the currently displayed scope groups
   *
   * @private
   */
  private handleScopeGroupUpdate(grps: ScopeGroup[], updType: ScopeGroupUpdate['type']) {
    this.countNewConn = 0;
    this.scopeGroups = grps;
    this.changeDetector.markForCheck();
  }

  /** Gets filtered and sorted connections. */
  private loadFilteredConnections() {
    this.filterSub.unsubscribe();

    if (!this.profile) {
      return
    }

    const profile = this.profile;
    let result: Connection[] = [];

    // get the currently assigned filter
    const filterFunc = this.connectionFilters.find(filter => filter.name === this.ungroupedFilter);
    this.filterSub = profile.connectionUpdates
      .pipe(
        tap((upd) => {
          if (this.countNewConn === 0 && upd.type === 'added') {
            this.countNewConn = -1;
            this.changeDetector.markForCheck();
          }
        }),
        bufferTime(1000, null, profile.processGroup.size),
        startWith(
          Array.from(profile.connections).map(conn => ({
            type: 'added',
            conn: conn,
            key: conn._meta?.Key!,
          } as ConnectionAddedEvent))
        ),
        withLatestFrom(this.pagination.pageNumber$),
      )
      .subscribe(
        ([updates, currentPageNumber]) => {
          let added = 0;
          let inlineUpdates = false;
          if (updates.length === 0) {
            return;
          }

          updates.forEach(upd => {
            const filtered = !!filterFunc && !filterFunc.fn(upd.conn!);

            if (upd.type === 'update') {
              const currentItems = this.pagination.snapshot;
              let idx = binarySearch(currentItems, upd.conn, SortByMostRecent);
              if (idx >= 0 && currentItems[idx]?.ID === upd.conn.ID) {
                currentItems[idx] = upd.conn;
                console.log(`${upd.conn.Scope}: applying inline update`)
              }
              inlineUpdates = true;
            }

            // if this is an update and the "updated" connection would be filtered
            // we need to convert the update to a "delete"
            if (upd.type === 'update' && filtered) {
              upd = {
                ...upd,
                type: 'deleted',
              }
            }

            let idx = binarySearch(result, upd.conn!, SortByMostRecent);
            if (upd.type === 'deleted') {
              if (idx < 0) {
                console.log(`connection not found`)
                return;
              }

              result.splice(idx, 1);
              return;
            }

            if (filtered) {
              return;
            }

            if (upd.type === 'update' && idx >= 0) {
              result[idx] = upd.conn;

              return;
            }

            const newIdx = ~idx;
            added++;
            result.splice(newIdx, 0, upd.conn)
          })

          if (inlineUpdates) {
            // re-emit the current page
            this.paginatedItems.next([...this.pagination.snapshot]);
          }

          this.updatePagination(result, added, currentPageNumber);
          this.changeDetector.markForCheck();
        });

    this.filterSub.add(() => this.resetUngroupedView())
  }

  refresh() {
    if (this.displayMode === 'ungrouped') {
      this.paginatedItems.next(this.filteredUngroupedConnections);
    } else {
      this.reload.next();
    }
    this.countNewConn = 0;
  }

  openPage(pageNumber: number) {
    this.pagination.openPage(pageNumber);
  }

  private updatePagination(connections: Connection[], connectionsAdded: number, currentPageNumber: number) {
    const firstLoad = this.filteredUngroupedConnections.length === 0 || this.ungroupedLoading;

    // keep track of all new connections. They will be made visible by calling
    // this.refresh() at a later point.
    this.filteredUngroupedConnections = [...connections];

    // -1 is used as a marker in tap() above
    // that we should reset the connection count to zero
    if (this.countNewConn === -1) {
      this.countNewConn = 0;
    }

    this.countNewConn += connectionsAdded;

    // update the current index if the page we are on does not
    // exist any more
    if (this.displayMode === 'ungrouped') {
      if (firstLoad || currentPageNumber >= this.pagination.total || (this.liveMode && currentPageNumber === 1)) {
        // reselect the current page in life mode or if it does not
        // exist any more. In this case, selectPage will clip the index to the last page
        this.refresh();
        this.openPage(currentPageNumber);
        this._ungroupedModeLoaded = true;
      }
    } else if (this._liveMode) {
      // in live mode we update/publish all scope connections
      // where the current page of the scope is the first page.
      // Otherwise pagination does not make much sense because
      // once you switch to another page you want to see static
      // content instead of connections moving down and over to
      // the next page.
      this.scopeGroups.forEach(grp => {
        if (grp.pagination.pageNumber === 1) {
          grp.publish();
        }
      })
    }
  }
}
