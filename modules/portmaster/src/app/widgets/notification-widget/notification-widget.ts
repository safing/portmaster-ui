import { trigger, transition, style, animate } from '@angular/animations';
import { Component, OnInit, Inject, HostBinding, ElementRef } from '@angular/core';
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
export class NotificationWidgetComponent implements OnInit {
  readonly types = NotificationType;

  @HostBinding('style.height')
  height: null | string = null;

  @HostBinding('style.overflow')
  get overflow() {
    if (this.height === null) {
      return null;
    }
    return 'hidden';
  }

  private _prevScrollTop = 0;
  expandedNotification: Notification<any> | null = null;

  constructor(
    private elementRef: ElementRef,
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<NotificationWidgetConfig>,
    public notifsService: NotificationsService,
  ) { }

  ngOnInit(): void {
  }

  execute(n: Notification<any>, actionId: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.expandedNotification === n) {
      this.toggelView(n);
    }

    this.notifsService.execute(n, actionId)
      .subscribe()
  }

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
