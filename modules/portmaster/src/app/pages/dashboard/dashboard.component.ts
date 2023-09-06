import { KeyValue } from "@angular/common";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnInit, QueryList, TrackByFunction, ViewChild, ViewChildren, forwardRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AppProfile, AppProfileService, ChartResult, Database, FeatureID, Netquery, SPNService, UserProfile, Verdict } from "@safing/portmaster-api";
import { SfngDialogService } from "@safing/ui";
import { Observable, forkJoin, map, repeat, switchMap } from "rxjs";
import { ActionIndicatorService } from 'src/app/shared/action-indicator';
import { SfngNetqueryLineChartComponent } from "src/app/shared/netquery/line-chart/line-chart";
import { SPNAccountDetailsComponent } from "src/app/shared/spn-account-details";
import { MAP_HANDLER, MapRef } from "../spn/map-renderer";

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./dashboard.component.scss'],
  templateUrl: './dashboard.component.html',
  providers: [
    { provide: MAP_HANDLER, useExisting: forwardRef(() => DashboardPageComponent), multi: true },
  ]
})
export class DashboardPageComponent implements OnInit {
  @ViewChild('map', { static: true, read: ElementRef })
  mapElement!: ElementRef<HTMLElement>;

  @ViewChildren(SfngNetqueryLineChartComponent)
  lineCharts!: QueryList<SfngNetqueryLineChartComponent>;

  destroyRef = inject(DestroyRef);
  profileService = inject(AppProfileService);
  netquery = inject(Netquery);
  spn = inject(SPNService);
  actionIndicator = inject(ActionIndicatorService);
  cdr = inject(ChangeDetectorRef);
  dialog = inject(SfngDialogService);
  host = inject(ElementRef);
  resizeObserver!: ResizeObserver;

  blockedProfiles: {
    [profileKey: string]: { profile: AppProfile, count: number }
  } = {}

  connectionsPerCountry: {
    [country: string]: number
  } = {};

  countryNames: { [country: string]: string } = {};

  activeConnections: number = 0;
  blockedConnections: number = 0;
  activeProfiles: number = 0;
  activeIdentities = 0;
  dataIncoming = 0;
  dataOutgoing = 0;
  connectionChart: ChartResult[] = [];
  tunneldConnectionChart: ChartResult[] = [];

  // private triggerRender$ = new Subject<void>();

  countriesPerProfile: { [profile: string]: string[] } = {}

  profile: UserProfile | null = null;

  featureBw = false;
  featureSPN = false;

  features$ = this.spn.watchEnabledFeatures()
    .pipe(takeUntilDestroyed());

  trackCountry: TrackByFunction<KeyValue<string, any>> = (_, ctr) => ctr.key;
  trackApp: TrackByFunction<KeyValue<string, any>> = (_, ctr) => ctr.key;

  //countries: any;
  data: any;

  private mapRef: MapRef | null = null;

  registerMap(ref: MapRef): void {
    this.mapRef = ref;

    this.mapRef.onMapReady(() => {
      this.updateMapCountries();
    })
  }

  private updateMapCountries() {
    // this check is basically to make typescript happy ...
    if (!this.mapRef) {
      return;
    }

    this.mapRef.worldGroup
      .selectAll('path')
      .classed('active', (d: any) => {
        return !!this.connectionsPerCountry[d.properties.iso_a2];
      });
  }

  unregisterMap(ref: MapRef): void {
    this.mapRef = null;
  }

  openAccountDetails() {
    this.dialog.create(SPNAccountDetailsComponent, {
      autoclose: true,
      backdrop: 'light'
    })
  }

  onCountryHover(code: string | null) {
    if (!this.mapRef) {
      return
    }

    this.mapRef.worldGroup
      .selectAll('path')
      .classed('hover', (d: any) => {
        return (d.properties.iso_a2 === code);
      });
  }

  onProfileHover(profile: string | null) {
    if (!this.mapRef) {
      return
    }

    this.mapRef.worldGroup
      .selectAll('path')
      .classed('hover', (d: any) => {
        if (!profile) {
          return false;
        }

        return this.countriesPerProfile[profile].includes(d.properties.iso_a2);
      });
  }

