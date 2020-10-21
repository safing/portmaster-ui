import { Component, OnInit, ChangeDetectionStrategy, forwardRef, HostBinding, HostListener, ChangeDetectorRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { fadeInAnimation, fadeOutAnimation } from '../../animations';

@Component({
  selector: 'app-filter-list',
  templateUrl: './filter-list.html',
  styleUrls: ['./filter-list.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FilterListComponent),
      multi: true,
    }
  ],
})
export class FilterListComponent implements OnInit, ControlValueAccessor {
  @HostBinding('tabindex')
  readonly tabindex = 0;

  @HostListener('blur')
  onBlur() {
    this.onTouch();
  }

  @Input()
  set readonly(v: any) {
    this._readonly = coerceBooleanProperty(v);
  }
  get readonly() {
    return this._readonly;
  }
  _readonly = false;

  entries: string[] = [];

  constructor(private changeDetector: ChangeDetectorRef) { }

  ngOnInit(): void {
  }

  updateValue(index: number, newValue: string) {
    // we need to make a new object copy here.
    this.entries = [
      ...this.entries,
    ];

    this.entries[index] = newValue;

    this.onChange(this.entries);
  }

  deleteEntry(index: number) {
    this.entries = [...this.entries];
    this.entries.splice(index, 1);
    this.onChange(this.entries);
  }

  addEntry() {
    // if there's already one empty entry abort
    if (this.entries.some(e => e.trim() === '')) {
      return;
    }

    this.entries = [...this.entries];
    this.entries.push('');
    this.onChange(this.entries);
  }

  writeValue(value: string[]) {
    this.entries = value;

    this.changeDetector.markForCheck();
  }

  onChange = (_: string[]): void => { };
  registerOnChange(fn: (value: string[]) => void) {
    this.onChange = fn;
  }

  onTouch = (): void => { };
  registerOnTouched(fn: () => void) {
    this.onTouch = fn;
  }

  drop(event: CdkDragDrop<string[]>) {
    if (this._readonly) {
      return;
    }

    // create a copy of the array
    this.entries = [...this.entries];
    moveItemInArray(this.entries, event.previousIndex, event.currentIndex);

    this.changeDetector.markForCheck();
    this.onChange(this.entries);
  }

  trackBy(idx: number, value: string) {
    return `${value}`;
  }
}
