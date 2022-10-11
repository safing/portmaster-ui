import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TrackByFunction } from "@angular/core";
import { BoolSetting, Condition, ConfigService, ExpertiseLevel, IProfileStats, Netquery, Pin, SPNService } from "@safing/portmaster-api";
import { combineLatest, debounceTime, forkJoin, interval, startWith, Subject, switchMap, takeUntil } from "rxjs";
import { fadeInListAnimation } from "../animations";
import { ExpertiseService } from './../expertise/expertise.service';

interface _Pin extends Pin {
  count: number;
}

interface _Profile extends IProfileStats {
  exitPins: _Pin[];
  showMore: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-network-scout',
  templateUrl: './network-scout.html',
  styleUrls: ['./network-scout.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInListAnimation,
  ]
})
export class NetworkScoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /** Used to trigger a debounced search from the template */
  triggerSearch = new Subject<string>();

  /** The current search term as entered in the input[type="text"] */
  searchTerm: string = '';

  /** A list of all active profiles without any search applied */
  allProfiles: _Profile[] = [];

  /** Defines if new elements should be expanded or collapsed */
  expandCollapseState: 'expand' | 'collapse' = 'expand';

  /** Whether or not the SPN is enabled */
  spnEnabled = false;

  /**
   * Emits when the user clicks the "expand all" or "collapse all" buttons.
   * Once the user did that we stop updating the default state depending on whether the
   * SPN is enabled or not.
   */
  private userChangedState = new Subject<void>();

  /**
   * A list of profiles that are currently displayed. This is basically allProfiles but with
   * text search applied.
   */
  profiles: _Profile[] = [];

  /** TrackByFunction for the profiles. */
  trackProfile: TrackByFunction<_Profile> = (_, profile) => profile.ID;

  /** TrackByFunction for the exit pins */
  trackPin: TrackByFunction<_Pin> = (_, pin) => pin.ID;

  constructor(
    private netquery: Netquery,
    private spn: SPNService,
    private configService: ConfigService,
    private expertise: ExpertiseService,
    private cdr: ChangeDetectorRef,
  ) { }

  searchProfiles(term: string) {
    term = term.trim();

    if (term === '') {
      this.profiles = [
        ...this.allProfiles
      ];

      return;
    }

    const lowerCaseTerm = term.toLocaleLowerCase()
    this.profiles = this.allProfiles.filter(p => {
      if (p.ID.toLocaleLowerCase().includes(lowerCaseTerm)) {
        return true;
      }

      if (p.Name.toLocaleLowerCase().includes(lowerCaseTerm)) {
        return true;
      }

      if (p.exitPins.some(pin => pin.Name.toLocaleLowerCase().includes(lowerCaseTerm))) {
        return true;
      }

      return false;
    })
  }

  expandAll() {
    this.expandCollapseState = 'expand';
    this.allProfiles.forEach(profile => profile.expanded = profile.identities.length > 0)
    this.searchProfiles(this.searchTerm)
    this.userChangedState.next();

    this.cdr.markForCheck()
  }

  collapseAll() {
    this.expandCollapseState = 'collapse';
    this.allProfiles.forEach(profile => profile.expanded = false)
    this.searchProfiles(this.searchTerm)
    this.userChangedState.next();

    this.cdr.markForCheck()
  }

  ngOnInit(): void {
    this.configService.watch<BoolSetting>('spn/enable')
      .pipe(
        takeUntil(this.destroy$),
        takeUntil(this.userChangedState),
      )
      .subscribe(enabled => {
        // if the SPN is enabled and the user did not yet change the
        // collapse/expand state we switch to "expand" for the default.
        // Otherwise, there will be no identities so there's no reason
        // to expand them at all so we switch to collapse
        if (enabled) {
          this.expandCollapseState = 'expand'
        } else {
          this.expandCollapseState = 'collapse'
        }

        this.spnEnabled = enabled;
      });

    combineLatest([
      combineLatest([
        interval(5000),
        this.expertise.change,
      ])
        .pipe(
          startWith(-1),
          switchMap(() => {
            let query: Condition = {};
            if (this.expertise.currentLevel !== ExpertiseLevel.Developer) {
              query["internal"] = { $eq: false }
            }

            return forkJoin({
              stats: this.netquery.getProfileStats(query),
            })
          })
        ),

      this.spn.watchPins()
        .pipe(
          debounceTime(100),
          startWith([]),
        ),
      this.triggerSearch
        .pipe(
          debounceTime(100),
          startWith(''),
        ),
    ])
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe(([res, pins, searchTerm]) => {
        // create a lookup map for the the SPN map pins
        const pinLookupMap = new Map<string, Pin>();
        pins.forEach(p => pinLookupMap.set(p.ID, p))

        // create a lookup map from already known profiles so we can
        // inherit states like "showMore".
        const profileLookupMap = new Map<string, _Profile>();
        this.allProfiles.forEach(p => profileLookupMap.set(p.ID, p))

        // map the list of profile statistics to include the exit Pin information
        // as well.
        this.allProfiles = res.stats.map(s => {
          const existing = profileLookupMap.get(s.ID);
          return {
            ...s,
            exitPins: s.identities
              .map(ident => {
                const pin = pinLookupMap.get(ident.exit_node);
                if (!pin) {
                  return null;
                }

                return {
                  count: ident.count,
                  ...pin
                }
              })
              .filter(pin => !!pin),
            showMore: existing?.showMore ?? false,
            expanded: existing?.expanded ?? (this.expandCollapseState === 'expand' && s.identities.length > 1 /* there's always the "direct" identity */),
          } as _Profile
        });

        this.searchProfiles(searchTerm);

        this.cdr.markForCheck();
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
