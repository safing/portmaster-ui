import { coerceBooleanProperty, coerceNumberProperty } from '@angular/cdk/coercion';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, EventEmitter, forwardRef, HostBinding, HostListener, Input, OnDestroy, Output, QueryList, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { startWith, takeUntil } from 'rxjs/operators';
import { SfngDropdown } from '../dropdown/dropdown';
import { SfngSelectValueDirective } from './item';


type SelectModes = 'single' | 'multi';
type ModeInput = {
  mode: SelectModes;
}
type SelectValue<T, S extends ModeInput> = S['mode'] extends 'single' ? T : T[];

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
export class SfngSelectComponent<T> implements AfterViewInit, ControlValueAccessor, OnDestroy {
  /** emits the search text entered by the user */
  private search$ = new BehaviorSubject('');

  /** emits and completes when the component is destroyed. */
  private destroy$ = new Subject<void>();

  @ViewChild(SfngDropdown, { static: true })
  dropdown!: SfngDropdown;

  @ContentChildren(SfngSelectValueDirective)
  allItems: QueryList<SfngSelectValueDirective> | null = null;

  /** The acutally rendered list of items after applying search and item threshold */
  items: SfngSelectValueDirective[] = [];

  @HostBinding('tabindex')
  readonly tabindex = 0;

  @HostBinding('attr.role')
  readonly role = 'listbox';

  value?: SelectValue<T, this>;

  currentItems: SfngSelectValueDirective[] = [];

  /** The current search text. Used by ngModel */
  searchText = '';

  /** Whether or not the select operates in "single" or "multi" mode */
  @Input()
  mode: SelectModes = 'single';

  /** The placehodler to show when nothing is selected */
  @Input()
  placeholder = 'Select'

  /** The type of item to show in multi mode when more than one value is selected */
  @Input()
  itemName = '';

  /** The maximum number of items to render. */
  @Input()
  set itemLimit(v: any) {
    this._maxItemLimit = coerceNumberProperty(v)
  }
  get itemLimit(): number { return this._maxItemLimit }
  private _maxItemLimit = Infinity;

  /** The placeholder text for the search bar */
  @Input()
  searchPlaceholder = '';

  /** Whether or not the search bar is visible */
  @Input()
  set allowSearch(v: any) {
    this._allowSearch = coerceBooleanProperty(v);
  }
  get allowSearch(): boolean {
    return this._allowSearch;
  }
  private _allowSearch = false;

  /** The minimum number of items required for the search bar to be visible */
  @Input()
  set searchItemThreshold(v: any) {
    this._searchItemThreshold = coerceNumberProperty(v);
  }
  get searchItemThreshold(): number {
    return this._searchItemThreshold;
  }
  private _searchItemThreshold = 0;

  /** The minimum-width of the drop-down. See {@link SfngDropdown.minWidth} */
  @Input()
  minWidth: any;

  /** The minimum-width of the drop-down. See {@link SfngDropdown.minHeight} */
  @Input()
  minHeight: any;

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

  @Output()
  onClose = new EventEmitter();

  @Output()
  onOpen = new EventEmitter();

  trackItem(_: number, item: SfngSelectValueDirective) {
    return item.value;
  }

  setDisabledState(disabled: boolean) {
    this._disabled = disabled;
    this.cdr.markForCheck();
  }

  constructor(private cdr: ChangeDetectorRef) { }

  ngAfterViewInit(): void {
    combineLatest([
      this.allItems!.changes
        .pipe(startWith(undefined)),
      this.search$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([_, search]) => {
          search = (search || '').toLocaleLowerCase()
          let items: SfngSelectValueDirective[] = [];
          if (search === '') {
            items = this.allItems!.toArray()
          } else {
            items = this.allItems!.filter(item => {
              if (!!item.value && typeof item.value === 'string') {
                if (item.value.includes(search)) {
                  return true;
                }
              }

              if (!!item.label) {
                if (item.label.includes(search)) {
                  return true
                }
              }
              return false;
            })
          }

          this.items = items.slice(0, this._maxItemLimit);

          this.updateCurrentItems();
          this.cdr.detectChanges();
        }
      );

  }

  ngOnDestroy(): void {
    this.search$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouch();
  }

  /** @private - called when the internal dropdown opens */
  onDropdownOpen() {
    // emit the open event on this component as well
    this.onOpen.next();

    // reset the search. We do that onOpen instead of onClose
    // to avoid flickering when the component height increases
    // during the "close" animation
    this.onSearch('');

  }

  /** @private - called when the internal dropdown closes */
  onDropdownClose() {
    this.onClose.next();
  }

  onSearch(text: string) {
    this.searchText = text;
    this.search$.next(text);
  }

  selectItem(item: SfngSelectValueDirective) {
    if (item.disabled) {
      return;
    }

    const isSelected = this.currentItems.findIndex(selected => item.value === selected.value);
    if (isSelected === -1) {
      if (this.mode === 'single') {
        this.currentItems.forEach(i => i.selected = false);
        this.currentItems = [item];
        this.value = item.value;
      } else {
        item.selected = true;
        this.currentItems.push(item);
        // TODO(ppacher): somehow typescript does not correctly pick up
        // the type of this.value here although it can be infered from the
        // mode === 'single' check above.
        this.value = [
          ...(this.value || []) as any,
          item.value,
        ] as any
      }
    } else if (this.mode !== 'single') { // "unselecting" a value is not allowed in single mode
      this.currentItems.splice(isSelected, 1)
      item.selected = false;
      // same note about typescript as above.
      this.value = (this.value as T[]).filter(val => val !== item.value) as any;
    }

    // only close the drop down in single mode. In multi-mode
    // we keep it open as the user might want to select an additional
    // item as well.
    if (this.mode === 'single') {
      this.dropdown.close();
    }
    this.onChange(this.value!);
  }

  private updateCurrentItems() {
    let values: T[] = [];
    if (this.mode === 'single') {
      values = [this.value as T];
    } else {
      values = (this.value as T[]) || [];
    }

    this.allItems?.forEach(item => item.selected = false);
    this.currentItems = values
      .map(val => this.allItems?.find(item => item.value === val))
      .filter(val => !!val)
      .map(item => {
        item!.selected = true;
        return item;
      }) as SfngSelectValueDirective[]
  }

  writeValue(value: SelectValue<T, this>): void {
    this.value = value;

    if (!!this.allItems) {
      this.updateCurrentItems();
    }

    this.cdr.markForCheck();
  }

  onChange = (value: SelectValue<T, this>): void => { }
  registerOnChange(fn: (value: SelectValue<T, this>) => void): void {
    this.onChange = fn;
  }

  onTouch = (): void => { }
  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }
}
