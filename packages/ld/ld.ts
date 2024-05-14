/// <reference types="urlpattern-polyfill" />
// @ts-ignore: Property 'UrlPattern' does not exist 
if (!globalThis.URLPattern) {
  await import("urlpattern-polyfill");
}

type Callback<T> = (root: T, options: { iri: string, data: any }) => void;
type Options<T extends object> = {
  fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  root: T;
};

const table = new Map()
export default function ld<T extends object>(obj: T, pattern: URLPattern, cb?: Callback<T>, options: Partial<Options<T>> = {}): T {
  if (undefined === options.root) {
    table.clear()
    options.root = obj
  }

  if (undefined === options.fetchFn) {
    options.fetchFn = (input, init) => fetch(input, init).then(res => res.json())
  }

  return new Proxy<T>(obj, {
    get: (target, prop, receiver) => {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'object' && value !== null) {
        return ld<any>(value as any, pattern, cb, options);
      }

      if (typeof value === 'string' && pattern.test(value)) {
        if (table.has(value)) {
          return table.get(value);
        }

        table.set(value, undefined);
        ; ((iri, object, callback, t) => {
          (options as Options<T>).fetchFn(iri).then(data => {
            t.set(iri, data)
            if (callback) {
              callback(object, { iri, data })
            }
          })
        })(value, ld((options as Options<T>).root, pattern, cb, options), cb, table)
        return table.get(value)
      }

      return value;
    }
  });
}
