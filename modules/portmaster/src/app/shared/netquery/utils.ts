import { Condition, Matcher } from "src/app/services";
import { objKeys } from "../utils";

export const connectionFieldTranslation: { [key: string]: string } = {
  domain: "Domain",
  path: "Application",
  as_owner: "Provider",
  country: "Country",
  direction: 'Direction',
  started: 'Started',
  ended: 'Ended',
  remote_ip: 'Remote IP',
  verdict: 'Verdict',
  encrypted: 'Encrypted',
  tunneled: 'Tunneled',
  internal: 'Internal'
}

export function isMatcher(v: any | Matcher): v is Matcher {
  return typeof v === 'object' && ('$eq' in v || '$ne' in v || '$like' in v || '$in' in v || '$notin' in v);
}

export function mergeConditions(cond1: Condition, cond2: Condition): Condition {
  const result: Condition = {};

  objKeys(cond1).forEach(key => {
    let val = cond1[key];
    if (Array.isArray(val)) {
      result[key] = val;
    } else {
      result[key] = [val];
    }
  })

  objKeys(cond2).forEach(key => {
    let val = cond2[key];
    if (!Array.isArray(val)) {
      val = [val]
    }

    if (!(key in result)) {
      result[key] = val;
    } else {
      result[key] = [
        ...(result[key] as any), // this must be an array here
        ...val,
      ]
    }
  })


  return result;
}
