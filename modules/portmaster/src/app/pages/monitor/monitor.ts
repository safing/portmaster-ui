import { trigger, transition, style, animate } from '@angular/animations';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { debounceTime, skipUntil, take } from 'rxjs/operators';
import { RiskLevel } from 'src/app/services';
import { PortapiService } from 'src/app/services/portapi.service';
import { ConnTracker, Profile } from 'src/app/services/connection-tracker.service';
import { fadeInAnimation } from 'src/app/shared/animations';
//import { Aggregator, Profile } from './aggregator';

@Component({
  templateUrl: './monitor.html',
  styleUrls: ['./monitor.scss'],
  providers: [],
  animations: [fadeInAnimation],
})
export class MonitorPageComponent implements OnInit, OnDestroy {
  private subscription: Subscription = Subscription.EMPTY;

  profiles: Profile[] = [];
  onSearch = new BehaviorSubject<string>('');

  loading = true;

  get selected() {
    return this.connTrack.inspected;
  }

  constructor(
    private connTrack: ConnTracker,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit() {
    this.subscription = this.route.paramMap
      .subscribe(params => {
        let id = params.get("profile");
        if (id === 'overview') {
          id = null;
        }

        this.connTrack.inspect(id);
      });

    this.connTrack.ready.pipe(take(1)).subscribe(
      () => this.loading = false
    )

    this.subscription.add(
      combineLatest([
        this.connTrack.profiles,
        this.onSearch,
        this.connTrack.ready,
      ])
        .subscribe(([p, search, _]) => {
          this.profiles = p.filter(profile => {
            return search === '' || profile.name.toLocaleLowerCase().includes(search)
          });
        })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  search(s: string) {
    this.onSearch.next(s);
  }
}
