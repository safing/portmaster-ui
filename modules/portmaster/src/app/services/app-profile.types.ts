import { SecurityLevel } from './core.types';
import { OptionValueType } from './config.types';
import { ScopeIdentifier } from './network.types';

export interface ConfigMap {
  [key: string]: ConfigObject;
}

export type ConfigObject = OptionValueType | ConfigMap;

export interface FlatConfigObject {
  [key: string]: OptionValueType;
}

export interface AppProfile {
  ID: string;
  LinkedPath: string;
  Created: number;
  ApproxLastUsed: number;
  Config: ConfigMap;
  Description: string;
  Homepage: string;
  Icon: string;
  Name: string;
  SecurityLevel: SecurityLevel;
  Source: 'local';
}

export function flattenProfileConfig(p: ConfigMap, prefix = ''): FlatConfigObject {
  let result: FlatConfigObject = {};

  Object.keys(p).forEach(key => {
    const childPrefix = prefix === ''
      ? key
      : `${prefix}/${key}`;

    const prop = p[key];

    if (isConfigMap(prop)) {
      const flattened = flattenProfileConfig(prop, childPrefix);
      result = mergeObjects(result, flattened);
      return;
    }

    result[childPrefix] = prop;
  })

  return result;
}

export function getAppSetting<T extends OptionValueType>(obj: ConfigMap, path: string): T | null {
  const parts = path.split('/');

  let iter = obj;
  for (let idx = 0; idx < parts.length; idx++) {
    const propName = parts[idx];

    if (iter[propName] === undefined) {
      return null;
    }

    const value = iter[propName];
    if (idx === parts.length - 1) {
      return value as T;
    }

    if (!isConfigMap(value)) {
      return null;
    }

    iter = value;

  }
  return null;
}

export function setAppSetting(obj: ConfigObject, path: string, value: any) {
  const parts = path.split('/');
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return;
  }

  let iter = obj;
  for (let idx = 0; idx < parts.length; idx++) {
    const propName = parts[idx];

    if (idx === parts.length - 1) {
      if (value === undefined) {
        delete (iter[propName])
      } else {
        iter[propName] = value;
      }
      return
    }

    if (iter[propName] === undefined) {
      iter[propName] = {};
    }

    iter = iter[propName] as ConfigMap;
  }
}

function isConfigMap(v: any): v is ConfigMap {
  return typeof v === 'object' && !Array.isArray(v);
}

function mergeObjects(a: FlatConfigObject, b: FlatConfigObject): FlatConfigObject {
  var res: FlatConfigObject = {};
  Object.keys(a).forEach(key => {
    res[key] = a[key];
  });
  Object.keys(b).forEach(key => {
    res[key] = b[key];
  })
  return res;
}
