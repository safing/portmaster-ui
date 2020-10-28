import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TrackByFunction } from '@angular/core';
import { Subscription } from 'rxjs';
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
  loading = true;

  totalConnections = 0;
  totalAllowed = 0;
  totalBlocked = 0;

  profiles: ProcessGroup[] = [];

  trackProfile: TrackByFunction<ProcessGroup> = (_: number, p: ProcessGroup) => p.id;

  private subscription = Subscription.EMPTY;

  constructor(
    private connTrack: ConnTracker,
    private changeDetector: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.subscription = this.connTrack.ready.subscribe(() => {
      this.loading = false;
      this.changeDetector.markForCheck();
    });

    this.subscription.add(
      this.connTrack.profiles.subscribe(profiles => {
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
    )
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
