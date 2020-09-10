import { Component, OnInit, Input, QueryList, ContentChildren, TemplateRef, forwardRef, HostListener, HostBinding, ElementRef } from '@angular/core';
import { DropDownItemComponent, DropDownValueDirective } from './dropdown-item.component';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true,
    },
  ]
})
export class DropdownComponent<T> implements OnInit, ControlValueAccessor {
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

  constructor(public element: ElementRef) { }

  ngOnInit(): void {
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
