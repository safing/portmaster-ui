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
export class ToggleSwitchComponent implements OnInit, ControlValueAccessor {
  @HostListener('blur')
  onBlur() {
    this.onTouch();
  }

  value: boolean = false;

  constructor(private _changeDetector: ChangeDetectorRef) { }

  ngOnInit(): void {
  }

  onValueChange(value: boolean) {
    console.log(`new value`, value);
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
