import { SecurityLevel } from './core.types';
import { OptionValueType } from './config.types';

export type ConfigObject = OptionValueType | { [key: string]: ConfigObject };

export interface FlatConfigObject {
  [key: string]: OptionValueType;
}

export interface AppProfile {
  ID: string;
  LinkedPath: string;
  Created: number;
  ApproxLastUsed: number;
  Config: ConfigObject;
  Description: string;
  Homepage: string;
  Icon: string;
  Name: string;
  SecurityLevel: SecurityLevel;
  Source: 'local';
}

export function flattenProfileConfig(p: ConfigObject, prefix = ''): FlatConfigObject {
  let result: FlatConfigObject = {};

  Object.keys(p).forEach(key => {
    if (isConfigObject(p[key])) {
      const childPrefix = prefix === ''
        ? p[key]
        : `${prefix}/${p[key]}`;
      const flattened = flattenProfileConfig(p[key], childPrefix);
      result = mergeObjects(result, flattened);

      return;
    }

    result[key] = p[key];
  })

  return result;
}

export function setProfileSetting(obj: ConfigObject, path: string, value: any) {
  const parts = path.split('/');
  let iter = obj;
  for (let idx = 0; idx < parts.length; idx++) {
    const propName = parts[idx];
    if (obj[propName] === undefined) {
      if (idx === parts.length - 1) {
        iter[propName] = value;
        return
      } else {
        iter[propName] = {};
      }
    }
    iter = iter[propName];
  }
}

function isConfigObject(v: any): v is ConfigObject {
  return typeof v === 'object';
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
