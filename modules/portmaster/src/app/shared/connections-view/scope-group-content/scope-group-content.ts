import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, TrackByFunction } from '@angular/core';
import { Subscription } from 'rxjs';
import { Connection } from 'src/app/services';
import { ScopeGroup } from 'src/app/services/connection-tracker.service';
import { ConnectionHelperService } from '../connection-helper.service';

@Component({
  selector: 'app-scope-group-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../content.scss', './scope-group-content.scss'],
  templateUrl: './scope-group-content.html'
})
export class ScopeGroupContentComponent implements OnInit, OnDestroy {
  @Input()
  grp: ScopeGroup | null = null;

  @Input()
  source: string = '';

  @Input()
  profileId: string = '';

  /** TrackByFunction for connection */
  trackByConnection: TrackByFunction<Connection> = (_: number, c: Connection | null) => c?.ID;

  private _subscription = Subscription.EMPTY;

  readonly displayedColumns = ['state', 'entity', 'started', 'ended', 'reason', 'actions'];

  constructor(
    public helper: ConnectionHelperService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this._subscription = this.helper.refresh.subscribe(() => {
      this.changeDetectorRef.markForCheck();
    })
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }
}
