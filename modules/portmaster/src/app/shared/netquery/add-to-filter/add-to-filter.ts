import { ChangeDetectorRef, Directive, HostBinding, HostListener, Input, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { NetqueryConnection } from "src/app/services";
import { NetqueryHelper } from "../connection-helper.service";

@Directive({
  selector: '[sfngAddToFilter]'
})
export class SfngNetqueryAddToFilterDirective implements OnInit, OnDestroy {
  private subscription = Subscription.EMPTY;

  @Input('sfngAddToFilter')
  key: keyof NetqueryConnection | null = null;

  @Input('sfngAddToFilterValue')
  set value(v: any | any[]) {
    if (!Array.isArray(v)) {
      v = [v]
    }
    this._values = v;
  }
  private _values: any[] = [];

  @HostListener('click', ['$event'])
  onClick(evt: MouseEvent) {
    if (!this.key) {
      return
    }

    if (!evt.shiftKey) {
      return;
    }

    evt.preventDefault();
    evt.stopPropagation();

    this.helper.addToFilter(this.key, this._values);
  }

  @HostBinding('class.border-dashed')
  @HostBinding('class.border-gray-500')
  @HostBinding('class.hover:border-gray-700')
  @HostBinding('class.hover:cursor-pointer')
  readonly _styleHost = true;

  @HostBinding('class.cursor-pointer')
  @HostBinding('class.border-b')
  @HostBinding('class.select-none')
  isShiftKeyPressed = false;

  constructor(
    private helper: NetqueryHelper,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.subscription = this.helper.onShiftKey
      .subscribe(isShiftKeyPressed => {
        if (!this.key) {
          return;
        }

        this.isShiftKeyPressed = isShiftKeyPressed;
        this.cdr.markForCheck();
      })
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
