import { Component, OnInit, OnDestroy, Input, ChangeDetectionStrategy, Output, EventEmitter, HostBinding } from '@angular/core';
import { Notification, notificationState, NotificationState, getNotificationTypeString, NotificationsService } from '../../services';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit {
  /**
   * The host tag of the notification component has the notification type
   * and the notification state as a class name set.
   * Examples:
   *
   *    notif-action-required notif-prompt
   */
  @HostBinding('class')
  get hostClass(): string {
    let cls = `notif-${this.state}`;
    if (!!this._notification) {
      cls = `${cls} notif-${getNotificationTypeString(this._notification.Type)}`
    }
    return cls
  }

  state: NotificationState = NotificationState.Invalid;

  @Input()
  set notification(n: Notification<any> | null) {
    this._notification = n;
    if (!!n) {
      this.state = notificationState(n);
    } else {
      this.state = NotificationState.Invalid;
    }
  }
  get notification(): Notification<any> | null {
    return this._notification;
  }
  private _notification: Notification<any> | null = null;

  @Output()
  actionExecuted: EventEmitter<string> = new EventEmitter();

  constructor(private notifService: NotificationsService) { }

  ngOnInit(): void {

  }

  execute(n: Notification<any>, actionId: string) {
    this.notifService.execute(n, actionId)
      .subscribe(
        () => this.actionExecuted.next(actionId),
        err => console.error(err),
      )
  }
}
