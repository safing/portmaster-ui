import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { CdkOverlayOrigin, ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, ElementRef, forwardRef, HostBinding, HostListener, Input, QueryList, Renderer2, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DropDownValueDirective } from './item';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.html',
  styleUrls: ['./dropdown.scss'],
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

  @ViewChild(CdkOverlayOrigin)
  trigger: CdkOverlayOrigin | null = null;

  @HostBinding('tabindex')
  readonly tabindex = 0;

  @HostBinding('attr.role')
  readonly role = 'listbox';

  value: T | null = null;
  currentItem: DropDownValueDirective | null = null;

  isOpen = false;

  scrollStrategy: ScrollStrategy;

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

  trackItem(_: number, item: DropDownValueDirective) {
    return item.value;
  }

  setDisabledState(disabled: boolean) {
    this._disabled = disabled;
    this.changeDetectorRef.markForCheck();
  }

  toggle() {
    if (!this.isOpen && this._disabled) {
      return;
    }

    this.isOpen = !this.isOpen;
    this.changeDetectorRef.markForCheck();
  }

  onOutsideClick(event: MouseEvent) {
    if (!!this.trigger) {
      const triggerEl = this.trigger.elementRef.nativeElement;

      let node = event.target;
      while (!!node) {
        if (node === triggerEl) {
          return;
        }
        node = this.renderer.parentNode(node);
      }
    }

    this.close();
  }

  constructor(
    public element: ElementRef,
    private changeDetectorRef: ChangeDetectorRef,
    private renderer: Renderer2,
    scrollOptions: ScrollStrategyOptions,
  ) {
    this.scrollStrategy = scrollOptions.close();
  }

  ngAfterViewInit(): void {
    if (!!this.value && !!this.items) {
      this.currentItem = this.items.find(item => item.value === this.value) || null;
      this.changeDetectorRef.detectChanges();
    }
  }

  close() {
    this.isOpen = false;
    this.changeDetectorRef.markForCheck();
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

  onOverlayClosed() {
    this.close();
  }
}
