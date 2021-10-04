import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[autoFocus]',
})
export class AutoFocusDirective {
  private _first = true;

  @Input('autoFocus')
  set focus(v: any) {
    // Skip the very first input change.
    if (this._first) {
      this._first = false;
      return;
    }

    if (!!v) {
      this.elementRef.nativeElement.focus();
    } else {
      this.elementRef.nativeElement.blur();
    }
  }

  constructor(private elementRef: ElementRef) { }
}
