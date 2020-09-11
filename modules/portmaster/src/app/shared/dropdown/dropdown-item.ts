import { Component, Input, ViewChild, TemplateRef, Directive } from '@angular/core';

@Component({
  selector: 'app-dropdown-item',
  template: `<ng-content></ng-content>`,
})
export class DropDownItemComponent {
}

@Directive({
  selector: '[dropDownValue]',
})
export class DropDownValueDirective {
  @Input('dropDownValue')
  value: any;

  constructor(public templateRef: TemplateRef<any>) { }
}
