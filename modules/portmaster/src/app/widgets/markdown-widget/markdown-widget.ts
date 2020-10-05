import { Component, OnInit, Inject } from '@angular/core';
import { WIDGET_CONFIG, WidgetConfig } from '../widget.types';

export interface MarkdownWidgetConfig {
  text: string;
}

@Component({
  templateUrl: './markdown-widget.html',
  styleUrls: [
    '../widget.scss',
    './markdown-widget.scss'
  ]
})
export class MarkdownWidgetComponent implements OnInit {
  constructor(
    @Inject(WIDGET_CONFIG) public config: WidgetConfig<MarkdownWidgetConfig>,
  ) { }

  ngOnInit(): void {
  }

}
