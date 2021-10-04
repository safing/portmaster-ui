import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { WidgetFactory } from '../widget.types';
import { MarkdownWidgetConfig } from './markdown-widget';

@Component({
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class MarkdownWidgetSettingsComponent implements OnInit, WidgetFactory<MarkdownWidgetConfig> {
  @Input()
  config: MarkdownWidgetConfig = { text: '' };

  @Output()
  onConfigChange = new EventEmitter<MarkdownWidgetConfig>();

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
