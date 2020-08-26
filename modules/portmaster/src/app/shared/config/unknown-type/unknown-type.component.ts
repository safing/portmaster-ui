import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { Setting } from '../../../services/config.types';

@Component({
  selector: 'app-unknown-type',
  templateUrl: './unknown-type.component.html',
  styleUrls: ['./unknown-type.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnknownTypeComponent implements OnInit {
  @Input()
  setting: Setting | null = null;

  @Input()
  set value(v: any) {
    this._type = typeof v;

    if (this._type !== 'string' && this._type !== 'number') {
      this._value = JSON.stringify(v, undefined, 2);
    } else {
      this._value = v;
    }
  }
  get value(): any {
    return this._value;
  }

  _value: string = "";
  _type = '';

  constructor() { }

  ngOnInit(): void {
  }
}