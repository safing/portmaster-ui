import { Component } from '@angular/core';
import { PortapiService } from './services/portapi.service';
import { ConfigService } from './services/config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'portmaster';

  constructor(public portapi: PortapiService,
              public configService: ConfigService) {
    (window as any).portapi = portapi;
    (window as any).config = configService;
  }
}
