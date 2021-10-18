import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, TrackByFunction } from "@angular/core";
import { Subscription } from "rxjs";
import { Connection, IPProtocol, IsDenied, IsDNSRequest, ScopeTranslation, Verdict } from "src/app/services";
import { ConnectionHelperService } from "../connection-helper.service";

@Component({
  selector: 'app-ungrouped-connection-content',
  styleUrls: ['../content.scss', './ungrouped-connection-content.scss'],
  templateUrl: './ungrouped-connection-content.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UngroupedConnectionContentComponent implements OnInit, OnDestroy, OnChanges {
  @Input()
  conn: Connection | null = null;

  readonly IsDNS = IsDNSRequest;
  readonly scopeTranslation = ScopeTranslation;
  readonly verdict = Verdict;
  readonly Protocols = IPProtocol;
  private _subscription = Subscription.EMPTY;

  connectionNotice: string = '';

  ngOnChanges(changes: SimpleChanges) {
    if (!!changes?.conn) {
      this.updateConnectionNotice();
    }
  }

  constructor(
    public helper: ConnectionHelperService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this._subscription = this.helper.refresh.subscribe(() => {
      this.updateConnectionNotice();
      this.changeDetectorRef.markForCheck();
    })
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  private updateConnectionNotice() {
    this.connectionNotice = '';
    if (!this.conn) {
      return;
    }

    if (this.conn!.Verdict === Verdict.Failed) {
      this.connectionNotice = 'Failed with previous settings.'
      return;
    }

    if (IsDenied(this.conn!.Verdict)) {
      this.connectionNotice = 'Blocked by previous settings.';
    } else {
      this.connectionNotice = 'Allowed by previous settings.';
    }

    this.connectionNotice += ' You current settings could decide differently.'
  }
}
