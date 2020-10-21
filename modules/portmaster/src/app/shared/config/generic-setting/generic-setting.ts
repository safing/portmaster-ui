import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, Input, ViewChild, OnInit, OnDestroy, Output, EventEmitter, Host } from '@angular/core';
import { NgModel } from '@angular/forms';
import { EventManager } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { BaseSetting, ExternalOptionHint, SettingValueType, ConfigService, ExpertiseLevelNumber, ReleaseLevel, SecurityLevel, Setting, isDefaultValue } from 'src/app/services';
import { fadeInAnimation, fadeOutAnimation } from '../../animations';

export interface SaveSettingEvent<S extends BaseSetting<any, any> = any> {
  key: string;
  value: SettingValueType<S>;
  isDefault: boolean;
}

@Component({
  selector: 'app-generic-setting',
  templateUrl: './generic-setting.html',
  styleUrls: ['./generic-setting.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
    fadeOutAnimation
  ]
})
export class GenericSettingComponent<S extends BaseSetting<any, any>> implements OnInit, OnDestroy {
  readonly optionHint = ExternalOptionHint;
  readonly expertise = ExpertiseLevelNumber;
  readonly releaseLevel = ReleaseLevel;

  @Input()
  set disabled(v: any) {
    this._disabled = coerceBooleanProperty(v);
  }
  get disabled() {
    return this._disabled;
  }
  private _disabled: boolean = false;


  @Input()
  set lockDefaults(v: any) {
    this._lockDefaults = coerceBooleanProperty(v);
  }
  get lockDefaults() {
    return this._lockDefaults;
  }
  private _lockDefaults: boolean = false;

  @Input()
  resetLabelText = 'Reset';

  @Output()
  onSave = new EventEmitter<SaveSettingEvent<S>>();

  private save = new Subject();
  private subscription = Subscription.EMPTY;
  private wasReset = false;

  externalOptType(opt: S | null): ExternalOptionHint | null {
    return opt?.Annotations?.["safing/portbase:ui:display-hint"] || null;
  }

  @HostBinding('class.locked')
  get isLocked() {
    return (this.wasReset || !this.userConfigured) && this.lockDefaults;
  }

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
    // TODO(ppacher): calculate this only when required.
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

  /**
   * Unlock the setting if it is locked. Unlocking will
   * emit the default value to be safed for the setting.
   */
  unlock() {
    if (!this.isLocked || !this.setting) {
      return;
    }

    this.wasReset = false;
    let value = this.defaultValue;

    if (this.setting.Annotations["safing/portbase:options:stackable"]) {
      // TODO(ppacher): fix this one once string[] options can be
      // stackable
      value = [] as SettingValueType<S>;
    }

    this.updateValue(value, true);
    // update the settings value now so the UI
    // responds immediately.
    this.setting!.Value = value;
  }

  toggleLock() {
    if (this.isLocked) {
      this.unlock();
      return;
    }

    this.resetValue();
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

    this.updateActualValue();
  }
  get setting(): S | null {
    return this._setting;
  }

  /**
   * The defaultValue input allows to overwrite the default
   * value of the seting.
   */
  @Input()
  set defaultValue(val: SettingValueType<S>) {
    this._defaultValue = val;
    this.updateActualValue();
  }
  get defaultValue() {
    return this._defaultValue === null
      ? this.setting?.DefaultValue
      : this._defaultValue;
  }

  /* An optional default value overwrite */
  _defaultValue: SettingValueType<S> | null = null;

  /* Wether or not the setting has been saved */
  saved = true;

  /* The settings value, updated by the setting() setter */
  _setting: S | null = null;

  /* The currently configured value. Updated by the setting() setter */
  _currentValue: SettingValueType<S> | null = null;

  /* The currently saved value. Updated by the setting() setter */
  _savedValue: SettingValueType<S> | null = null;

  constructor(
    private configService: ConfigService,
    private changeDetectorRef: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.subscription = this.save.pipe(
      debounceTime(500),
    ).subscribe(() => this.emitSaveRequest())
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Resets the value of setting by discarding any user
   * configured values and reverting back to the default
   * value.
   */
  resetValue() {
    if (!this._setting) {
      return;
    }

    this._currentValue = this.defaultValue;
    this.wasReset = true;

    this.save.next();
  }

  /**
   * Aborts/reverts the current change to the value that's
   * already saved.
   */
  abortChange() {
    this._currentValue = this._savedValue;
  }

  private emitSaveRequest() {
    const isDefault = isDefaultValue(this._currentValue, this.defaultValue) && (!this.lockDefaults || this.wasReset);

    if (isDefault) {
      delete (this._setting!['Value']);
    } else {
      this._setting!.Value = this._currentValue;
    }

    this.wasReset = false;

    this.onSave.next({
      key: this.setting!.Key,
      isDefault: isDefault,
      value: this._setting!.Value,
    })
  }

  /**
   * Used in our view as a ngModelChange callback to
   * update the value.
   *
   * @param value The new value as emitted by the view
   */
  updateValue(value: SettingValueType<S>, save = false) {
    this._currentValue = value;

    if (save) {
      this.save.next();
    }
  }

  private updateActualValue() {
    if (!this.setting) {
      return
    }

    this.wasReset = false;

    const s = this.setting;
    const value = s.Value === undefined
      ? this.defaultValue
      : s.Value;

    this._currentValue = value;
    this._savedValue = value;
  }
}
