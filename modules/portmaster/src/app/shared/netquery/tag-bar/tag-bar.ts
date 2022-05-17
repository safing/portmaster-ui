import { coerceBooleanProperty, coerceCssPixelValue } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, HostBinding, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { fadeInListAnimation } from '../../animations';

export interface SfngTagbarValue {
  key: string;
  values: string[];
}

@Component({
  selector: 'sfng-netquery-tagbar',
  templateUrl: 'tag-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
    :host {
      @apply flex flex-row gap-3 w-auto items-center text-xxs flex-wrap;
    }
    `
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SfngNetqueryTagbar),
      multi: true
    }
  ],
  animations: [
    fadeInListAnimation
  ]
})
export class SfngNetqueryTagbar implements ControlValueAccessor {
  @HostBinding('@fadeInList')
  get itemsLength() {
    return this.values?.length || 0;
  }

  /** @private the current tag bar values */
  values: SfngTagbarValue[] = [];

  /** Whether or not the user can interact with the component */
  @Input()
  set disabled(v: any) {
    this.setDisabledState(v)
  }
  get disabled() {
    return this._disabled;
  }
  private _disabled = false;

  /** Translations for the value keys */
  @Input()
  labels: { [key: string]: string } = {}

  /** The maximum width of the tag text before being truncated using left-side ellipsis */
  @Input()
  set maxTagWidth(width: any) {
    this._maxTagWidth = coerceCssPixelValue(width)
  }
  get maxTagWidth() {
    return this._maxTagWidth
  }
  private _maxTagWidth: string = '8rem'

  /** @private A {@link TrackByFunction} for {@link SfngTagbarValue} */
  trackValue(_: number, vl: SfngTagbarValue) {
    return vl.key;
  }

  /** Implements the {@link ControlValueAccessor} */
  writeValue(obj: SfngTagbarValue[]): void {
    this.values = obj;
    this.cdr.markForCheck();
  }

  /** Implements the {@link ControlValueAccessor} */
  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  /** @private - callback registered via registerOnChange */
  _onChange: (val: SfngTagbarValue[]) => void = () => { }

  /** Implements the {@link ControlValueAccessor} */
  registerOnTouched(fn: any): void {
    this._onTouched = fn
  }

  /** @private - callback registered via registerOnTouched */
  _onTouched: () => void = () => { }

  /** Implements the {@link ControlValueAccessor} */
  setDisabledState(v: any) {
    this._disabled = coerceBooleanProperty(v)
    this.cdr.markForCheck();
  }

  /**
   * remove removes the value at index from the {@link SfngTagbarValue}
   * that matches key.
   */
  remove(key: string, index: number) {
    if (this.disabled) {
      return;
    }

    let cpy: SfngTagbarValue[] = [];
    this.values.forEach(val => {
      if (val.key === key) {
        val.values = [...val.values];
        val.values.splice(index, 1)
      }
      cpy.push({
        ...val,
      })
    });

    this.values = cpy;

    this._onChange(this.values);
    this.cdr.markForCheck();
  }

  constructor(
    private cdr: ChangeDetectorRef
  ) { }
}
