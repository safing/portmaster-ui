import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, Directive, HostBinding, Input, Optional, TemplateRef } from '@angular/core';

export interface SelectOption {
  value: any;
  selected: boolean;

  label?: string;
  description?: string;
  templateRef?: TemplateRef<any>;
  disabled?: boolean;
}

@Component({
  selector: 'sfng-select-item',
  template: `<ng-content></ng-content>`,
  styleUrls: ['./item.scss'],
})
export class SfngSelectItemComponent {
  @HostBinding('class.disabled')
  get isDisabled() {
    return this.sfngSelectValue?.disabled || false;
  }

  constructor(@Optional() private sfngSelectValue: SfngSelectValueDirective) { }
}

@Directive({
  selector: '[sfngSelectValue]',
})
export class SfngSelectValueDirective implements SelectOption {
  @Input('sfngSelectValue')
  value: any;

  @Input('sfngSelectValueLabel')
  label?: string;

  @Input('sfngSelectValueDescription')
  description = '';

  @Input('sfngSelectValueDisabled')
  set disabled(v: any) {
    this._disabled = coerceBooleanProperty(v)
  }
  get disabled() { return this._disabled }
  private _disabled = false;

  /** Whether or not the item is currently selected */
  selected = false;

  constructor(public templateRef: TemplateRef<any>) { }
}
