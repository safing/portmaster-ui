import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, Directive, HostBinding, Input, Optional, TemplateRef } from '@angular/core';

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
export class SfngSelectValueDirective {
  @Input('sfngSelectValue')
  value: any;

  @Input('sfngSelectValueDescription')
  description = '';

  @Input('sfngSelectValueDisabled')
  set disabled(v: any) {
    this._disabled = coerceBooleanProperty(v)
  }
  get disabled() { return this._disabled }
  private _disabled = false;

  constructor(public templateRef: TemplateRef<any>) { }
}
