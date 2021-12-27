import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, Input, ViewChild, OnInit, OnDestroy, Output, EventEmitter, Host } from '@angular/core';
import { NgModel } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { BaseSetting, ExternalOptionHint, SettingValueType, ConfigService, ExpertiseLevelNumber, ReleaseLevel, SecurityLevel, Setting, isDefaultValue, OptionType, WellKnown, QuickSetting, applyQuickSetting } from 'src/app/services';
import { fadeInAnimation, fadeOutAnimation } from '../../animations';

export interface SaveSettingEvent<S extends BaseSetting<any, any> = any> {
  key: string;
  value: SettingValueType<S>;
  isDefault: boolean;
  rejected?: (err: any) => void
}

@Component({
  selector: 'app-generic-setting',
  templateUrl: './generic-setting.html',
  exportAs: 'appGenericSetting',
  styleUrls: ['./generic-setting.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInAnimation,
    fadeOutAnimation
  ]
})
export class GenericSettingComponent<S extends BaseSetting<any, any>> implements OnInit, OnDestroy {
  //
  // Constants used in the template.
  //

  readonly optionHint = ExternalOptionHint;
  readonly expertise = ExpertiseLevelNumber;
  readonly optionType = OptionType;
  readonly releaseLevel = ReleaseLevel;
  readonly wellKnown = WellKnown;

  /**
   * Whether or not the component/setting is disabled and should
   * be read-only.
   */
  @Input()
  @HostBinding('class.disabled')
  set disabled(v: any) {
    this._disabled = coerceBooleanProperty(v);
  }
  get disabled() {
    return this._disabled;
  }
  private _disabled: boolean = false;


  /**
   * Whether or not the component should be displayed as "locked"
   * when the default value is used (that is, no 'Value' property
   * in the setting)
   */
  @Input()
  set lockDefaults(v: any) {
    this._lockDefaults = coerceBooleanProperty(v);
  }
  get lockDefaults() {
    return this._lockDefaults;
  }
  private _lockDefaults: boolean = false;

  /** The label to display in the reset-value button */
  @Input()
  resetLabelText = 'Reset';

  /** Emits an event whenever the setting should be saved. */
  @Output()
  onSave = new EventEmitter<SaveSettingEvent<S>>();

  /** Wether or not stackable values should be displayed. */
  @Input()
  set displayStackable(v: any) {
    this._displayStackable = coerceBooleanProperty(v);
  }
  get displayStackable() {
    return this._displayStackable;
  }
  private _displayStackable = false;

  /**
   * Whether or not the help text is currently shown
   */
  @Input()
  set showHelp(v: any) {
    this._showHelp = coerceBooleanProperty(v);
  }
  get showHelp() {
    return this._showHelp;
  }
  private _showHelp = false;

  /** Used internally to publish save events. */
  private save = new Subject();

  /** Used internally for subscriptions to various changes */
  private subscription = Subscription.EMPTY;

  /** Whether or not the value was reset. */
  private wasReset = false;

  /** Whether or not a save request was rejected */
  @HostBinding('class.rejected')
  get rejected() {
    return this._rejected;
  }
  private _rejected = false;

  /**
   * @private
   * Returns the external option type hint from a setting.
   *
   * @param opt The setting for with to return the external option hint
   */
  externalOptType(opt: S | null): ExternalOptionHint | null {
    return opt?.Annotations?.[WellKnown.DisplayHint] || null;
  }

  /**
   * Returns true if the setting has been touched (modified) by the user
   * since the component has been rendered.
   */
  @HostBinding('class.touched')
  get touched() {
    return this._touched;
  }
  private _touched = false;

  /**
   * Returns true if the settings is currently locked.
   */
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

    this._touched = true;
    this.wasReset = false;
    let value = this.defaultValue;

    if (this.stackable) {
      // TODO(ppacher): fix this one once string[] options can be
      // stackable
      value = [] as SettingValueType<S>;
    }

    this.updateValue(value, true);
    // update the settings value now so the UI
    // responds immediately.
    this.setting!.Value = value;
  }

  /** True if the current setting is stackable */
  get stackable() {
    return !!this.setting?.Annotations[WellKnown.Stackable];
  }

  /** Wether or not stackable values should be shown right now */
  get showStackable() {
    return this.stackable && !this.isLocked && this.displayStackable;
  }

  /**
   * @private
   * Toggle Whether or not the help text is displayed
   */
  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  /**
   * @private
   * Toggle Whether or not the setting is currently locked.
   */
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

  /* Whether or not the setting has been saved */
  saved = true;

  /* The settings value, updated by the setting() setter */
  _setting: S | null = null;

  /* The currently configured value. Updated by the setting() setter */
  _currentValue: SettingValueType<S> | null = null;

  /* The currently saved value. Updated by the setting() setter */
  _savedValue: SettingValueType<S> | null = null;

  /** Whether or not the network rating system is enabled. */
  networkRatingEnabled$ = this.configService.networkRatingEnabled$;

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
   * @private
   * Resets the value of setting by discarding any user
   * configured values and reverting back to the default
   * value.
   */
  resetValue() {
    if (!this._setting) {
      return;
    }
    this._touched = true;

    this._currentValue = this.defaultValue;
    this.wasReset = true;

    this.save.next();
  }

  /**
   * @private
   * Aborts/reverts the current change to the value that's
   * already saved.
   */
  abortChange() {
    this._currentValue = this._savedValue;
    this._touched = true;
  }

  /**
   * @private
   * Update the current value by applying a quick-setting.
   *
   * @param qs The quick-settting to apply
   */
  applyQuickSetting(qs: QuickSetting<SettingValueType<S>>) {
    if (this.disabled || this.isLocked) {
      return;
    }

    const value = applyQuickSetting(this._currentValue, qs);
    if (value === null) {
      return;
    }

    this.updateValue(value, true);
  }

  /**
   * Emits a save request to the parent component.
   */
  private emitSaveRequest() {
    const isDefault = this.wasReset;
    let value = this._setting!['Value'];

    if (isDefault) {
      delete (this._setting!['Value']);
    } else {
      this._setting!.Value = this._currentValue;
    }

    this.wasReset = false;
    this._rejected = false;

    this.onSave.next({
      key: this.setting!.Key,
      isDefault: isDefault,
      value: this._setting!.Value,
      rejected: (err: any) => {
        this._setting!['Value'] = value;
        this.changeDetectorRef.markForCheck();
        this._rejected = true;
      }
    })
  }

  /**
   * @private
   * Used in our view as a ngModelChange callback to
   * update the value.
   *
   * @param value The new value as emitted by the view
   */
  updateValue(value: SettingValueType<S>, save = false) {
    this._currentValue = value;
    this._touched = true;

    if (save) {
      this.save.next();
    }
  }

  /**
   * @private
   * A list of quick-settings available for the setting.
   * The getter makes sure to always return an array.
   */
  get quickSettings(): QuickSetting<SettingValueType<S>>[] {
    if (!this.setting || !this.setting.Annotations[WellKnown.QuickSetting]) {
      return [];
    }

    const quickSettings = this.setting.Annotations[WellKnown.QuickSetting]!;

    return Array.isArray(quickSettings)
      ? quickSettings
      : [quickSettings];
  }

  /**
   * Determine the current, actual value of the setting
   * by taking the settings Value, default Value or global
   * default into account.
   */
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
