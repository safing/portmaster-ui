import { Component, OnInit, ViewChild, isDevMode } from '@angular/core';
import { NotificationType, NotificationsService, NotificationState } from 'src/app/services';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-notication-factory',
  templateUrl: './notification-factory.html',
  styleUrls: ['./notification-factory.scss']
})
export class NotificationFactoryComponent implements OnInit {
  id = '';
  type: NotificationType = NotificationType.Info;
  message = '';
  expires = '';
  state: NotificationState = NotificationState.Active;

  @ViewChild(NgForm)
  createForm?: NgForm;

  constructor(private notifService: NotificationsService) { }

  ngOnInit(): void {
  }

  createNotification() {
    this.notifService.create(this.id, this.message, +this.type, {
      Expires: this.parseTimeSpec(this.expires),
      State: this.state,
    })
      .subscribe(
        () => {
          this.createForm?.reset();
        },
        err => {
          console.error(err);
          if (isDevMode()) {
            alert(`${err}`);
          }
        }
      );
  }

  /**
   *
   * @param value Either a datetime, the string "now" or a timestamp.
   */
  private parseTimeSpec(value: string): number | undefined {
    if (value === 'now') {
      return Math.round(Date.now() / 1000);
    }

    let ts: number;
    if (isNaN(+value)) {
      ts = new Date(value).valueOf();
    } else {
      ts = new Date(+value * 1000).valueOf();
    }

    return isNaN(ts) ? undefined : ts;
  }
}
