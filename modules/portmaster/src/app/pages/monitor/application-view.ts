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
  readonly nameRegex = /(.+)[\/\\](.+)$/gm;

  /** @private True if we are still loading the current profile. */
  get loading(): boolean {
    return this.profile?.loading || false;
  }

  /** @private The current (or empty) profile connection stats */
  get stats() {
    return this.profile?.stats || new ConnectionStatistics();
  }

  /** The inspected profile to display */
  @Input()
  profile: InspectedProfile | null = null;
}
