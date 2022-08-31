import { Overlay } from '@angular/cdk/overlay';
import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PortapiService } from '@safing/portmaster-api';
import { OverlayStepper, SfngDialogService, StepperRef } from '@safing/ui';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { debounceTime, filter, map, mergeMap, skip, startWith, take } from 'rxjs/operators';
import { IntroModule } from './intro';
import { Notification, NotificationsService, NotificationType, UIStateService } from './services';
import { ActionIndicator, ActionIndicatorService } from './shared/action-indicator';
import { fadeInAnimation, fadeOutAnimation } from './shared/animations';
import { ExitService } from './shared/exit-screen';
import { SfngNetquerySearchOverlay } from './shared/netquery/search-overlay';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    fadeInAnimation,
    fadeOutAnimation,
  ]
})
export class AppComponent implements OnInit {
  readonly connected = this.portapi.connected$.pipe(
    debounceTime(250),
    startWith(false)
  );
  title = 'portmaster';

  /** The current status of the side dash as emitted by the navigation component */
  sideDashStatus: 'collapsed' | 'expanded' = 'expanded';

  /** Whether or not the side-dash is in overlay mode */
  sideDashOverlay = false;

  /** The MQL to watch for screen size changes. */
  private mql!: MediaQueryList;

  /** Emits when the side-dash is opened or closed in non-overlay mode */
  private sideDashOpen = new BehaviorSubject<boolean>(false);

  /** Used to emit when the window size changed */
  private windowResizeChange = new Subject<void>();

  get sideDashOpen$() { return this.sideDashOpen.asObservable() }

  get showOverlay$() { return this.exitService.showOverlay$ }

  get onContentSizeChange$() {
    return combineLatest([
      this.windowResizeChange,
      this.sideDashOpen,
    ]).pipe(
      debounceTime(100),
      map(([_, sideDashOpen]) => sideDashOpen)
    )
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.windowResizeChange.next();
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === ' ' && event.ctrlKey) {
      this.dialog.create(
        SfngNetquerySearchOverlay,
        {
          positionStrategy: this.overlay
            .position()
            .global()
            .centerHorizontally()
            .top('1rem'),
          backdrop: 'light',
          autoclose: true,
        }
      )
      return;
    }
  }

  constructor(
    public ngZone: NgZone,
    public portapi: PortapiService,
    public changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private notificationService: NotificationsService,
    private actionIndicatorService: ActionIndicatorService,
    private exitService: ExitService,
    private overlayStepper: OverlayStepper,
    private dialog: SfngDialogService,
    private overlay: Overlay,
    private stateService: UIStateService,
  ) {
    (window as any).fakeNotification = () => {
      this.ngZone.run(() => {
        this.notificationService.create(
          `random-id-${Math.random()}`,
          'A **fake** message for testing notifications.<br> :rocket:',
          NotificationType.Info,
          {
            Title: 'Fake Message',
            Category: 'Testing',
            AvailableActions: [
              {
                ID: 'a1',
                Text: 'Got it',
                Type: '',
              },
              {
                ID: 'a2',
                Text: 'Go away',
                Type: '',
              }
            ]
          }
        ).subscribe();
      })
    }

    (window as any).createNotification = (notif: Partial<Notification>) => {
      this.ngZone.run(() => {
        notif.EventID = notif.EventID || `random-id-${Math.random()}`;
        notif.Type = notif.Type || NotificationType.Info;

        this.notificationService.create(notif).subscribe();
      })
    }

    (window as any).fakePrompt = (what: string, profileId: string = '_unidentified') => {
      this.ngZone.run(() => {

        this.notificationService.create(`filter:prompt-${Math.random()}`,
          what,
          NotificationType.Prompt,
          {
            Title: what,
            EventData: {
              Profile: {
                Source: "local",
                ID: profileId,
              },
              Entity: {
                Domain: what,
              }
            },
            AvailableActions: [
              {
                ID: 'allow-domain-all',
                Text: 'Allow',
                Type: ''
              },
              {
                ID: 'block-domain-all',
                Text: 'Block',
                Type: ''
              }
            ]
          }).subscribe()
      })
    }

    (window as any).portapi = portapi;

    (window as any).fakeActionIndicator = (msg: ActionIndicator) => {
      this.ngZone.run(() => {
        this.actionIndicatorService.create(msg);
      })
    }
  }

  onSideDashChange(state: 'expanded' | 'collapsed' | 'force-overlay') {
    if (state === 'force-overlay') {
      state = 'expanded';
      if (!this.sideDashOverlay) {
        this.sideDashOverlay = true;
      }
    } else {
      this.sideDashOverlay = this.mql.matches;
    }

    this.sideDashStatus = state;

    if (!this.sideDashOverlay) {
      this.sideDashOpen.next(this.sideDashStatus === 'expanded')
    }
  }

  ngOnInit() {
    // force a reload of the current route if we reconnected to
    // portmaster. This ensures we'll refresh any data that's currently
    // displayed.
    this.connected
      .pipe(
        filter(connected => !!connected),
        skip(1),
      )
      .subscribe(async () => {
        const current = this.router.url;
        await this.router.navigateByUrl('/', { skipLocationChange: true })
        this.router.navigate([current]);
      })

    this.stateService.uiState()
      .pipe(take(1))
      .subscribe(state => {
        if (!state.introScreenFinished) {
          this.showIntro();
        }
      })

    this.mql = window.matchMedia('(max-width: 1200px)');
    this.sideDashOverlay = this.mql.matches;

    this.mql.addEventListener('change', () => {
      this.sideDashOverlay = this.mql.matches;

      if (!this.sideDashOverlay) {
        this.sideDashOpen.next(this.sideDashStatus === 'expanded')
      }
    })
  }

  showIntro(): StepperRef {
    const stepperRef = this.overlayStepper.create(IntroModule.Stepper)

    stepperRef.onFinish.subscribe(() => {
      this.stateService.uiState()
        .pipe(
          take(1),
          mergeMap(state => this.stateService.saveState({
            ...state,
            introScreenFinished: true
          }))
        )
        .subscribe();
    })

    return stepperRef;
  }
}
