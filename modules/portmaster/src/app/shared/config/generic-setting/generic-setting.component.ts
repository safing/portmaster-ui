import { Component, Input, ChangeDetectionStrategy, HostBinding, ChangeDetectorRef, ViewChild } from '@angular/core';
import { BaseSetting, SettingValueType, Setting, ExternalOptionHint } from '../../../services/config.types';
import { ConfigService } from 'src/app/services/config.service';
import { NgModel } from '@angular/forms';

@Component({
  selector: 'app-generic-setting',
  templateUrl: './generic-setting.component.html',
  styleUrls: ['./generic-setting.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenericSettingComponent<S extends BaseSetting<any, any>> {
  readonly optionHint = ExternalOptionHint;

  /**
   * Returns true if the user has configured the setting on their
   * own or if the default value is being used.
   */
  @HostBinding('class.changed')
  get userConfigured() {
    return this.setting?.Value !== undefined;
  }

  /**
   * Returns true if the setting is dirty. That is, the user
   * has changed the setting in the view but it has not yet
   * been saved.
   */
  @HostBinding('class.dirty')
  get dirty() {
    if (typeof this._currentValue !== 'object') {
      return this._currentValue !== this._savedValue;
    }
    // JSON object (OptionType.StringArray) require will
    // not be the same reference so we need to compare their
    // string representations. That's a bit more costly but should
    // still be fast enough.
    return JSON.stringify(this._currentValue) !== JSON.stringify(this._savedValue)
  }

  /**
   * Returns true if the setting is pristine. That is, the
   * settings default value is used and the user has not yet
   * changed the value inside the view.
   */
  @HostBinding('class.pristine')
  get pristine() {
    return !this.dirty && !this.userConfigured
  }

  @ViewChild(NgModel, { static: false })
  model: NgModel | null = null;

  /**
   * The actual setting that should be managed.
   * The setter also updates the "currently" used
   * value (which is either user configured or
   * the default). See {@property userConfigured}.
   */
  @Input()
  set setting(s: S | null) {
    this._setting = s;
    if (!s) {
      this._currentValue = null;
      return;
    }

    const value = s.Value === undefined
      ? s.DefaultValue
      : s.Value;

    this._currentValue = value;
    this._savedValue = value;
  }
  get setting(): S | null {
    return this._setting;
  }

  /* Wether or not the setting has been saved */
  saved = true;

  /* The settings value, updated by the setting() setter */
  _setting: S | null = null;

  /* The currently configured value. Updated by the setting() setter */
  _currentValue: SettingValueType<S> | null = null;

  /* The currently saved value. Updated by the setting() setter */
  _savedValue: SettingValueType<S> | null = null;

  constructor(private configService: ConfigService,
    private changeDetectorRef: ChangeDetectorRef) { }

  /**
   * Resets the value of setting by discarding any user
   * configured values and reverting back to the default
   * value.
   */
  resetValue() {
    if (!this._setting) {
      return;
    }

    this._currentValue = this._setting.DefaultValue;
  }

  /**
   * Aborts/reverts the current change to the value that's
   * already saved.
   */
  abortChange() {
    this._currentValue = this._savedValue;
  }

  saveValue() {
    if (this._currentValue === this._setting!.DefaultValue) {
      delete (this._setting!['Value']);
    } else {
      this._setting!.Value = this._currentValue;
    }
    this.configService.save(this.setting!)
      .subscribe(
        () => {
          console.log(`saved`);
          this._savedValue = this._currentValue
          this.changeDetectorRef.markForCheck();
        },
        console.error,
      )
  }

  /**
   * Used in our view as a ngModelChange callback to
   * update the value.
   *
   * @param value The new value as emitted by the view
   */
  updateValue(value: SettingValueType<S>) {
    this._currentValue = value;
  }
}
