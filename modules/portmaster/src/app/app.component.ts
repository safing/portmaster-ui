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

  showDebugPanel = false;

  private onlineStatusNotification: VirtualNotification<any> | null = null;

  private subsystemWarnings = new Map<string, VirtualNotification<Subsystem>>();

  constructor(
    public ngZone: NgZone,
    public portapi: PortapiService,
    public changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private statusService: StatusService,
    private notificationService: NotificationsService,
    private actionIndicatorService: ActionIndicatorService,
    private exitService: ExitService,
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

    // TODO(ppacher): move virtual notification handling to a dedicated service
    //
    // FIXME: remove everything below
    this.statusService.status$.subscribe(status => {
      if (!!this.onlineStatusNotification) {
        this.notificationService.deject(this.onlineStatusNotification);
        this.onlineStatusNotification!.dispose()
        this.onlineStatusNotification = null;
      }
      if (status.OnlineStatus !== OnlineStatus.Online) {
        let title = '';
        let msg = '';
        let actions: ActionHandler<any>[] = [];

        switch (status.OnlineStatus) {
          case OnlineStatus.Limited:
          case OnlineStatus.SemiOnline:
            title = 'Limited Network Access';
            msg = 'Portmaster detected limited network access.'
            break;

          case OnlineStatus.Offline:
            title = 'No Network Access'
            msg = 'Portmaster failed to connect to the internet.'
            break;

          case OnlineStatus.Portal:
            title = 'Captive Portal Detected'
            msg = `Portmaster detected a captive portal in your network.`
            actions = [
              {
                ID: 'open-portal',
                Text: 'Open',
                Run: (n: VirtualNotification<any>) => {
                  if ('openExternal' in (window as any)) {
                    (window as any).openExternal(status.CaptivePortal.URL);
                  }
                }
              }
            ]
            break;
        }

        if (title != '') {
          this.onlineStatusNotification = new VirtualNotification(
            'ui:online-status',
            NotificationType.Info,
            title,
            msg,
            {
              Category: 'Online-Status',
              AvailableActions: actions,
            },
          );

          this.notificationService.inject(this.onlineStatusNotification, { autoRemove: false });
        }
      }
    });

    this.statusService.watchSubsystems()
      .pipe(debounceTime(100))
      .subscribe(subsystems => {

        subsystems.forEach(subsystem => {
          subsystem.Modules.forEach(module => {
            const key = `ui:subsystem-${subsystem.ID}-${module.Name}`;
            if (module.FailureStatus === FailureStatus.Operational) {
              const notif = this.subsystemWarnings.get(key);
              if (!!notif) {
                this.subsystemWarnings.delete(key);
                notif.dispose();
              }
            } else {
              let actions: ActionHandler<any>[] = [];
              switch (module.FailureID) {
                case "missing-resolver":
                  actions.push({
                    ID: 'ui:redirect-resolver',
                    Text: 'Open',
                    Run: () => {
                      this.router.navigate(['/', 'settings'], { queryParams: { setting: 'dns/nameservers' } });
                    }
                  })
                  break;
                case "update-failed":
                  actions.push({
                    ID: 'ui:force-update',
                    Text: 'Retry',
                    Run: () => {
                      this.downloadUpdates();
                    }
                  })
                  break;
                case "no-access-code":
                case "invalid-access-code":
                  actions.push({
                    ID: 'ui:redirect-resolver',
                    Text: 'Open',
                    Run: () => {
                      this.router.navigate(['/', 'settings'], { queryParams: { setting: 'spn/specialAccessCode' } });
                    }
                  })
                  break;
              }

              const notif = new VirtualNotification<any>(
                key,
                {
                  [FailureStatus.Operational]: NotificationType.Info, // cannot happen but make Typescript happy
                  [FailureStatus.Hint]: NotificationType.Info,
                  [FailureStatus.Warning]: NotificationType.Warning,
                  [FailureStatus.Error]: NotificationType.Error,
                }[subsystem.FailureStatus],
                subsystem.Name,
                module.FailureMsg,
                {
                  Category: module.Name,
                }
              );
              this.subsystemWarnings.set(key, notif);

              this.notificationService.inject(notif);
            }
          });
        });
      });
  }

  downloadUpdates() {
    this.portapi.checkForUpdates();
  }
}
