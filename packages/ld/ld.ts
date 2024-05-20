/// <reference types="urlpattern-polyfill" />
// @ts-ignore: Property 'UrlPattern' does not exist 
if (!globalThis.URLPattern) {
  await import("urlpattern-polyfill");
}

export type LdOptions<T extends object> = {
  fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<T>;
  root: T;
  urlPattern: URLPattern;
  relativeURIs: boolean;
  onUpdate: (root: T, options: { iri: string, data: any }) => void;
  onError: (err: unknown) => void;
} & RequestInit;

const table = new Map()

function proxyfy<T extends object>(obj: T, options: LdOptions<T>): T {
  if (undefined === options.root) {
    table.clear()
    options.root = obj
  }

  return new Proxy<T>(obj, {
    get: (target, prop, receiver) => {
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'object' && value !== null) {
        return proxyfy<any>(value as any, options);
      }

      if (typeof value !== 'string') {
        return value
      }

      // TODO: pattern matcher
      let absoluteValue = undefined
      if (!options.urlPattern.test(value)) {
        if (options.relativeURIs === false) {
          return value;
        }

        if (value[0] !== '/') {
          return value;
        }

        absoluteValue = `${options.urlPattern.protocol}://${options.urlPattern.hostname}${value}`;
        if (!options.urlPattern.test(absoluteValue)) {
          return value;
        }
      }

      if (table.has(value)) {
        return table.get(value);
      }

      table.set(value, undefined);
      ; ((iri, object, t, uri) => {
        (options as LdOptions<T>).fetchFn(uri)
          .then(data => {
            t.set(iri, data)
            if (options.onUpdate) {
              options.onUpdate(object, { iri, data })
            }
          })
          .catch((err) => options.onError(err))
      })(value, proxyfy((options as LdOptions<T>).root, options), table, absoluteValue === undefined ? value : absoluteValue)
      return table.get(value)
    }
  });
}
export default function ld<T extends object>(input: RequestInfo | URL, options: Partial<LdOptions<T>> = {}): Promise<T> {
  if (!options.urlPattern) {
    throw new Error('URL Pattern is mandatory.')
  }

  if (undefined === options.fetchFn) {
    options.fetchFn = (input, init) => fetch(input, init).then(res => res.json())
  }

  if (undefined === options.relativeURIs) {
    options.relativeURIs = true;
  }

  if (undefined === options.onError) {
    options.onError = console.error;
  }

  return options.fetchFn(input, options)
    .then((d: T) => {
      return proxyfy<T>(d, options as LdOptions<T>)
    })
}
