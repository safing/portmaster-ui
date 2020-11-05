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
  styleUrls: ['./overview.scss'],
  //changeDetection: ChangeDetectionStrategy.OnPush,
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

  /** All application profiles that have been modified recently */
  recentlyUsed: AppProfile[] = [];

  /** All non-running application profiles */
  profiles: AppProfile[] = [];

  /** The current search term */
  searchTerm: string = '';

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
    this.subscription = combineLatest([
      this.profileService.watchProfiles(),
      this.onSearch.pipe(debounceTime(100)),
    ])
      .subscribe(
        ([profiles, searchTerm]) => {
          this.loading = false;

          const filtered = this.searchService.searchList(profiles, searchTerm, {
            ignoreLocation: true,
            ignoreFieldNorm: true,
            threshold: 0.1,
            minMatchCharLength: 3,
            keys: ['Name', 'LinkedPath']
          });

          this.profiles = [];
          this.runningProfiles = [];
          this.recentlyUsed = [];

          const recentlyUsedThreshold = new Date().valueOf() / 1000 - (60 * 60 * 24 * 7);

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
              } else if (!!profile._meta && profile._meta.Modified >= recentlyUsedThreshold) {
                this.recentlyUsed.push(profile);
              } else {
                this.profiles.push(profile);
              }
            });
          this.changeDetector.markForCheck();
        }
      )
  }

  searchApps(term: string) {
    this.searchTerm = term;
    this.onSearch.next(term);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
