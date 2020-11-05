import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { delayWhen, take } from 'rxjs/operators';
import { ConnTracker, ProcessGroup } from 'src/app/services/connection-tracker.service';
import { fadeInAnimation, moveInOutListAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './monitor.html',
  styleUrls: ['./monitor.scss'],
  providers: [],
  animations: [fadeInAnimation, moveInOutListAnimation],
})
export class MonitorPageComponent implements OnInit, OnDestroy {
  private subscription: Subscription = Subscription.EMPTY;

  profiles: ProcessGroup[] = [];
  onSearch = new BehaviorSubject<string>('');

  loading = true;

  get selected() {
    return this.connTrack.inspected;
  }

  constructor(
    private connTrack: ConnTracker,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.subscription = this.route.paramMap
      .pipe(delayWhen(() => this.connTrack.ready))
      .subscribe(params => {
        let source = params.get("source");
        let id = params.get("profile");
        if (source === 'overview') {
          source = null;
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
            return search === '' || profile.Name.toLocaleLowerCase().includes(search)
          });
        })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.connTrack.clearInspection();
  }

  search(s: string) {
    this.onSearch.next(s);
  }

  trackProfile(_: number, p: ProcessGroup) {
    return p.ID;
  }
}
