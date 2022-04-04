import { state } from '@angular/animations';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { timeThursdays } from 'd3';
import { debounceTime, filter, mergeMap, skip, startWith, take } from 'rxjs/operators';
import { IntroModule } from './intro';
import { Notification, NotificationsService, NotificationType, UIState, UIStateService } from './services';
import { PortapiService } from './services/portapi.service';
import { ActionIndicator, ActionIndicatorService } from './shared/action-indicator';
import { fadeInAnimation, fadeOutAnimation } from './shared/animations';
import { ExitService } from './shared/exit-screen';
import { OverlayStepper, StepperRef } from './shared/overlay-stepper';

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

  get showOverlay$() { return this.exitService.showOverlay$ }

  constructor(
    public ngZone: NgZone,
    public portapi: PortapiService,
    public changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private notificationService: NotificationsService,
    private actionIndicatorService: ActionIndicatorService,
    private exitService: ExitService,
    private overlayStepper: OverlayStepper,
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
