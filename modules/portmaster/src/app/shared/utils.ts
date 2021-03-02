import { parse } from 'psl';

export function deepClone<T = any>(o: T | null): T {
  if (o === null) {
    return null as any as T;
  }

  let _out: T = (Array.isArray(o) ? [] : {}) as any;
  for (let _key in o) {
    let v = o[_key];
    _out[_key] = (typeof v === "object") ? deepClone(v) : v;
  }
  return _out as T;
}

export interface ParsedDomain {
  domain: string | null;
  subdomain: string | null;
}
export function parseDomain(scope: string): ParsedDomain {
  // Due to https://github.com/lupomontero/psl/issues/185
  // parse will throw an error for service-discovery lookups
  // so make sure we split them apart.
  const domainParts = scope.split(".")
  const lastUnderscorePart = domainParts.length - [...domainParts].reverse().findIndex(dom => dom.startsWith("_"))
  let result: ParsedDomain = {
    domain: null,
    subdomain: null,
  }

  let cleanedDomain = scope;
  let removedPrefix = '';
  if (lastUnderscorePart <= domainParts.length) {
    removedPrefix = domainParts.slice(0, lastUnderscorePart).join('.')
    cleanedDomain = domainParts.slice(lastUnderscorePart).join('.')
  }

  const parsed = parse(cleanedDomain);
  if ('listed' in parsed) {
    result.domain = parsed.domain || scope;
    result.subdomain = removedPrefix;
    if (!!parsed.subdomain) {
      if (removedPrefix != '') {
        result.subdomain += '.';
      }
      result.subdomain += parsed.subdomain;
    }
  }

  return result
}

export function binarySearch<T>(array: T[], what: T, compareFunc: (a: T, b: T) => number): number {
  let l = 0;
  let h = array.length - 1;
  let currentIndex: number = 0;

  while (l <= h) {
    currentIndex = (l + h) >>> 1;
    const result = compareFunc(array[currentIndex], what);
    if (result < 0) {
      l = currentIndex + 1;
    } else if (result > 0) {
      h = currentIndex - 1;
    } else {
      return currentIndex;
    }
  }
  return ~currentIndex;
}

export function binaryInsert<T>(array: T[], what: T, compareFunc: (a: T, b: T) => number, duplicate = false): number {
  let idx = binarySearch<T>(array, what, compareFunc);
  if (idx >= 0) {
    if (!duplicate) {
      return idx;
    }
  } else {
    // if `what` is not part of `array` than index is the bitwise complement
    // of the expected index in array.
    idx = ~idx;
  }
  array.splice(idx, 0, what)
  return idx;
}
