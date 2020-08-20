import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './services/config.service';
import { NotificationsService, trackNotification } from './services/notifications.service';
import { Notification } from './services/notifications.types';
import { PortapiService } from './services/portapi.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'portmaster';
  notifications: Notification<any>[] = [];

  showDebugPanel = true;

  readonly trackNotification = trackNotification;

  constructor(public ngZone: NgZone,
              public portapi: PortapiService,
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

    this.notifService.updates$.subscribe(() => this.loadNotifications())
  }

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    console.log(`Loading notifications`)
    this.notifService.query("")
      .subscribe(notifs => {
        this.notifications = notifs;
      })
  }
}
