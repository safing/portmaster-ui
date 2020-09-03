import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, Input, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NgModel, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { BaseSetting, ExternalOptionHint, parseSupportedValues, SettingValueType } from 'src/app/services';

@Component({
  selector: 'app-basic-setting',
  templateUrl: './basic-setting.component.html',
  styleUrls: ['./basic-setting.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => BasicSettingComponent),
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: forwardRef(() => BasicSettingComponent),
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BasicSettingComponent<S extends BaseSetting<any, any>> implements ControlValueAccessor, OnInit, Validator {
  readonly optionHints = ExternalOptionHint;
  readonly parseSupportedValues = parseSupportedValues;

  @Input()
  setting: S | null = null;

  @ViewChild(NgModel)
  model: NgModel | null = null;

  /**
   * Holds the value as it is presented to the user.
   * That is, a JSON encoded object or array is dumped as a
   * JSON string. Strings, numbers and booleans are presented
   * as they are.
   */
  _value: string | number | boolean = "";

  /**
   * Describes the type of the original settings value
   * as passed to writeValue().
   * This may be anything that can be returned from `typeof v`.
   * If set to "string", "number" or "boolean" then _value is emitted
   * as it is.
   * If it's set anything else (like "object") than _value is JSON.parse`d
   * before being emitted.
   */
  _type: string = '';

  /* Returns true if the current _type and _value is managed as JSON */
  get isJSON(): boolean {
    return this._type !== 'string'
      && this._type !== 'number'
      && this._type !== 'boolean'
  }

  /* _onChange is set using registerOnChange by @angular/forms
   * and satisfies the ControlValueAccessor.
   */
  _onChange: (_: SettingValueType<S>) => void = () => { };

  /* _onTouch is set using registerOnTouched by @angular/forms
   * and satisfies the ControlValueAccessor.
   */
  _onTouch: () => void = () => { };

  _onValidatorChange: () => void = () => { };

  /* Wether or not the input field is disabled. Set by setDisabledState
   * from @angular/forms
   */
  _disabled: boolean = false;
  private _valid: boolean = true;

  // We are using ChangeDetectionStrategy.OnPush so angular does not
  // update ourself when writeValue or setDisabledState is called.
  // Using the changeDetectorRef we can take care of that ourself.
  constructor(private _changeDetectorRef: ChangeDetectorRef) { }

  ngOnInit() {

  }

  /**
   * Sets the user-presented value and emits a change.
   * Used by our view. Not meant to be used from outside!
   * Use writeValue instead.
   * @private
   *
   * @param value The value to set
   */
  setInternalValue(value: string | number | boolean) {
    let toEmit: any = value;
    try {
      if (!this.isJSON) {
        toEmit = value;
      } else {
        toEmit = JSON.parse(value as string);
      }
    } catch (err) {
      this._valid = false;
      this._onValidatorChange();
      return;
    }

    this._valid = true;
    this._value = value;
    this._onChange(toEmit);
  }

  /**
   * Validates if "value" matches the settings requirements.
   * It satisfies the NG_VALIDATORS interface and validates the
   * value for THIS component.
   *
   * @param param0 The AbstractControl to validate
   */
  validate({ value }: AbstractControl): ValidationErrors | null {
    if (!this._valid) {
      return {
        jsonParseError: true
      }
    }

    if (this._type === 'string' || value === null) {
      if (!!this.setting?.DefaultValue && !value) {
        return {
          required: true,
        }
      }
    }

    if (!!this.setting?.ValidationRegex) {
      const re = new RegExp(this.setting.ValidationRegex);

      if (!this.isJSON) {
        if (!re.test(`${value}`)) {
          return {
            pattern: `"${value}"`
          }
        }
      } else {
        if (!Array.isArray(value)) {
          return {
            invalidType: true
          }
        }
        const invalidLines = value.filter(v => !re.test(v));
        if (invalidLines.length) {
          return {
            pattern: invalidLines
          }
        }
      }
    }

    return null;
  }

  /**
   * Writes a new value and satisfies the ControlValueAccessor
   *
   * @param v The new value to write
   */
  writeValue(v: SettingValueType<S>) {
    let t = typeof v;
    this._type = t;

    if (this.isJSON) {
      this._value = JSON.stringify(v, undefined, 2);
    } else {
      this._value = v;
    }

    this._changeDetectorRef.markForCheck();
  }

  registerOnValidatorChange(fn: () => void) {
    this._onValidatorChange = fn;
  }

  /**
   * Registers the onChange function requred by the
   * ControlValueAccessor
   *
   * @param fn The fn to register
   */
  registerOnChange(fn: (_: SettingValueType<S>) => void) {
    this._onChange = fn;
  }

  /**
   * Registers the onTouch function requred by the
   * ControlValueAccessor
   *
   * @param fn The fn to register
   */
  registerOnTouched(fn: () => void) {
    this._onTouch = fn;
  }

  /**
   * Enable or disable the component. Required for the
   * ControlValueAccessor.
   *
   * @param disable Whether or not the component is disabled
   */
  setDisabledState(disable: boolean) {
    this._disabled = disable;
    this._changeDetectorRef.markForCheck();
  }

  lineCount(value: string | number | boolean) {
    if (typeof value === 'string') {
      return value.split('\n').length
    }
    return 1
  }
}
