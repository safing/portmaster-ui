import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { Action, getNotificationTypeString, Notification, NotificationsService, NotificationState } from '../../services';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
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
      this.state = n.State || NotificationState.Invalid;
    } else {
      this.state = NotificationState.Invalid;
    }
  }
  get notification(): Notification<any> | null {
    return this._notification;
  }
  private _notification: Notification<any> | null = null;

  @Input()
  set allowMarkdown(v: any) {
    this._markdown = coerceBooleanProperty(v);
  }
  get allowMarkdown() { return this._markdown; }
  private _markdown: boolean = false;

  @Output()
  actionExecuted: EventEmitter<Action> = new EventEmitter();

  constructor(private notifService: NotificationsService) { }

  execute(n: Notification<any>, action: Action) {
    this.notifService.execute(n, action)
      .subscribe(
        () => this.actionExecuted.next(action),
        err => console.error(err),
      )
  }
}