  async ngOnInit() {
    this.netquery
      .query({
        select: [
          'profile',
          {
            $count: {
              field: '*',
              as: 'totalCount'
            }
          }
        ],
        query: {
          verdict: { $in: [Verdict.Block, Verdict.Drop] }
        },
        groupBy: ['profile'],
        databases: [Database.Live]
      })
      .pipe(
        repeat({ delay: 10000 }),
        switchMap(result => {
          let queries: {
            [profileKey: string]: Observable<{ profile: AppProfile, count: number }>
          } = {}

          result.forEach(result => {
            queries[result.profile!] = this.profileService.getAppProfile(result.profile!)
              .pipe(
                map(profile => {
                  return {
                    profile,
                    count: result.totalCount!,
                  }
                })
              )
          })

          return forkJoin(queries);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(results => {
        this.blockedConnections = 0;
        Object.keys(results)
          .forEach(profile => this.blockedConnections += results[profile].count);

        this.blockedProfiles = results;
        this.cdr.markForCheck();
      })

    this.netquery
      .query({
        select: [
          'country',
          { $count: { field: '*', as: 'totalCount' } },
          { $sum: { field: 'bytes_sent', as: 'bwout' } },
          { $sum: { field: 'bytes_received', as: 'bwin' } },
        ],
        query: {
          allowed: { $eq: true },
        },
        groupBy: ['country'],
        databases: [Database.Live]
      })
      .pipe(
        repeat({ delay: 10000 }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(async result => {
        this.connectionsPerCountry = {};
        this.dataIncoming = 0;
        this.dataOutgoing = 0;

        result.forEach(row => {
          this.dataIncoming += row.bwin;
          this.dataOutgoing += row.bwout;

          if (row.country === '') {
            return
          }

          this.connectionsPerCountry[row.country!] = row.totalCount || 0;
        })

        this.updateMapCountries()

        this.cdr.markForCheck();
      })

    this.netquery
      .query({
        select: ['profile', 'country', 'active', { $count: { field: '*', as: 'totalCount' } }],
        query: {
          allowed: { $eq: true },
        },
        groupBy: ['profile', 'country', 'active'],
        databases: [Database.Live],
      })
      .pipe(
        repeat({ delay: 10000 }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(results => {
        let profiles = new Set<string>();

        this.activeConnections = 0;
        this.countriesPerProfile = {};

        results.forEach(row => {
          profiles.add(row.profile!);

          if (row.active) {
            this.activeConnections += row.totalCount;
          }

          const arr = (this.countriesPerProfile[row.profile!] || []);
          arr.push(row.country!)
          this.countriesPerProfile[row.profile!] = arr;
        });

        this.activeProfiles = profiles.size;

        this.cdr.markForCheck();
      })

    this.netquery
      .query({
        query: { tunneled: { $eq: true }, exit_node: { $ne: "" } },
        groupBy: ['exit_node'],
        select: [
          'exit_node',
          { $count: { field: '*', as: 'totalCount' } }
        ],
        databases: [Database.Live],
      })
      .pipe(
        repeat({ delay: 10000 }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(rows => {
        this.activeIdentities = rows.length || 0;
        this.cdr.markForCheck();
      })

    this.netquery
      .activeConnectionChart({})
      .pipe(
        repeat({ delay: 10000 }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(result => {
        this.connectionChart = result;
        this.cdr.markForCheck();
      })

    this.netquery
      .activeConnectionChart({ tunneled: { $eq: true } })
      .pipe(
        repeat({ delay: 10000 }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(result => {
        this.tunneldConnectionChart = result;
        this.cdr.markForCheck();
      })

    this.spn
      .profile$
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (profile) => {
          this.profile = profile || null;
          this.featureBw = profile?.current_plan?.feature_ids?.includes(FeatureID.Bandwidth) || false;
          this.featureSPN = profile?.current_plan?.feature_ids?.includes(FeatureID.SPN) || false;

          // force a full change-detection cylce now!
          this.cdr.detectChanges()

          // force re-draw of the charts after change-detection because the
          // width may change now.
          this.lineCharts?.forEach(chart => chart.redraw())

          this.cdr.markForCheck();
        },
      })
  }

  /** Logs the user out of the SPN completely by purgin the user profile from the local storage */
  logoutCompletely(_: Event) {
    this.spn.logout(true)
      .subscribe(this.actionIndicator.httpObserver(
        'Logout',
        'You have been logged out of the SPN completely.'
      ))
  }
}
