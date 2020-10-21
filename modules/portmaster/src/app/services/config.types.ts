import { isDevMode } from '@angular/core';

/**
 * ExpertiseLevel defines all available expertise levels.
 */
export enum ExpertiseLevel {
  User = 'user',
  Expert = 'expert',
  Developer = 'developer',
}

export enum ExpertiseLevelNumber {
  user = 0,
  expert = 1,
  developer = 2
}

export function getExpertiseLevelNumber(lvl: ExpertiseLevel): ExpertiseLevelNumber {
  switch (lvl) {
    case ExpertiseLevel.User:
      return ExpertiseLevelNumber.user;
    case ExpertiseLevel.Expert:
      return ExpertiseLevelNumber.expert;
    case ExpertiseLevel.Developer:
      return ExpertiseLevelNumber.developer
  }
}

/**
 * OptionType defines the type of an option as stored in
 * the backend. Note that ExternalOptionHint may be used
 * to request a different visual representation and edit
 * menu on a per-option basis.
 */
export enum OptionType {
  String = 1,
  StringArray = 2,
  Int = 3,
  Bool = 4,
}

/**
 * Converts an option type to it's string representation.
 *
 * @param opt The option type to convert
 */
export function optionTypeName(opt: OptionType): string {
  switch (opt) {
    case OptionType.String:
      return 'string';
    case OptionType.StringArray:
      return '[]string';
    case OptionType.Int:
      return 'int'
    case OptionType.Bool:
      return 'bool'
  }
}

/** The actual type an option value can be */
export type OptionValueType = string | string[] | number | boolean;

export function isStringType(opt: OptionType, vt: OptionValueType): vt is string {
  return opt === OptionType.String;
}

export function isStringArrayType(opt: OptionType, vt: OptionValueType): vt is string[] {
  return opt === OptionType.StringArray;
}

export function isNumberType(opt: OptionType, vt: OptionValueType): vt is number {
  return opt === OptionType.Int;
}

export function isBooleanType(opt: OptionType, vt: OptionValueType): vt is boolean {
  return opt === OptionType.Bool;
}

/**
 * ReleaseLevel defines the available release and maturity
 * levels.
 */
export enum ReleaseLevel {
  Stable = 0,
  Beta = 1,
  Experimental = 2,
}

/**
 * releaseLevelName returns a string representation of the
 * release level.
 *
 * @args level The release level to convert.
 */
export function releaseLevelName(level: ReleaseLevel): string {
  switch (level) {
    case ReleaseLevel.Stable:
      return 'stable'
    case ReleaseLevel.Beta:
      return 'beta'
    case ReleaseLevel.Experimental:
      return 'experimental'
  }
}

/**
 * ExternalOptionHint tells the UI to use a different visual
 * representation and edit menu that the options value would
 * imply.
 */
export enum ExternalOptionHint {
  SecurityLevel = 'security level',
  EndpointList = 'endpoint list',
  FilterList = 'filter list',
  OneOf = 'one-of',
  OrderedList = 'ordered'
}

export interface Annotations {
  // Well known option annoations and their
  // types.
  "safing/portbase:ui:display-hint"?: ExternalOptionHint;
  "safing/portbase:ui:order"?: number;
  "safing/portbase:ui:unit"?: string;
  "safing/portbase:ui:category"?: string;
  "safing/portbase:module:subsystem"?: string;
  "safing/portbase:options:stackable"?: true;

  // Any thing else...
  [key: string]: any;
}

export interface PossilbeValue {
  /** Name is the name of the value and should be displayed */
  Name: string;
  /** Description may hold an additional description of the value */
  Description: string;
  /** Value is the actual value expected by the portmaster */
  Value: any;
}

/**
 * BaseSetting describes the general shape of a portbase config setting.
 */
export interface BaseSetting<T extends OptionValueType, O extends OptionType> {
  // Value is the value of a setting.
  Value?: T;
  // DefaultValue is the default value of a setting.
  DefaultValue: T;
  // Description is a short description.
  Description?: string;
  // ExpertiseLevel defines the required expertise level for
  // this setting to show up.
  ExpertiseLevel: ExpertiseLevelNumber;
  // Help may contain a longer help text for this option.
  Help?: string;
  // Key is the database key.
  Key: string;
  // Name is the name of the option.
  Name: string;
  // OptType is the option's basic type.
  OptType: O;
  // Annotations holds option specific annotations.
  Annotations: Annotations;
  // ReleaseLevel defines the release level of the feature
  // or settings changed by this option.
  ReleaseLevel: ReleaseLevel;
  // RequiresRestart may be set to true if the service requires
  // a restart after this option has been changed.
  RequiresRestart?: boolean;
  // ValidateRegex defines the regex used to validate this option.
  // The regex is used in Golang but is expected to be valid in
  // JavaScript as well.
  ValidationRegex?: string;
  PossibleValues?: PossilbeValue[];
}

export type IntSetting = BaseSetting<number, OptionType.Int>;
export type StringSetting = BaseSetting<string, OptionType.String>;
export type StringArraySetting = BaseSetting<string[], OptionType.StringArray>;
export type BoolSetting = BaseSetting<boolean, OptionType.Bool>;

/**
 * Parses the ValidationRegex of a setting and returns a list
 * of supported values.
 *
 * @param s The setting to extract support values from.
 */
export function parseSupportedValues<S extends Setting>(s: S): SettingValueType<S>[] {
  if (!s.ValidationRegex) {
    return [];
  }

  const values = s.ValidationRegex.match(/\w+/gmi);
  const result: SettingValueType<S>[] = [];

  let converter: (s: string) => any;

  switch (s.OptType) {
    case OptionType.Bool:
      converter = s => s === 'true';
      break;
    case OptionType.Int:
      converter = s => +s;
      break;
    case OptionType.String:
    case OptionType.StringArray:
      converter = s => s
      break
  }

  values?.forEach(val => {
    result.push(converter(val))
  });

  return result;
}

export function isDefaultValue<T extends OptionValueType>(value: T | undefined | null, defaultValue: T): boolean {
  if (value === undefined) {
    return true;
  }

  const isObject = typeof value === 'object';
  const isDefault = isObject
    ? JSON.stringify(value) === JSON.stringify(defaultValue)
    : value === defaultValue;

  return isDefault;
}

/**
 * SettingValueType is used to infer the type of a settings from it's default value.
 * Use like this:
 *
 *      validate<S extends Setting>(spec: S, value SettingValueType<S>) { ... }
 */
export type SettingValueType<S extends Setting> = S extends { DefaultValue: infer T } ? T : any;

export type Setting = IntSetting
  | StringSetting
  | StringArraySetting
  | BoolSetting;
