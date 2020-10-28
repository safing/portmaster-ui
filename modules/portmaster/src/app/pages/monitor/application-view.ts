import { Component, Input } from '@angular/core';
import { InspectedProfile } from 'src/app/services/connection-tracker.service';
import { ConnectionStatistics } from 'src/app/services/connection-tracker.types';
import { fadeInAnimation } from '../../shared/animations';

@Component({
  selector: 'app-monitor-application',
  templateUrl: './application-view.html',
  styleUrls: ['./application-view.scss'],
  animations: [
    fadeInAnimation,
  ],
})
export class MonitorApplicationViewComponent {
  get loading() {
    return this.profile?.loading;
  }

  get stats() {
    return this.profile?.stats || new ConnectionStatistics();
  }

  @Input()
  profile: InspectedProfile | null = null;
}
