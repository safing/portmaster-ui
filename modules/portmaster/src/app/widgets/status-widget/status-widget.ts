import { Component, OnInit, Input, Inject } from '@angular/core';
import { WIDGET_CONFIG, WidgetConfig } from '../widget.types';

export interface StatusWidgetConfig {
  text: string;
}

@Component({
  templateUrl: './status-widget.html',
  styleUrls: [
    '../widget.scss',
    './status-widget.scss'
  ]
})
export class StatusWidgetComponent implements OnInit {
  constructor(
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<StatusWidgetConfig>,
  ) { }

  ngOnInit(): void {
  }

}
