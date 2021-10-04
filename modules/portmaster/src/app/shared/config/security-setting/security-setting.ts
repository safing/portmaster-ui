import { ListKeyManagerOption } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, HostListener, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IntSetting, parseSupportedValues, SecurityLevel } from 'src/app/services';

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
export class SecuritySettingComponent implements ControlValueAccessor {

  set disabled(v: any) {
    const disabled = coerceBooleanProperty(v);
    this.setDisabledState(disabled);
  }
  get disabled() {
    return this._disabled;
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

    if (!!s && changed) {
      this.availableLevels = [
        new SecuritySetting('Danger', SecurityLevel.Extreme),
        new SecuritySetting('Untrusted', SecurityLevel.High),
        new SecuritySetting('Trusted', SecurityLevel.Normal),
      ];

      const values = parseSupportedValues(s);
      if (values.includes(SecurityLevel.Off)) {
        this.availableLevels.splice(0, 0, new SecuritySetting('Off', SecurityLevel.Off, 'var(--info-red)'));
      }
    }
  }
  get setting(): IntSetting | null {
    return this._setting;
  }

  constructor(private changeDetectorRef: ChangeDetectorRef) { }
  readonly SecurityLevels = SecurityLevel;
  private _disabled = false;
  private _setting: IntSetting | null = null;

  /** The currently configured security level */
  private currentValue = 0;

  /** Available security levels for this setting */
  availableLevels: SecuritySetting[] = [];

  @HostListener('blur')
  onBlur() {
    if (this.disabled) {
      return;
    }

    this._onTouch();
  }

  setDisabledState(v: boolean) {
    this._disabled = v;
    this.changeDetectorRef.markForCheck();
  }

  /** called when the value changes. Set by registerOnChange */
  private _onChange: (value: number) => void = () => { };

  /** called when the input is touched. Set by registerOnTouched */
  private _onTouch: () => void = () => { };

  /** Returns true if level is active */
  isActive(level: SecurityLevel): boolean {
    if (level === SecurityLevel.Off) {
      return this.currentValue === level;
    }
    return (this.currentValue & level) > 0;
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
    let newLevel = 0;
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
