import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { NotificationsService } from './services/notifications.service';
import { Notification } from './services/notifications.types';
import { PortapiService } from './services/portapi.service';
import { Subsystem, CoreStatus, getOnlineStatusString } from './services/status.types';
import { StatusService } from './services/status.service';
import { delay } from 'rxjs/operators';
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
export class AppComponent implements OnInit {
  title = 'portmaster';
  notifications: Notification<any>[] = [];
  subsystems: Subsystem[] = [];
  subsysDetails: Subsystem | null = null;
  settings: Setting[] = [];

  showDebugPanel = true;

  status: ExtendedCoreStatus | null = null;

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

    this.statusService.watchSubsystems().subscribe(
      subsys => this.subsystems = subsys
    );

    this.configService.query("").subscribe(
      settings => {
        console.log(settings);
        this.settings = settings;
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
}
