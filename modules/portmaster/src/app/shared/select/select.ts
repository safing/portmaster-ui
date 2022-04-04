import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, forwardRef, HostBinding, HostListener, Input, QueryList, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SfngDropdown } from '../dropdown/dropdown';
import { SfngSelectValueDirective } from './item';

@Component({
  selector: 'sfng-select',
  templateUrl: './select.html',
  styleUrls: ['./select.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SfngSelectComponent),
      multi: true,
    },
  ]
})
export class SfngSelectComponent<T> implements AfterViewInit, ControlValueAccessor {
  @ViewChild(SfngDropdown, { static: true })
  dropdown!: SfngDropdown;

  @ContentChildren(SfngSelectValueDirective)
  items: QueryList<SfngSelectValueDirective> | null = null;

  @HostBinding('tabindex')
  readonly tabindex = 0;

  @HostBinding('attr.role')
  readonly role = 'listbox';

  value: T | null = null;
  currentItem: SfngSelectValueDirective | null = null;

  @Input()
  @HostBinding('class.disabled')
  set disabled(v: any) {
    const disabled = coerceBooleanProperty(v);
    this.setDisabledState(disabled);
  }
  get disabled() {
    return this._disabled;
  }
  private _disabled: boolean = false;

  trackItem(_: number, item: SfngSelectValueDirective) {
    return item.value;
  }

  setDisabledState(disabled: boolean) {
    this._disabled = disabled;
    this.cdr.markForCheck();
  }

  constructor(private cdr: ChangeDetectorRef) { }

  ngAfterViewInit(): void {
    if (!!this.value && !!this.items) {
      this.currentItem = this.items.find(item => item.value === this.value) || null;
      this.cdr.detectChanges();
    }
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouch();
  }

  selectItem(item: SfngSelectValueDirective) {
    if (item.disabled) {
      return;
    }

    this.currentItem = item;
    this.value = item.value;
    this.dropdown.close();
    this.onChange(this.value!);
  }

  writeValue(value: T): void {
    this.value = value;

    if (!!this.items) {
      this.currentItem = this.items.find(item => item.value === value) || null;
    }

    this.cdr.markForCheck();
  }

  onChange = (value: T): void => { }
  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  onTouch = (): void => { }
  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }
}
