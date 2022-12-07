import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from "@angular/core";
import { ActivatedRoute, Router } from '@angular/router';
import { BoolSetting, ChartResult, ConfigService, Netquery, SPNService, SPNStatus, UserProfile } from "@safing/portmaster-api";
import { SfngDialogService } from '@safing/ui';
import { catchError, forkJoin, interval, of, startWith, Subject, switchMap, takeUntil } from "rxjs";
import { fadeInAnimation, fadeOutAnimation } from "../animations";
import { SPNAccountDetailsComponent } from '../spn-account-details';

@Component({
  selector: 'app-spn-status',
  templateUrl: './spn-status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
    fadeOutAnimation,
  ]
})
export class SPNStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /** Whether or not the SPN is currently enabled */
  spnEnabled = false;

  /** The chart data for the SPN connection chart */
  spnConnChart: ChartResult[] = [];

  /** The current amount of SPN identities used */
  identities: number = 0;

  /** The current SPN user profile */
  profile: UserProfile | null = null;

  /** The current status of the SPN module */
  spnStatus: SPNStatus | null = null;

  /** Returns whether or not the current package has the SPN feature */
  get packageHasSPN() {
    return this.profile?.current_plan?.feature_ids?.includes('spn')
  }

  constructor(
    private configService: ConfigService,
    private spnService: SPNService,
    private netquery: Netquery,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private dialog: SfngDialogService
  ) { }

  ngOnInit(): void {
    this.spnService
      .watchProfile()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe(profile => {
        this.profile = profile || null;

        this.cdr.markForCheck();
      });

    this.spnService.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.spnStatus = status;

        this.cdr.markForCheck();
      })

    this.configService.watch<BoolSetting>("spn/enable")
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.spnEnabled = value;

        // If the user disabled the SPN clear the connection chart
        // as well.
        if (!this.spnEnabled) {
          this.spnConnChart = [];
        }

        this.cdr.markForCheck();
      });

    interval(5000)
      .pipe(
        startWith(-1),
        takeUntil(this.destroy$),
        switchMap(() => forkJoin({
          chart: this.netquery.activeConnectionChart({ tunneled: { $eq: true } }),
          identities: this.netquery.query({
            query: { tunneled: { $eq: true }, exit_node: { $ne: "" } },
            groupBy: ['exit_node'],
            select: [
              'exit_node',
              { $count: { field: '*', as: 'totalCount' } }
            ]
          })
        }))
      )
      .subscribe(data => {
        this.spnConnChart = data.chart;
        this.identities = data.identities.length;

        this.cdr.markForCheck();
      })
  }

  openOrLogin() {
    if (this.activeRoute.snapshot.firstChild?.url[0]?.path === "spn") {
      this.dialog.create(SPNAccountDetailsComponent, {
        autoclose: true,
        backdrop: 'light'
      })

      return
    }

    this.router.navigate(['/spn'])
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setSPNEnabled(v: boolean) {
    this.configService.save(`spn/enable`, v)
      .subscribe();
  }
}
