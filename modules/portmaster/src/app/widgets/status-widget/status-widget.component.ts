import { Component, OnInit, Input, Inject } from '@angular/core';
import { WIDGET_CONFIG, WidgetConfig } from '../widget.types';

export interface StatusWidgetConfig {
  ts: number;
}

@Component({
  selector: 'app-status-widget',
  templateUrl: './status-widget.component.html',
  styleUrls: ['./status-widget.component.scss']
})
export class StatusWidgetComponent implements OnInit {
  constructor(
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<StatusWidgetConfig>,
  ) { }

  ngOnInit(): void {
  }

}
