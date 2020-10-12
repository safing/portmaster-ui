import { Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { NetworkService, Connection, ProcessContext, RiskLevel } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { Aggregator, Profile } from './aggregator';

@Component({
  templateUrl: './monitor.html',
  styleUrls: ['./monitor.scss'],
  providers: []
})
export class MonitorPageComponent implements OnInit, OnDestroy {
  private subscription: Subscription = Subscription.EMPTY;
  private aggregator: Aggregator;

  profiles: Profile[] = [];
  onSearch = new BehaviorSubject<string>('');

  selected: Profile | null = null;


  constructor(private portapi: PortapiService,
    private route: ActivatedRoute) {

    const stream = this.portapi.request('qsub', { query: 'network:' }, { forwardDone: true });
    this.aggregator = new Aggregator(stream);
  }

  ngOnInit() {
    this.aggregator.connect();

    this.subscription = combineLatest([
      this.route.paramMap,
      this.aggregator.ready,
      this.onSearch
    ])
      .pipe(debounceTime(100))
      .subscribe(([params, _, search]) => {

        search = search.toLocaleLowerCase();
        this.profiles = Object.keys(this.aggregator.profiles)
          .map(key => this.aggregator.profiles[key])
          .filter(profile => {
            return search === '' || profile.name.toLocaleLowerCase().includes(search)
          });

        const id = params.get("profile");
        if (id === null || id === 'overview') {
          this.selected = null;
          return
        }

        this.selected = this.aggregator.profiles[id];
      });

    this.subscription.add(() => this.aggregator.dispose())
  }

  getBlockStatus(p: Profile): RiskLevel {
    if (p.countPermitted === p.connections.size) {
      return RiskLevel.Low;
    }

    if (p.countPermitted === 0) {
      return RiskLevel.Medium;
    }

    return RiskLevel.Off;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  search(s: string) {
    this.onSearch.next(s);
  }
}
