import { Component, OnInit, Inject } from '@angular/core';
import { NotificationsService } from 'src/app/services';
import { WIDGET_CONFIG, WidgetConfig } from '../widget.types';

export interface NotificationWidgetConfig {
  markdown: boolean;
}

@Component({
  templateUrl: './notification-widget.html',
  styleUrls: [
    '../widget.scss',
    './notification-widget.scss'
  ]
})
export class NotificationWidgetComponent implements OnInit {

  constructor(
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<NotificationWidgetConfig>,
    public notifsService: NotificationsService,
  ) { }

  ngOnInit(): void {
  }

}
