import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { WidgetFactory } from '../widget.types';
import { StatusWidgetConfig } from './status-widget';

@Component({
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class StatusWidgetSettingsComponent implements OnInit, WidgetFactory<StatusWidgetConfig> {
  @Input()
  config: StatusWidgetConfig = { text: '' };

  @Output()
  onConfigChange = new EventEmitter<StatusWidgetConfig>();

  constructor() { }

  ngOnInit(): void {
    this.config = this.config || {
      text: '',
    };

    this.onConfigChange.next(this.config);
  }

  setValue(value: string) {
    if (!this.config) {
      this.config = {
        text: ''
      };
    }

    this.config.text = value;
    this.onConfigChange.next(this.config);
  }
}
