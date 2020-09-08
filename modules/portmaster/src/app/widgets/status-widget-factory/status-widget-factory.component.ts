import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { WidgetFactory } from '../widget.types';
import { StatusWidgetConfig } from '../status-widget/status-widget.component';

@Component({
  selector: 'app-status-widget-factory',
  templateUrl: './status-widget-factory.component.html',
  styleUrls: ['./status-widget-factory.component.scss']
})
export class StatusWidgetFactoryComponent implements OnInit, WidgetFactory<StatusWidgetConfig> {
  @Input()
  config: StatusWidgetConfig = { text: '' };

  @Output()
  onConfigChange = new EventEmitter<StatusWidgetConfig>();

  constructor() { }

  ngOnInit(): void {
    this.config = this.config || {
      text: '',
    };

    this.onConfigChange.next(this.config)
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
