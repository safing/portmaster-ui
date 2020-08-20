import { Component, OnInit, ViewChild, isDevMode } from '@angular/core';
import { NotificationType } from 'src/app/services/notifications.types';
import { NgForm } from '@angular/forms';
import { NotificationsService } from 'src/app/services/notifications.service';

@Component({
  selector: 'app-notication-factory',
  templateUrl: './notification-factory.component.html',
  styleUrls: ['./notification-factory.component.scss']
})
export class NotificationFactoryComponent implements OnInit {
  id: string = '';
  type: NotificationType = NotificationType.Info;
  message: string = '';
  created: string = '';
  expires: string = '';
  responded: string = '';
  executed: string = '';
  persistent: boolean = false;

  @ViewChild(NgForm)
  createForm?: NgForm;

  constructor(private notifService: NotificationsService) { }

  ngOnInit(): void {
  }

  createNotification() {
    this.notifService.create(this.id, this.message, +this.type, {
      Created: this.parseTimeSpec(this.created),
      Expires: this.parseTimeSpec(this.expires),
      Responded: this.parseTimeSpec(this.responded),
      Executed: this.parseTimeSpec(this.executed),
      Persistent: this.persistent,
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
    if (value === "now") {
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
