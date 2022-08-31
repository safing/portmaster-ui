import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { SPNService, UserProfile } from "@safing/portmaster-api";
import { catchError, finalize, of, Subject, takeUntil } from "rxjs";
import { ActionIndicatorService } from "../action-indicator";

@Component({
  selector: 'app-spn-login',
  templateUrl: './spn-login.html',
  styleUrls: ['./spn-login.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SPNLoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  /** The current user profile if the user is already logged in */
  profile: UserProfile | null = null;

  /** The value of the username text box */
  username: string = '';

  /** The value of the password text box */
  password: string = '';

  constructor(
    private spnService: SPNService,
    private uai: ActionIndicatorService,
    private cdr: ChangeDetectorRef
  ) { }

  login(): void {
    if (!this.username || !this.password) {
      return;
    }

    this.spnService.login({
      username: this.username,
      password: this.password
    })
      .pipe(finalize(() => {
        this.password = '';
      }))
      .subscribe(this.uai.httpObserver('SPN Login', 'SPN Login'))
  }

  ngOnInit(): void {
    this.spnService.watchProfile()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe(profile => {
        this.profile = profile || null;

        if (!!this.profile) {
          this.username = this.profile.username;
        }

        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
