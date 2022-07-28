import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from "@angular/core";
import { IPProtocol, IPScope, IsDenied, IsDNSRequest, NetqueryConnection, Verdict } from "@safing/portmaster-api";
import { Subscription } from "rxjs";
import { NetqueryHelper } from "../connection-helper.service";

@Component({
  selector: 'sfng-netquery-conn-details',
  styleUrls: ['./conn-details.scss'],
  templateUrl: './conn-details.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SfngNetqueryConnectionDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input()
  conn: NetqueryConnection | null = null;

  readonly IsDNS = IsDNSRequest;
  readonly verdict = Verdict;
  readonly Protocols = IPProtocol;
  readonly scopes = IPScope;
  private _subscription = Subscription.EMPTY;

  connectionNotice: string = '';

  ngOnChanges(changes: SimpleChanges) {
    if (!!changes?.conn) {
      this.updateConnectionNotice();
    }
  }

  constructor(
    public helper: NetqueryHelper,
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

    if (this.conn!.verdict === Verdict.Failed) {
      this.connectionNotice = 'Failed with previous settings.'
      return;
    }

    if (IsDenied(this.conn!.verdict)) {
      this.connectionNotice = 'Blocked by previous settings.';
    } else {
      this.connectionNotice = 'Allowed by previous settings.';
    }

    this.connectionNotice += ' You current settings could decide differently.'
  }
}
