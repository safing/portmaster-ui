import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { WidgetFactory } from '../widget.types';
import { NotificationWidgetConfig } from './notification-widget';

@Component({
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class NotificationWidgetSettingsComponent implements OnInit, WidgetFactory<NotificationWidgetConfig> {
  @Input()
  config: NotificationWidgetConfig = {
    markdown: true,
  };

  @Output()
  onConfigChange = new EventEmitter<NotificationWidgetConfig>();

  constructor() { }

  ngOnInit(): void {
    this.config = this.config || {
      text: '',
    };

    this.onConfigChange.next(this.config)
  }

  update() {
    this.onConfigChange.next(this.config);
  }
}
