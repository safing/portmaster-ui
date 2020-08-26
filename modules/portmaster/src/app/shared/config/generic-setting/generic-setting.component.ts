import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Setting } from '../../../services/config.types';

@Component({
  selector: 'app-generic-setting',
  templateUrl: './generic-setting.component.html',
  styleUrls: ['./generic-setting.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericSettingComponent {
  @Input()
  set setting(s: Setting | null) {
    this._setting = s;
    if (!!s) {
      this._currentValue = s.Value === undefined
        ?  s.DefaultValue
        : s.Value;

      console.log(`Value is `, this._currentValue);
    }
  }
  get setting(): Setting  | null {
    return this._setting;
  }

  _setting: Setting | null = null;
  _currentValue: Setting extends { DefaultValue: infer T } ? (T|null) : any = null;

  constructor() { }
}
