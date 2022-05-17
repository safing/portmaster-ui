import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { Directive, ElementRef, Input, OnInit } from "@angular/core";

@Directive({
  selector: '[autoFocus]',
})
export class AutoFocusDirective implements OnInit {
  private _focus = true;

  @Input('autoFocus')
  set focus(v: any) {
    this._focus = coerceBooleanProperty(v) !== false;
  }

  constructor(private elementRef: ElementRef) { }

  ngOnInit(): void {
    setTimeout(() => {
      if (this._focus) {
        this.elementRef.nativeElement.focus();
      }
    }, 100)
  }
}
