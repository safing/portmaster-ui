import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, TrackByFunction, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AppProfile, AppProfileService, trackById } from 'src/app/services';
import { ConnTracker } from 'src/app/services/connection-tracker.service';
import { fadeInAnimation, fadeInListAnimation, moveInOutListAnimation } from 'src/app/shared/animations';
import { FuzzySearchService } from 'src/app/shared/fuzzySearch';

@Component({
  selector: 'app-settings-overview',
  templateUrl: './overview.html',
  styleUrls: ['../page.scss', './overview.scss'],
  animations: [
    fadeInAnimation,
    fadeInListAnimation,
    moveInOutListAnimation
  ]
})
export class AppOverviewComponent implements OnInit, OnDestroy {
  private subscription = Subscription.EMPTY;

  /** Whether or not we are currently loading */
  loading = true;

  /** All application profiles that are actually running */
  runningProfiles: AppProfile[] = [];

  /** All application profiles that have been used recently */
  recentlyUsed: AppProfile[] = [];

  /** All application profiles that have been edited recently */
  recentlyEdited: AppProfile[] = [];

  /** All non-running application profiles */
  profiles: AppProfile[] = [];

  /** The current search term */
  searchTerm: string = '';

  /** total number of profiles */
  total: number = 0;

  /** Observable emitting the search term */
  private onSearch = new BehaviorSubject('');

  /** TrackBy function for the profiles. */
  trackProfile: TrackByFunction<AppProfile> = trackById;

  constructor(
    private profileService: AppProfileService,
    private changeDetector: ChangeDetectorRef,
    private searchService: FuzzySearchService,
    private connTrack: ConnTracker,
  ) { }

  ngOnInit() {
    // watch all profiles and re-emit (debounced) when the user
    // enters or chanages the search-text.
    this.subscription = combineLatest([
      this.profileService.watchProfiles(),
      this.onSearch.pipe(debounceTime(100)),
    ])
      .subscribe(
        ([profiles, searchTerm]) => {
          this.loading = false;

          // find all profiles that match the search term. For searchTerm="" thsi
          // will return all profiles.
          const filtered = this.searchService.searchList(profiles, searchTerm, {
            ignoreLocation: true,
            ignoreFieldNorm: true,
            threshold: 0.1,
            minMatchCharLength: 3,
            keys: ['Name', 'LinkedPath']
          });

          // Prepare new, empty lists for our groups
          this.profiles = [];
          this.runningProfiles = [];
          this.recentlyUsed = [];
          this.recentlyEdited = [];

          // calcualte the threshold for "recently-used" (1 week).
          const recentlyUsedThreshold = new Date().valueOf() / 1000 - (60 * 60 * 24 * 7);

          // flatten the filtered profiles, sort them by name and group them into
          // our "app-groups" (active, recentlyUsed, others)
          this.total = filtered.length;
          filtered
            .map(item => item.item)
            .sort((a, b) => {
              const aName = a.Name.toLocaleLowerCase();
              const bName = b.Name.toLocaleLowerCase();

              if (aName > bName) {
                return 1;
              }

              if (aName < bName) {
                return -1;
              }

              return 0;
            })
            .forEach(profile => {
              if (this.connTrack.has(profile.ID)) {
                this.runningProfiles.push(profile);
              } else if (profile.ApproxLastUsed >= recentlyUsedThreshold) {
                this.recentlyUsed.push(profile);
              } else if (profile.LastEdited >= recentlyUsedThreshold) {
                this.recentlyEdited.push(profile);
              } else {
                this.profiles.push(profile);
              }
            });

          this.changeDetector.markForCheck();
        }
      )
  }

  /**
   * @private
   *
   * Used as an ngModelChange callback on the search-input.
   *
   * @param term The search term entered by the user
   */
  searchApps(term: string) {
    this.searchTerm = term;
    this.onSearch.next(term);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
