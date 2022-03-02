import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, Directive, HostBinding, Input, Optional, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-dropdown-item',
  template: `<ng-content></ng-content>`,
  styleUrls: ['./item.scss'],
})
export class DropDownItemComponent {
  @HostBinding('class.disabled')
  get isDisabled() {
    return this.dropDownValue?.disabled || false;
  }

  constructor(@Optional() private dropDownValue: DropDownValueDirective) {}
}

@Directive({
  selector: '[dropDownValue]',
})
export class DropDownValueDirective {
  @Input('dropDownValue')
  value: any;

  @Input('dropDownValueDescription')
  description = '';

  @Input('dropDownValueDisabled')
  set disabled(v: any) {
    this._disabled = coerceBooleanProperty(v)
  }
  get disabled() { return this._disabled }
  private _disabled = false;

  constructor(public templateRef: TemplateRef<any>) { }
}
