import { Component } from '@angular/core';
import { PortapiService } from './services/portapi.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'portmaster';

  constructor(public portapi: PortapiService) {
    (window as any).portapi = portapi;
  }
}
