import { Component, OnInit } from '@angular/core';
import { StatusService, NotificationsService, Notification, CoreStatus, Subsystem, getOnlineStatusString } from 'src/app/services';
import { delay } from 'rxjs/operators';

/**
 * Extends the CoreStatus to add string values for all those enums.
 */
interface ExtendedCoreStatus extends CoreStatus {
  online: string;
}

@Component({
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  status: ExtendedCoreStatus | null = null;
  notifications: Notification<any>[] = [];
  subsystems: Subsystem[] = [];
  subsysDetails: Subsystem | null = null;

  constructor(
    public statusService: StatusService,
    public notifService: NotificationsService,
  ) { }

  ngOnInit(): void {
    this.notifService.watchAll().subscribe(
      (notifs) => this.notifications = notifs
    );

    this.statusService.watchSubsystems()
      .subscribe(subsys => this.subsystems = subsys);

    this.statusService.status$
      .pipe(delay(100)) // for testing
      .subscribe(
        status => {
          console.log(status);
          this.status = {
            ...status,
            online: getOnlineStatusString(status.OnlineStatus),
          }
        }
      )
  }

}
