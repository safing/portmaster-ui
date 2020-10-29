import { trigger, transition, style, animate } from '@angular/animations';
import { Component, OnInit, Inject, HostBinding, ElementRef } from '@angular/core';
import { NotificationsService, NotificationType, Notification } from 'src/app/services';
import { fadeInAnimation, fadeOutAnimation } from 'src/app/shared/animations';
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
            animate('.3s .3s ease-in',
              style({ opacity: 1 }))
          ]
        ),
      ]
    )
  ]
})
export class NotificationWidgetComponent implements OnInit {
  readonly types = NotificationType;

  @HostBinding('style.minHeight')
  height: string | number = 'auto';

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

    this.expandedNotification = null;

    this.notifsService.execute(n, actionId)
      .subscribe()
  }

  toggelView(notif: Notification<any>) {
    if (this.expandedNotification === notif) {
      this.expandedNotification = null;
      this.height = 'auto';
      return;
    }

    this.height = this.elementRef.nativeElement.getBoundingClientRect().height + 'px';
    this.expandedNotification = notif;
  }
}
