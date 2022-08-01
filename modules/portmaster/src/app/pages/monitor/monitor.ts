import { Component } from '@angular/core';
import { SessionDataService } from 'src/app/services';
import { fadeInAnimation, moveInOutListAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './monitor.html',
  styleUrls: ['../page.scss', './monitor.scss'],
  providers: [],
  animations: [fadeInAnimation, moveInOutListAnimation],
})
export class MonitorPageComponent {
  constructor(
    public readonly session: SessionDataService,
  ) { }
}
