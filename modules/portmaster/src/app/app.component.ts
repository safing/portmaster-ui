import { Type, ChangeDetectorRef, Component, NgZone, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { debounceTime, filter, map, skip, startWith } from 'rxjs/operators';
import { FailureStatus, Notification, NotificationsService, NotificationType, OnlineStatus, StatusService, Subsystem } from './services';
import { PortapiService } from './services/portapi.service';
import { Record } from './services/portapi.types';
import { ActionHandler, VirtualNotification } from './services/virtual-notification';
import { ActionIndicator, ActionIndicatorService } from './shared/action-indicator';
import { fadeInAnimation, fadeOutAnimation } from './shared/animations';
import { ExitService } from './shared/exit-screen';

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

  constructor(
    public ngZone: NgZone,
    public portapi: PortapiService,
    public changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private notificationService: NotificationsService,
    private actionIndicatorService: ActionIndicatorService,
    private exitService: ExitService, // NOT USED BUT MUST BE INJECTED
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
              },
              {
                ID: 'a2',
                Text: 'Go away'
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
              },
              {
                ID: 'block-domain-all',
                Text: 'Block'
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
  }
}
