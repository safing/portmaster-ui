import { Component, OnInit, ChangeDetectionStrategy, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { fadeInAnimation, fadeOutAnimation } from '../../animations';

@Component({
  selector: 'app-filter-list-item',
  templateUrl: 'list-item.html',
  styleUrls: ['list-item.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
    fadeOutAnimation
  ]
})
export class FilterListItemComponent implements OnInit {
  @HostBinding('@fadeIn')
  @HostBinding('@fadeOut')
  readonly animation = true;

  @Input()
  set value(v: string) {
    this.updateValue(v);
    this._savedValue = this._value;
  }
  private _value = '';
  private _savedValue = '';

  @Output()
  valueChange = new EventEmitter<string>();

  @Input()
  set edit(v: any) {
    this._edit = coerceBooleanProperty(v);
  }
  get edit() {
    return this._edit;
  }
  _edit: boolean = false;

  @Input()
  set readonly(v: any) {
    this._readonly = coerceBooleanProperty(v);
  }
  get readonly() {
    return this._readonly;
  }
  _readonly: boolean = false;

  @Output()
  editChange = new EventEmitter<boolean>();

  @Output()
  delete = new EventEmitter<void>();

  isAllow = false;
  isBlock = false;
  display = '';

  get currentAction() {
    if (this.isBlock) {
      return '-';
    }
    if (this.isAllow) {
      return '+';
    }
    return '';
  }

  ngOnInit() {
    // new entries always start in edit mode
    if (!this.isAllow && !this.isBlock) {
      this._edit = true;
    }
  }

  toggleEdit() {
    if (this._edit) {
      if (this.display === '' || !(this.isAllow || this.isBlock)) {
        return;
      }

      if (this._value !== this._savedValue) {
        this.valueChange.next(this._value);
      }
    }

    this._edit = !this._edit;
    this.editChange.next(this._edit);
  }

  setAction(action: '+' | '-') {
    this.updateValue(`${action} ${this.display}`);
  }

  setEntity(entity: string) {
    const action = this.isAllow ? '+' : '-';
    this.updateValue(`${action} ${entity}`);
  }

  reset() {
    if (this._edit) {
      // if the user did not change anything we can immediately
      // delete it.
      if (this._savedValue !== '') {
        this.value = this._savedValue;
        this._edit = false;
        return;
      }
    }

    this.delete.next();
  }

  updateValue(v: string) {
    this._value = v.trim();
    switch (this._value[0]) {
      case '+':
        this.isAllow = true;
        this.isBlock = false;
        break;
      case '-':
        this.isAllow = false;
        this.isBlock = true;
        break;
      default:
        // not yet set
        this.isBlock = this.isAllow = false;
    }

    this.display = this._value.slice(1).trim();
  }
}
