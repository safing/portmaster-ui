import { Component, OnInit } from '@angular/core';
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

  readonly trackNotification = trackNotification;

  constructor(public portapi: PortapiService,
              public configService: ConfigService,
              public notifService: NotificationsService) {
    (window as any).portapi = portapi;
    (window as any).config = configService;

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
