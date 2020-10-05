
export function deepClone<T = any>(o: T): T {
  let _out: T = (Array.isArray(o) ? [] : {}) as any;
  for (let _key in o) {
    let v = o[_key];
    _out[_key] = (typeof v === "object") ? deepClone(v) : v;
  }
  return _out as T;
}
