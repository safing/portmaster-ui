import { ListKeyManagerOption } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class SecuritySettingComponent implements ControlValueAccessor, OnChanges {
  readonly SecurityLevels = SecurityLevel;

  @HostListener('blur')
  onBlur() {
    if (this.disabled) {
      return;
    }

    this._onTouch();
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
   * Whether or not the security level switch should be
   * displayed as a simple on/off toggle. This is the case
   * when the network rating system is disabled.
   */
  @Input()
  set onOffMode(v: any) {
    this._onOffMode = coerceBooleanProperty(v);
  }
  get onOffMode() { return this._onOffMode; }
  private _onOffMode = false;

  /**
   * The security setting represented by this component.
   * Whenever the setting is changed we need to check which
   * security levels are allowed (with or with OFF) and
   * recreate a list key manager for keyboard support.
   */
  @Input()
  setting: IntSetting | null = null;

  /** The currently configured security level */
  private currentValue: number = 0;

  /** called when the value changes. Set by registerOnChange */
  private _onChange: (value: number) => void = () => { };

  /** called when the input is touched. Set by registerOnTouched */
  private _onTouch: () => void = () => { };

  /** Available security levels for this setting */
  availableLevels: SecuritySetting[] = [];

  constructor(private changeDetectorRef: ChangeDetectorRef) { }

  ngOnChanges(changes: SimpleChanges) {
    if (('setting' in changes || 'onOffMode' in changes) && !!this.setting) {
      const values = parseSupportedValues(this.setting);

      if (!this.onOffMode) {
        this.availableLevels = [
          new SecuritySetting('Danger', SecurityLevel.Extreme),
          new SecuritySetting('Untrusted', SecurityLevel.High),
          new SecuritySetting('Trusted', SecurityLevel.Normal),
        ];

        if (values.includes(SecurityLevel.Off)) {
          this.availableLevels.splice(0, 0, new SecuritySetting('Off', SecurityLevel.Off, 'var(--info-red)'))
        }
      } else {
        let defaultValue = this.getSingleLevel(this.setting.DefaultValue);
        if (defaultValue === SecurityLevel.Normal) {
          defaultValue = SecurityLevel.High;
        }

        this.availableLevels = [
          new SecuritySetting('Off', defaultValue, 'var(--info-red)'),
          new SecuritySetting('On', SecurityLevel.Normal)
        ]

        console.log(`${this.setting.Key}: on-off mode with default/off = ${SecurityLevel[defaultValue]} and current = ${this.currentValue}`)
      }
    }
  }

  /** Returns true if level is active */
  isActive(level: SecurityLevel, current = this.currentValue): boolean {
    if (this.onOffMode) {
      if (level === SecurityLevel.Normal) {
        return current === 7;
      }
      return current !== 7;
    }

    if (level === SecurityLevel.Off) {
      return current === level;
    }
    return (current & level) > 0
  }

  getLevel(): SecurityLevel {
    if (this.onOffMode) {
      if (this.currentValue === 7) {
        return SecurityLevel.Normal;
      }
      return this.availableLevels[0].level; // the default value
    }

    return this.getSingleLevel(this.currentValue);
  }

  private getSingleLevel(val: number): SecurityLevel {
    if (this.isActive(SecurityLevel.Normal, val)) {
      return SecurityLevel.Normal;
    }

    if (this.isActive(SecurityLevel.High, val)) {
      return SecurityLevel.High;
    }

    if (this.isActive(SecurityLevel.Extreme, val)) {
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

    console.log(`Setting to ${SecurityLevel[level]}, ${newLevel}`)

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
    console.log(`${this.setting?.Key}: received new current value: ${this.currentValue} which counts as ${SecurityLevel[this.getLevel()]}`)
    this.changeDetectorRef.markForCheck();
  }
}
