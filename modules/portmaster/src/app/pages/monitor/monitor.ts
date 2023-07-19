import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Database, Netquery } from '@safing/portmaster-api';
import { Subject, interval, map, merge, repeat } from 'rxjs';
import { SessionDataService } from 'src/app/services';
import { fadeInAnimation, moveInOutListAnimation } from 'src/app/shared/animations';

@Component({
  templateUrl: './monitor.html',
  styleUrls: ['../page.scss', './monitor.scss'],
  providers: [],
  animations: [fadeInAnimation, moveInOutListAnimation],
})
export class MonitorPageComponent {
  session = inject(SessionDataService);
  netquery = inject(Netquery);
  reload = new Subject<void>();
  history = inject(Netquery)
    .query({
      select: [
        {
          $min: {
            field: "started",
            as: "first_connection",
          },
        },
        {
          $count: {
            field: "*",
            as: "totalCount"
          }
        }
      ],
      databases: [Database.History]
    })
    .pipe(
      repeat({ delay: () => merge(interval(10000), this.reload) }),
      map(result => {
        if (!result.length || result[0].totalCount === 0) {
          return null
        }

        return {
          first: new Date(result[0].first_connection),
          count: result[0].totalCount,
        }
      }),
      takeUntilDestroyed()
    );

  clearHistoryData() {
    this.netquery.cleanProfileHistory([])
      .subscribe(() => {
        this.reload.next();
      })
  }
}
