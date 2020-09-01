import { ChangeDetectorRef, Component, NgZone, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NotificationsService } from './services/notifications.service';
import { Notification } from './services/notifications.types';
import { PortapiService } from './services/portapi.service';
import { Subsystem, CoreStatus, getOnlineStatusString } from './services/status.types';
import { StatusService } from './services/status.service';
import { delay, combineLatest } from 'rxjs/operators';
import { ConfigService } from './services/config.service';
import { Setting } from './services/config.types';

/**
 * Extends the CoreStatus to add string values for all those enums.
 */
interface ExtendedCoreStatus extends CoreStatus {
  online: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'portmaster';
  notifications: Notification<any>[] = [];
  subsystems: Subsystem[] = [];
  subsysDetails: Subsystem | null = null;
  settings: {
    [key: string]: Setting[]
  } = {};

  showDebugPanel = true;

  status: ExtendedCoreStatus | null = null;

  @ViewChild('settingsSpacer', {
    static: true,
    read: ElementRef,
  })
  settingsSpacer: ElementRef | null = null;

  shouldShowSettingsNav: boolean = false;

  constructor(public ngZone: NgZone,
              public portapi: PortapiService,
              public configService: ConfigService,
              public statusService: StatusService,
              public notifService: NotificationsService,
              public changeDetectorRef: ChangeDetectorRef) {

    (window as any).portapi = portapi;
    (window as any).toggleDebug = () => {
      // this may be called from outside of angulars execution zone.
      // make sure to call toggle and call inside angular.
      this.ngZone.runGuarded(() => {
        this.showDebugPanel = !this.showDebugPanel;
        this.changeDetectorRef.detectChanges();
      })
    }

    this.notifService.watchAll().subscribe(
      (notifs) => this.notifications = notifs
    );

    this.configService.query("")
    .pipe(
      combineLatest(this.statusService.watchSubsystems())
    )
    .subscribe(
      ([settings, subsystems]) => {
        this.subsystems = subsystems;

        this.settings = {
          'other': [],
        };
        this.subsystems.forEach(subsys => {
          this.settings[subsys.ConfigKeySpace] = []
        });

        settings.forEach(setting => {
          let pushed = false;
          this.subsystems.forEach(subsys => {
            if (setting.Key.startsWith(subsys.ConfigKeySpace.slice("config:".length))) {
              this.settings[subsys.ConfigKeySpace].push(setting);
              pushed = true;
            }
          })

          if (!pushed) {
            console.log(setting.Key);
            this.settings['other'].push(setting);
          }
        })
      }
    )

    this.statusService.status$
      .pipe(delay(100)) // for testing
      .subscribe(
        status => {
          console.log(status);
          this.status = {
            ...status,
            online: getOnlineStatusString(status.OnlineStatus),
          }
        }
      )
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    const observer = new IntersectionObserver(this.checkViewPort.bind(this));
    observer.observe(this.settingsSpacer!.nativeElement);
  }

  private checkViewPort(entries: IntersectionObserverEntry[]) {
    console.log(entries);
    this.shouldShowSettingsNav = entries.some(e => !e.isIntersecting);
    console.log(`new setting: `, this.shouldShowSettingsNav);
  }
}
