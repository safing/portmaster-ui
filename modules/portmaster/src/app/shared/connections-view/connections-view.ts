import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ThrowStmt } from '@angular/compiler';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, TrackByFunction } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { bufferTime, debounceTime, startWith, take, tap } from 'rxjs/operators';
import { Connection, ExpertiseLevel, IsGlobalScope, IsLocalhost, IsLANScope, ScopeTranslation, Verdict } from 'src/app/services';
import { ConnectionAddedEvent, InspectedProfile, ScopeGroup } from 'src/app/services/connection-tracker.service';
import { binaryInsert, binarySearch, pagination } from '../utils';
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
  trackByConnection: TrackByFunction<Connection | null> = (_: number, c: Connection | null) => c?.ID;

  /** Holds the filtered, ungrouped list of connections */
  filteredUngroupedConnections: Connection[] = [];

  /** Pagination */
  currentPageIdx = 0;
  currentPage: Connection[] = [];
  pageNumbers: number[] = [1];
  readonly itemsPerPage = 100;

  get totalPages() {
    return Math.ceil(this.filteredUngroupedConnections.length / this.itemsPerPage);
  }

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
  displayMode: ConnectionDisplayMode = 'ungrouped';

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
              this.handleScopeGroupUpdate(upd.groups);
            } else if (upd.type === 'added') {
              this.countNewScopes++;
            }
          });
      this._profileUpdatesSub.add(scopeUpdateSub);

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

  /** @private - Counts the number of new scope-groups if live-mode is off */
  countNewScopes = 0;

  /** @private - The currenlty displayed scope-groups */
  scopeGroups: ScopeGroup[] = [];

  constructor(
    private changeDetector: ChangeDetectorRef,
    public helper: ConnectionHelperService,
  ) { }

  ngOnInit() {
    this.reload.subscribe(() => {
      if (!this._profile) {
        return;
      }
      // reload now
      this._profile.scopeGroups.pipe(take(1))
        .subscribe(grps => this.handleScopeGroupUpdate(grps.groups))
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
    this.reload.next();
    this.countNewConn = 0;
    this.countNewScopes = 0;
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
      this.reload.next();
    } else {
      this.selectPage(0);
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

  /**
   * Selects the page to display in ungrouped-connections view.
   * @param idx The new page index (zero-based).
   *
   * @private
   */
  selectPage(idx: number) {
    if (idx > this.totalPages) {
      idx = this.totalPages - 1;
    }
    if (idx < 0) {
      idx = 0;
    }

    this.currentPageIdx = idx;
    this.currentPage = this.filteredUngroupedConnections.slice(idx * this.itemsPerPage, (idx + 1) * this.itemsPerPage)
    this.pageNumbers = pagination(this.currentPageIdx, this.totalPages)
    this.countNewConn = 0;
    this.changeDetector.markForCheck();
  }

  private resetUngroupedView() {
    this.filteredUngroupedConnections = [];
    this.currentPage = [];
    this.pageNumbers = [1];
    this._ungroupedModeLoaded = false;
    this.changeDetector.markForCheck();
  }

  /**
   * Updates the currently displayed scope groups
   *
   * @private
   */
  private handleScopeGroupUpdate(grps: ScopeGroup[]) {
    this.countNewConn = 0;
    this.countNewScopes = 0;
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
      )
      .subscribe(
        updates => {
          let added = 0;
          let inlineUpdates = false;
          if (updates.length === 0) {
            return;
          }

          updates.forEach(upd => {
            const filtered = !!filterFunc && !filterFunc.fn(upd.conn!);

            if (upd.type === 'update') {
              let idx = binarySearch(this.currentPage, upd.conn, ScopeGroup.SortByMostRecent);
              if (idx >= 0 && this.currentPage[idx]?.ID === upd.conn.ID) {
                this.currentPage[idx] = upd.conn;
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

            let idx = binarySearch(result, upd.conn!, ScopeGroup.SortByMostRecent);
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
            this.currentPage = [...this.currentPage];
            this.changeDetector.markForCheck();
          }

          this.updatePagination(result, added);
          this.changeDetector.markForCheck();
        });

    this.filterSub.add(() => this.resetUngroupedView())
  }

  private updatePagination(connections: Connection[], connectionsAdded: number) {
    const firstLoad = this.filteredUngroupedConnections.length === 0 || this.ungroupedLoading;

    this.filteredUngroupedConnections = [...connections];

    // -1 is used as a marker in tap() above
    if (this.countNewConn === -1) {
      this.countNewConn = 0;
    }

    this.countNewConn += connectionsAdded;

    // update the current index if the page we are on does not
    // exist any more
    if (firstLoad || this.currentPageIdx >= this.totalPages || (this.currentPageIdx === 0 && this.liveMode)) {
      // reselect the current page in life mode or if it does not
      // exist any more. In this case, selectPage will clip the index to the last page
      this.selectPage(this.currentPageIdx);
      this._ungroupedModeLoaded = true;
    }
  }

}
