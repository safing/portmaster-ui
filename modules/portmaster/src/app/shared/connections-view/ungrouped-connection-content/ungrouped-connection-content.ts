import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, TrackByFunction } from "@angular/core";
import { Subscription } from "rxjs";
import { Connection, IPProtocol, ScopeTranslation, Verdict } from "src/app/services";
import { ConnectionHelperService } from "../connection-helper.service";

@Component({
  selector: 'app-ungrouped-connection-content',
  styleUrls: ['../content.scss', './ungrouped-connection-content.scss'],
  templateUrl: './ungrouped-connection-content.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UngroupedConnectionContentComponent implements OnInit, OnDestroy {
  @Input()
  conn: Connection | null = null;

  readonly scopeTranslation = ScopeTranslation;
  readonly verdict = Verdict;
  readonly Protocols = IPProtocol;
  private _subscription = Subscription.EMPTY;

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
