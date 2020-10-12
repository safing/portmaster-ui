import { ChangeDetectionStrategy, Component, Input, OnDestroy } from '@angular/core';
import { combineLatest, forkJoin, Subscription } from 'rxjs';
import { Connection } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { Profile } from './aggregator';

@Component({
  selector: 'app-monitor-application',
  templateUrl: './application-view.html',
  styleUrls: ['./application-view.scss'],
})
export class MonitorApplicationViewComponent implements OnDestroy {
  private subscription = Subscription.EMPTY;
  connections: Connection[] = [];

  @Input()
  set profile(p: Profile | null) {
    this._profile = p || null;

    if (!!p) {
      this.loadConnections(Array.from(p.connections));
    }
  }
  get profile() { return this._profile }

  private _profile: Profile | null = null;

  constructor(private portapi: PortapiService) { }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private loadConnections(ids: string[]) {
    this.subscription.unsubscribe();

    const observables = ids.map(id => this.portapi.get<Connection>(id))
    this.subscription = forkJoin(observables).subscribe(
      conns => this.connections = conns,
    )
  }
}
