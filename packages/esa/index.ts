/// <reference types="urlpattern-polyfill" />
// @ts-ignore: Property 'UrlPattern' does not exist 
if (!globalThis.URLPattern) {
  await import("urlpattern-polyfill");
}


type Options<T extends object> = {
  fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  callback?: (root: T, options: { iri: string, data: any }) => void;
  root: T;
};

const table = new Map()
export default function esa<T extends object>(obj: T, pattern: URLPattern, options: Partial<Options<T>> = {}): T {
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
        return esa<any>(value as any, pattern, options);
      }

      if (typeof value === 'string' && pattern.test(value)) {
        if (table.has(value)) {
          return table.get(value);
        }

        table.set(value, undefined);
        ; ((iri, object, cb, t) => {
          (options as Options<T>).fetchFn(iri).then(data => {
            t.set(iri, data)
            if (cb) {
              cb(object, { iri, data })
            }
          })
        })(value, esa((options as Options<T>).root, pattern, options), options.callback, table)
        return table.get(value)
      }

      return value;
    }
  });
}
