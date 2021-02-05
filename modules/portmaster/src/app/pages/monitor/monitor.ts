import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { delayWhen } from 'rxjs/operators';
import { ConnTracker, ProcessGroup } from 'src/app/services/connection-tracker.service';
import { fadeInAnimation, moveInOutListAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './monitor.html',
  styleUrls: ['../page.scss', './monitor.scss'],
  providers: [],
  animations: [fadeInAnimation, moveInOutListAnimation],
})
export class MonitorPageComponent implements OnInit, OnDestroy {
  /** Subscription for the route parameters */
  private subscription: Subscription = Subscription.EMPTY;

  /** @private All process-groups/profiles that are currently active */
  profiles: ProcessGroup[] = [];

  /** @private Emits the search string whenever the user changes the search-input */
  onSearch = new BehaviorSubject<string>('');

  /** @private Whether or not we are still loading data. */
  loading = true;

  /** @private Whether or not the search bar is shown */
  showSearch = false;

  /** @private The currently inspected (and thus selected) profile. */
  get selected() {
    return this.connTrack.inspected;
  }

  constructor(
    private connTrack: ConnTracker,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.subscription = new Subscription();

    // watch the route parameters and update the currently
    // inspected (and selected) profile.
    const routeSubscription = this.route.paramMap
      .pipe(delayWhen(() => this.connTrack.ready))
      .subscribe(params => {
        this.loading = false;

        let source = params.get("source");
        let id = params.get("profile");
        if (source === 'overview') {
          source = null;
          id = null;
        }

        this.connTrack.inspect(id);
      });

    // filter active profiles based on the search-input.
    const filteredProfileSubscription
      = combineLatest([
        this.connTrack.profiles,  // emits all profiles whenever something changes
        this.onSearch,            // emits the search text of the user
        this.connTrack.ready,     // blocks the stream unitl it emits the first time
      ])
        .subscribe(([p, search, _]) => {
          this.profiles = p.filter(profile => {
            return search === '' || profile.Name.toLocaleLowerCase().includes(search)
          });
        })

    // make sure we perform tear-down on the above subscriptions.
    this.subscription.add(routeSubscription);
    this.subscription.add(filteredProfileSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.connTrack.clearInspection();
  }

  /**
   * @private
   * Toggle Whether or not the search bar is visible.
   * If the search bar gets hidden make sure to clear the
   * current search as well.
   */
  toggleSearch() {
    this.showSearch = !this.showSearch;
    if (!this.showSearch && this.onSearch.getValue() != '') {
      this.search('')
    }
  }

  /**
   * @private
   * Called by ngModelChange from our search-input to trigger
   * a new profile-search.
   *
   * @param s The search string from the input
   */
  search(s: string) {
    this.onSearch.next(s);
  }

  /**
   * @private
   * Callback for the (keydown) binding on the document.
   * Used to handle ESC key presses correctly
   *
   * @param event The key-up event
   */
  onSearchKeyDown(event: KeyboardEvent) {
    console.log(event.key);
    if (event.key === 'Escape' && this.showSearch) {
      this.toggleSearch();
    }
  }

  /**
   * @private
   * {@type TrackByFunction} for the process-groups.
   */
  trackProfile(_: number, p: ProcessGroup) {
    return p.ID;
  }
}
