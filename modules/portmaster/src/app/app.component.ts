import { Component } from '@angular/core';
import { ConfigService } from './services/config.service';
import { NotificationsService } from './services/notifications.service';
import { PortapiService } from './services/portapi.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'portmaster';

  constructor(public portapi: PortapiService,
              public configService: ConfigService,
              public notifService: NotificationsService) {
    (window as any).portapi = portapi;
    (window as any).config = configService;
    (window as any).notifs = notifService;
  }
}
