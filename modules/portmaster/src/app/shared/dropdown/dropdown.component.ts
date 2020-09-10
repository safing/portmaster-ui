import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, ElementRef, forwardRef, HostBinding, HostListener, QueryList } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DropDownValueDirective } from './dropdown-item.component';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true,
    },
  ]
})
export class DropdownComponent<T> implements AfterViewInit, ControlValueAccessor {
  @ContentChildren(DropDownValueDirective)
  items: QueryList<DropDownValueDirective> | null = null;

  @HostBinding('tabindex')
  readonly tabindex = 0;

  @HostBinding('attr.role')
  readonly role = 'listbox';

  value: T | null = null;
  currentItem: DropDownValueDirective | null = null;

  isOpen = false;

  trackItem(_: number, item: DropDownValueDirective) {
    return item.value;
  }

  constructor(public element: ElementRef,
    private changeDetectorRef: ChangeDetectorRef) { }

  ngAfterViewInit(): void {
    if (!!this.value && !!this.items) {
      this.currentItem = this.items.find(item => item.value === this.value) || null;
      this.changeDetectorRef.detectChanges();
    }
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouch();
  }

  selectItem(item: DropDownValueDirective) {
    this.currentItem = item;
    this.value = item.value;
    this.isOpen = false;
    this.onChange(this.value!);
  }

  writeValue(value: T): void {
    this.value = value;

    if (!!this.items) {
      this.currentItem = this.items.find(item => item.value === value) || null;
    }

    this.changeDetectorRef.markForCheck();
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
