import { ListKeyManager, ListKeyManagerOption } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, HostBinding, HostListener, Input, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfigService, IntSetting, parseSupportedValues, SecurityLevel } from 'src/app/services';

class SecuritySetting implements ListKeyManagerOption {
  constructor(
    public name: string,
    public level: SecurityLevel
  ) { }

  getLabel(): string {
    return this.name;
  }
}

@Component({
  selector: 'app-security-setting',
  templateUrl: './security-setting.component.html',
  styleUrls: ['./security-setting.component.scss'],
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
    this.activeItem = '';
    this._onTouch();
  }

  @HostListener('focus')
  onFocus() {
    const active = this.availableLevels.find(lvl => this.isActive(lvl.level));
    if (!!active) {
      console.log(`setting active`, active)
      this._keyManager?.setActiveItem(active);
      this.activeItem = active.name;
    }
  }

  @HostListener('keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    console.log(`key`);
    if (!this._keyManager) {
      return;
    }

    if (event.code === 'Enter') {
      const activeItem = this.availableLevels.find(lvl => lvl.name === this.activeItem);
      if (!!activeItem) {
        this.setLevel(activeItem.level);
      }
    } else {
      this._keyManager.onKeydown(event);
    }
  }

  /**
   * The security setting represented by this component.
   * Whenever the setting is changed we need to check which
   * security levels are allowed (with or with OFF) and
   * recreate a list key manager for keyboard support.
   */
  @Input()
  set setting(s: IntSetting | null) {
    this._setting = s || null;

    this._keyManager = null;
    this._keySubscription.unsubscribe();

    if (!!s) {
      this.availableLevels = [
        new SecuritySetting('Normal', SecurityLevel.Normal),
        new SecuritySetting('High', SecurityLevel.High),
        new SecuritySetting('Extreme', SecurityLevel.Extreme),
      ];

      const values = parseSupportedValues(s);
      if (values.includes(SecurityLevel.Off)) {
        this.availableLevels.push(new SecuritySetting('Off', SecurityLevel.Off))
      }

      this._keyManager = new ListKeyManager(this.availableLevels)
        .withHorizontalOrientation('ltr')
        .withWrap();

      this._keySubscription = this._keyManager.change.subscribe(
        idx => this.activeItem = this.availableLevels[idx].name
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

  /** the currently focused item (via key-manager) */
  activeItem: string = '';

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
