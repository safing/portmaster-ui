import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { delayWhen } from 'rxjs/operators';
import { ConnTracker } from 'src/app/services/connection-tracker.service';
import { fadeInAnimation, moveInOutListAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './monitor.html',
  styleUrls: ['../page.scss', './monitor.scss'],
  providers: [],
  animations: [fadeInAnimation, moveInOutListAnimation],
})
export class MonitorPageComponent implements OnInit, OnDestroy {
  /** Subscription for the route parameters */
  private subscription: Subscription = Subscription.EMPTY;

  /** @private The currently inspected (and thus selected) profile. */
  get selected() {
    return this.connTrack.inspected;
  }

  constructor(
    private connTrack: ConnTracker,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.subscription = new Subscription();

    // watch the route parameters and update the currently
    // inspected (and selected) profile.
    const routeSubscription = this.route.paramMap
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


    // make sure we perform tear-down on the above subscriptions.
    this.subscription.add(routeSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.connTrack.clearInspection();
  }

}
