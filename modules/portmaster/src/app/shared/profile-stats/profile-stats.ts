import { ChangeDetectionStrategy, Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { of, Subscription } from 'rxjs';
import { delay, delayWhen, flatMap, tap } from 'rxjs/operators';
import { ConnectionStatistics } from 'src/app/services/connection-tracker.types';
import { ConnTracker, InspectedProfile } from '../../services/connection-tracker.service';

@Component({
  selector: 'app-profile-stats',
  templateUrl: './profile-stats.html',
  styleUrls: ['./profile-stats.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileStatisticsComponent implements OnInit, OnDestroy {
  @Input()
  stats: ConnectionStatistics = new ConnectionStatistics();

  @Input()
  total: number = 0;

  @Input()
  mode: 'input' | 'inspected' = 'input';

  private susbscription = Subscription.EMPTY;

  constructor(
    private connTracker: ConnTracker,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    if (this.mode !== 'inspected') {
      return;
    }

    this.susbscription = this.connTracker.inspectedProfileChange
      .pipe(
        delayWhen(val => {
          if (!val) {
            return of(val);
          }

          return val.onDone;
        }),
      )
      .subscribe(profile => {
        if (!!profile) {
          this.total = profile.profile.size;
          this.stats = profile.stats;
        } else {
          this.total = 0;
          this.stats = new ConnectionStatistics();
        }

        this.changeDetectorRef.detectChanges();
      })
  }

  ngOnDestroy() {
    this.susbscription.unsubscribe();
  }
}
