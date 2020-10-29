import { ListKeyManager, ListKeyManagerOption } from '@angular/cdk/a11y';
import { coerceArray, coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, HostBinding, HostListener, Input, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfigService, IntSetting, parseSupportedValues, SecurityLevel } from 'src/app/services';

class SecuritySetting implements ListKeyManagerOption {
  constructor(
    public name: string,
    public level: SecurityLevel,
    public activeBorder = 'var(--info-green)'
  ) { }

  getLabel(): string {
    return this.name;
  }
}

@Component({
  selector: 'app-security-setting',
  templateUrl: './security-setting.html',
  styleUrls: ['./security-setting.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => SecuritySettingComponent),
    }
  ]
})
export class SecuritySettingComponent implements OnDestroy, ControlValueAccessor {
  readonly SecurityLevels = SecurityLevel;

  @HostBinding('[attr.tabindex]')
  readonly tabindex = 0;

  @HostListener('blur')
  onBlur() {
    if (this.disabled) {
      return;
    }

    this._onTouch();
  }

  @HostListener('focus')
  onFocus() {
    const current = this.getLevel();
    const active = this.availableLevels.find(lvl => lvl.level === current);
    if (!!active) {
      this._keyManager?.setActiveItem(active);
    }
  }

  @HostListener('keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (!this._keyManager) {
      return;
    }

    if (this.disabled) {
      return;
    }

    this._keyManager.onKeydown(event);
  }

  set disabled(v: any) {
    const disabled = coerceBooleanProperty(v);
    this.setDisabledState(disabled);
  }
  get disabled() {
    return this._disabled;
  }
  private _disabled: boolean = false;

  setDisabledState(v: boolean) {
    this._disabled = v;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * The security setting represented by this component.
   * Whenever the setting is changed we need to check which
   * security levels are allowed (with or with OFF) and
   * recreate a list key manager for keyboard support.
   */
  @Input()
  set setting(s: IntSetting | null) {
    let changed = false;

    if (!!s && !this._setting || s?.Key != this._setting?.Key) {
      changed = true;
    }

    this._setting = s || null;

    if (!s || changed) {
      this._keyManager = null;
      this._keySubscription.unsubscribe();
    }

    if (!!s && changed) {
      this.availableLevels = [
        new SecuritySetting('Danger', SecurityLevel.Extreme),
        new SecuritySetting('Untrusted', SecurityLevel.High),
        new SecuritySetting('Trusted', SecurityLevel.Normal),
      ];

      const values = parseSupportedValues(s);
      if (values.includes(SecurityLevel.Off)) {
        this.availableLevels.splice(0, 0, new SecuritySetting('Off', SecurityLevel.Off, 'var(--info-red)'))
      }

      this._keyManager = new ListKeyManager(this.availableLevels)
        .withHorizontalOrientation('ltr')
        .withWrap();

      this._keySubscription = this._keyManager.change.subscribe(
        idx => {
          // We update the keymanager's internal active item in onFocus
          // but we need to ignore the change event when we are disabled.
          if (this.disabled) {
            return;
          }

          this.setLevel(this.availableLevels[idx].level);
        }
      )
    }
  }
  get setting(): IntSetting | null {
    return this._setting;
  }
  private _setting: IntSetting | null = null;

  /** The currently configured security level */
  private currentValue: number = 0;

  /** called when the value changes. Set by registerOnChange */
  private _onChange: (value: number) => void = () => { };

  /** called when the input is touched. Set by registerOnTouched */
  private _onTouch: () => void = () => { };

  /** Keyboard support */
  private _keyManager: ListKeyManager<SecuritySetting> | null = null;

  /** Subscription for key manager changes */
  private _keySubscription: Subscription = Subscription.EMPTY;

  /** Available security levels for this setting */
  availableLevels: SecuritySetting[] = [];

  constructor(private configService: ConfigService,
    private changeDetectorRef: ChangeDetectorRef) { }

  ngOnDestroy() {
    this._keySubscription.unsubscribe();
  }

  /** Returns true if level is active */
  isActive(level: SecurityLevel): boolean {
    if (level === SecurityLevel.Off) {
      return this.currentValue === level;
    }
    return (this.currentValue & level) > 0
  }

  getLevel(): SecurityLevel {
    if (this.isActive(SecurityLevel.Normal)) {
      return SecurityLevel.Normal;
    }

    if (this.isActive(SecurityLevel.High)) {
      return SecurityLevel.High;
    }

    if (this.isActive(SecurityLevel.Extreme)) {
      return SecurityLevel.Extreme;
    }

    return SecurityLevel.Off;
  }

  /** Sets the new level */
  setLevel(level: SecurityLevel) {
    let newLevel: number = 0;
    switch (level) {
      case SecurityLevel.Off:
        newLevel = 0;
        break;
      case SecurityLevel.Normal:
        newLevel = 7;
        break;
      case SecurityLevel.High:
        newLevel = 6;
        break;
      case SecurityLevel.Extreme:
        newLevel = 4;
        break;
    }

    this.currentValue = newLevel;
    this._onChange(newLevel);
    this.onFocus(); // update the active item again
  }

  /** Registers an onChange function. Satisfies ControlValueAccessor */
  registerOnChange(fn: (_: number) => void) {
    this._onChange = fn;
  }

  /** Registers an onTouch function. Satisfies ControlValueAccessor */
  registerOnTouched(fn: () => void) {
    this._onTouch = fn;
  }

  /** writeValues writes a new value for the security setings. It satisfies ControlValueAccessor */
  writeValue(value: number) {
    this.currentValue = value;
    this.changeDetectorRef.markForCheck();
  }
}
