import { ChangeDetectorRef, Component, OnDestroy, OnInit, TrackByFunction } from '@angular/core';
import { Subscription } from 'rxjs';
import { delayWhen } from 'rxjs/operators';
import { fadeInAnimation, fadeOutAnimation } from 'src/app/shared/animations';
import { ConnTracker, ProcessGroup } from '../../services/connection-tracker.service';

@Component({
  selector: 'app-network-overview',
  templateUrl: './overview-view.html',
  styleUrls: ['./overview-view.scss'],
  animations: [
    fadeInAnimation,
    fadeOutAnimation
  ],
})
export class NetworkOverviewComponent implements OnInit, OnDestroy {
  /** @private Whether or not we are still loading initial data. */
  loading = true;

  /** @private The total number of connections. */
  totalConnections = 0;

  /** @private The total number of allowed connections. */
  totalAllowed = 0;

  /** @private The total number of blocked connections. */
  totalBlocked = 0;

  /** @private All process-groups/profiles that are currently active. */
  profiles: ProcessGroup[] = [];

  /**
   * @private
   * {@type TrackByFunction} from process groups.
   */
  trackProfile: TrackByFunction<ProcessGroup> = (_: number, p: ProcessGroup) => p.ID;

  /** The subscription to our active process-group updates observable */
  private subscription = Subscription.EMPTY;

  constructor(
    private connTrack: ConnTracker,
    private changeDetector: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    // Subscribe to updates on the list of runnently running profiles
    // and recalculate the number of allowed, blocked and total connections.
    this.subscription =
      this.connTrack.profiles
        .pipe(delayWhen(() => this.connTrack.ready))
        .subscribe(profiles => {
          this.loading = false;
          this.totalAllowed = 0;
          this.totalBlocked = 0;
          this.totalConnections = 0;

          profiles.forEach(p => {
            this.totalConnections += p.size;
            this.totalAllowed += p.countAllowed;
            this.totalBlocked += p.countUnpermitted;
          });

          this.profiles = profiles;

          this.changeDetector.markForCheck();
        })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
