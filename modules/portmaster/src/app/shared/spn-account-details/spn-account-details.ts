import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, Optional } from "@angular/core";
import { SPNService, UserProfile } from "@safing/portmaster-api";
import { SfngDialogRef, SFNG_DIALOG_REF } from "@safing/ui";
import { catchError, delay, of, Subject, takeUntil, tap } from "rxjs";
import { ActionIndicatorService } from "../action-indicator";

@Component({
  templateUrl: './spn-account-details.html',
  styleUrls: ['./spn-account-details.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SPNAccountDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /** Whether or not we're currently refreshing the user profile from the customer agent */
  refreshing = false;

  /** Whether or not we're still waiting for the user profile to be fetched from the backend */
  loadingProfile = true;

  currentUser: UserProfile | null = null;

  constructor(
    private spnService: SPNService,
    private cdr: ChangeDetectorRef,
    private uai: ActionIndicatorService,
    @Inject(SFNG_DIALOG_REF) @Optional() private dialogRef: SfngDialogRef<any>,
  ) { }

  /**
   * Force a refresh of the local user account
   *
   * @private - template only
   */
  refreshAccount() {
    this.refreshing = true;
    this.spnService.userProfile(true)
      .pipe(
        delay(1000),
        tap(() => {
          this.refreshing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe()
  }

  /**
   * Logout of your safing account
   *
   * @private - template only
   */
  logout() {
    this.spnService.logout()
      .pipe(tap(() => this.dialogRef?.close()))
      .subscribe(this.uai.httpObserver('SPN Logout', 'SPN Logout'))
  }

  ngOnInit(): void {
    this.spnService.watchProfile()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => of(null)),
      )
      .subscribe(profile => {
        this.loadingProfile = false;
        this.currentUser = profile || null;

        this.cdr.markForCheck();
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
