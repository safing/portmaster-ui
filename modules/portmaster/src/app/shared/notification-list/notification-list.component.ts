import { animate, style, transition, trigger } from '@angular/animations';
import { Component, ElementRef, HostBinding, OnDestroy, OnInit, TrackByFunction } from '@angular/core';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Action, Notification, NotificationsService, NotificationType } from 'src/app/services';
import { moveInOutAnimation, moveInOutListAnimation } from 'src/app/shared/animations';

export interface NotificationWidgetConfig {
  markdown: boolean;
}

interface _Notification<T = any> extends Notification<T> {
  isBroadcast: boolean
}

@Component({
  selector: 'sfng-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: [
    './notification-list.component.scss'
  ],
  animations: [
    trigger(
      'fadeIn',
      [
        transition(
          ':enter',
          [
            style({ opacity: 0 }),
            animate('.2s .2s ease-in',
              style({ opacity: 1 }))
          ]
        ),
      ]
    ),
    moveInOutAnimation,
    moveInOutListAnimation
  ]
})
export class NotificationListComponent implements OnInit, OnDestroy {
  readonly types = NotificationType;

  /** Used to set a fixed height when a notification is expanded. */
  @HostBinding('style.height')
  height: null | string = null;

  /** Sets the overflow to hidden when a notification is expanded. */
  @HostBinding('style.overflow')
  get overflow() {
    if (this.height === null) {
      return null;
    }
    return 'hidden';
  }

  @HostBinding('class.empty')
  get isEmpty() {
    return this.notifications.length === 0;
  }

  @HostBinding('@moveInOutList')
  get length() { return this.notifications.length }

  /** Used to remember the current scroll-top when expanding a notification. */
  private _prevScrollTop = 0;

  /** Subscription to notification updates. */
  private notifSub = Subscription.EMPTY;

  /** The currently expanded notification, if any. */
  expandedNotification: _Notification<any> | null = null;

  /** All active notifications. */
  notifications: _Notification<any>[] = [];

  trackBy: TrackByFunction<_Notification> = this.notifsService.trackBy;

  constructor(
    public elementRef: ElementRef,
    public notifsService: NotificationsService,
  ) { }

  ngOnInit(): void {
    this.notifSub = this.notifsService
      .new$
      .pipe(
        // filter out any prompts as they are handled by a different widget.
        map(notifs =>
          notifs.filter(notif => !(notif.Type === NotificationType.Prompt && notif.EventID.startsWith("filter:prompt"))))
      )
      .subscribe(list => {
        this.notifications = list.map(notification => {
          return {
            ...notification,
            isBroadcast: notification.EventID.startsWith("broadcasts:"),
          }
        });
        if (!!this.expandedNotification) {
          this.expandedNotification = this.notifications.find(notif => notif.EventID === this.expandedNotification?.EventID) || null;
        }
      });
  }

  ngOnDestroy() {
    this.notifSub.unsubscribe();
  }

  /**
   * @private
   *
   * Executes a notification action and updates the "expanded-notification"
   * view if required.
   *
   * @param n  The notification object.
   * @param actionId  The ID of the action to execute.
   * @param event The mouse click event.
   */
  execute(n: _Notification<any>, action: Action, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.expandedNotification === n) {
      this.toggelView(n);
    }

    this.notifsService.execute(n, action)
      .subscribe()
  }

  /**
   * @private
   * Toggles between list mode and notification-view mode.
   *
   * @param notif The notification that has been clicked.
   */
  toggelView(notif: _Notification<any>) {
    if (this.expandedNotification === notif) {
      this.expandedNotification = null;
      this.elementRef.nativeElement.scrollTop = this._prevScrollTop;
      this._prevScrollTop = 0;
      this.height = null;
      return;
    }

    this._prevScrollTop = this.elementRef.nativeElement.scrollTop;
    this.elementRef.nativeElement.scrollTop = 0;

    this.height = this.elementRef.nativeElement.getBoundingClientRect().height + 'px';
    this.expandedNotification = notif;
  }
}
