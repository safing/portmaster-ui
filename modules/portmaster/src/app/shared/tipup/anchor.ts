import { Directive, ElementRef, HostBinding, Input, isDevMode } from '@angular/core';
import { TipupPlacement } from './utils';

@Directive({
  selector: '[tipUpAnchor]',
})
export class TipUpAnchorDirective implements TipupPlacement {
  constructor(
    public readonly elementRef: ElementRef,
  ) { }

  origin: 'left' | 'right' = 'right';
  offset = 10;

  @HostBinding('class.active-tipup-anchor')
  isActiveAnchor = false;

  @Input('tipUpAnchor')
  set position(posSpec: string) {
    const parts = (posSpec || '').split(';');
    if (parts.length > 2) {
      if (isDevMode()) {
        throw new Error(`Invalid value "${posSpec}" for [tipUpAnchor]`);
      }
      return;
    }

    if (parts[0] === 'left') {
      this.origin = 'left';
    } else {
      this.origin = 'right';
    }

    if (parts.length === 2) {
      this.offset = +parts[1];
      if (isNaN(this.offset)) {
        this.offset = 10;
      }
    } else {
      this.offset = 10;
    }
  }
}
