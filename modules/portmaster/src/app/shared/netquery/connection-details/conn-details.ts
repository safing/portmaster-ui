import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from "@angular/core";
import { IPProtocol, IPScope, IsDenied, IsDNSRequest, NetqueryConnection, PortapiService, Process, Verdict } from "@safing/portmaster-api";
import { SfngDialogService } from '@safing/ui';
import { Subscription } from "rxjs";
import { ProcessDetailsDialogComponent } from '../../process-details-dialog';
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

  process: Process | null = null;

  readonly IsDNS = IsDNSRequest;
  readonly verdict = Verdict;
  readonly Protocols = IPProtocol;
  readonly scopes = IPScope;
  private _subscription = Subscription.EMPTY;

  connectionNotice: string = '';

  ngOnChanges(changes: SimpleChanges) {
    if (!!changes?.conn) {
      this.updateConnectionNotice();

      if (this.conn?.extra_data?.pid !== undefined) {
        this.portapi.get<Process>(`network:tree/${this.conn.extra_data.pid}-${this.conn.extra_data.processCreatedAt}`)
          .subscribe({
            next: p => {
              this.process = p;
              this.changeDetectorRef.markForCheck();
            },
            error: () => {
              this.process = null; // the process does not exist anymore
              this.changeDetectorRef.markForCheck();
            }
          })
      } else {
        this.process = null;
      }
    }
  }

  constructor(
    public helper: NetqueryHelper,
    private portapi: PortapiService,
    private dialog: SfngDialogService,
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

  openProcessDetails() {
    this.dialog.create(ProcessDetailsDialogComponent, {
      data: this.process,
      backdrop: true,
      autoclose: true,
    })
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
