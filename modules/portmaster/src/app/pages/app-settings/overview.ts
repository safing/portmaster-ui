import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, TrackByFunction, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AppProfile, AppProfileService, trackById } from 'src/app/services';
import { fadeInAnimation } from 'src/app/shared/animations';
import { FuzzySearchService } from 'src/app/shared/fuzzySearch';

@Component({
  selector: 'app-settings-overview',
  templateUrl: './overview.html',
  styleUrls: ['./overview.scss'],
  //changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
  ]
})
export class AppOverviewComponent implements OnInit, OnDestroy {
  private subscription = Subscription.EMPTY;

  loading = true;
  profiles: AppProfile[] = [];
  searchTerm: string = '';

  private onSearch = new BehaviorSubject('');

  trackProfile: TrackByFunction<AppProfile> = trackById;

  constructor(
    private profileService: AppProfileService,
    private changeDetector: ChangeDetectorRef,
    private searchService: FuzzySearchService,
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

          this.profiles = filtered
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
