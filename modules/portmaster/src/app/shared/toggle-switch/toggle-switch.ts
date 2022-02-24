import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Component, OnInit, HostBinding, HostListener, ChangeDetectionStrategy, forwardRef, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle-switch',
  templateUrl: './toggle-switch.html',
  styleUrls: ['./toggle-switch.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleSwitchComponent),
      multi: true,
    }
  ]
})
export class ToggleSwitchComponent implements ControlValueAccessor {
  @HostListener('blur')
  onBlur() {
    this.onTouch();
  }

  set disabled(v: any) {
    this.setDisabledState(coerceBooleanProperty(v))
  }
  get disabled() {
    return this._disabled;
  }
  private _disabled = false;

  value: boolean = false;

  constructor(private _changeDetector: ChangeDetectorRef) { }

  setDisabledState(isDisabled: boolean) {
    this._disabled = isDisabled;
    this._changeDetector.markForCheck();
  }

  onValueChange(value: boolean) {
    this.value = value;
    this.onChange(this.value);
  }

  writeValue(value: boolean) {
    this.value = value;
    this._changeDetector.markForCheck();
  }

  onChange = (_: any): void => { };
  registerOnChange(fn: (value: any) => void) {
    this.onChange = fn;
  }

  onTouch = (): void => { };
  registerOnTouched(fn: () => void) {
    this.onTouch = fn;
  }
}
