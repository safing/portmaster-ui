import { trigger, transition, style, animate } from '@angular/animations';
import { Component, OnInit, Inject, HostBinding, ElementRef, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationsService, NotificationType, Notification } from 'src/app/services';
import { WIDGET_CONFIG, WidgetConfig } from '../widget.types';

export interface NotificationWidgetConfig {
  markdown: boolean;
}

@Component({
  templateUrl: './notification-widget.html',
  styleUrls: [
    '../widget.scss',
    './notification-widget.scss'
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
    trigger(
      'moveInOut',
      [
        transition(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateX(100%)' }),
            animate('.2s ease-in',
              style({ opacity: 1, transform: 'translateX(0%)' }))
          ]
        ),
        transition(
          ':leave',
          [
            style({ opacity: 1 }),
            animate('.2s ease-out',
              style({ opacity: 0, transform: 'translateX(100%)' }))
          ]
        )
      ]
    )
  ]
})
export class NotificationWidgetComponent implements OnInit, OnDestroy {
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

  /** Used to remember the current scroll-top when expanding a notification. */
  private _prevScrollTop = 0;

  /** Subscription to notification updates. */
  private notifSub = Subscription.EMPTY;

  /** The currently expanded notification, if any. */
  expandedNotification: Notification<any> | null = null;

  /** All active notifications. */
  notifications: Notification<any>[] = [];

  constructor(
    private elementRef: ElementRef,
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<NotificationWidgetConfig>,
    public notifsService: NotificationsService,
  ) { }

  ngOnInit(): void {
    this.notifSub = this.notifsService.new$.subscribe(list => {
      this.notifications = list;
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
  execute(n: Notification<any>, actionId: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.expandedNotification === n) {
      this.toggelView(n);
    }

    this.notifsService.execute(n, actionId)
      .subscribe()
  }

  /**
   * @private
   * Toggles between list mode and notification-view mode.
   *
   * @param notif The notification that has been clicked.
   */
  toggelView(notif: Notification<any>) {
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
