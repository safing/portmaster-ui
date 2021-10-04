import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnDestroy, OnInit } from "@angular/core";
import { interval, Subscription } from "rxjs";
import { startWith, share } from "rxjs/operators";
import { Connection } from "src/app/services";
import { InspectedProfile } from "src/app/services/connection-tracker.service";
import { ConnectionHelperService } from "../connection-helper.service";

@Component({
  selector: 'app-ungrouped-connection-row',
  templateUrl: './ungrouped-connection-row.html',
  styleUrls: ['../content.scss', './ungrouped-connection-row.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UngroupedConnectionRowComponent implements OnInit, OnDestroy {
  @Input()
  set conn(c: Connection | null) {
    this._conn = c;
  }
  get conn() { return this._conn; }
  _conn: Connection | null = null;

  @Input()
  activeRevision: number | undefined = 0;

  get isOutdated() {
    if (!this.conn || !this.helper.profile) {
      return false;
    }
    if (this.helper.profile.currentProfileRevision === -1) {
      // we don't know the revision counter yet ...
      return false;
    }
    return this.conn.ProfileRevisionCounter !== this.helper.profile.currentProfileRevision;
  }

  /* timeAgoTicker ticks every 10000 seconds to force a refresh
     of the timeAgo pipes */
  timeAgoTicker = 0;

  private _subscription = Subscription.EMPTY;

  constructor(
    public helper: ConnectionHelperService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this._subscription = new Subscription();

    const tickerSub = interval(10000).pipe(
      startWith(-1),
      share()
    ).subscribe(i => this.timeAgoTicker = i);

    const helperSub = this.helper.refresh.subscribe(() => {
      this.changeDetectorRef.markForCheck();
    });

    this._subscription.add(helperSub);
    this._subscription.add(tickerSub);
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }
}
