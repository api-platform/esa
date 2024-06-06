/// <reference types="urlpattern-polyfill" />
export type LdOptions<T extends object> = {
  fetchFn: (input: RequestInfo | URL, init?: RequestInit) => Promise<T>;
  root: T;
  urlPattern: URLPattern;
  relativeURIs: boolean;
  onUpdate: (root: T, options: { iri: string, data: object }) => void;
  onError: (err: unknown) => void;
} & RequestInit;

type TableMap<T> = Map<string, T | undefined>;

export const resources: TableMap<unknown> = new Map()

function proxify<T extends object>(obj: T, options: LdOptions<T>): T {
  if (undefined === options.root) {
    resources.clear()
    options.root = obj
  }

  return new Proxy<T>(obj, {
    get: (target: T, prop: string, receiver: unknown) => {
      if (prop === 'toJSON') {
        return () => obj
      }

      const value: string extends keyof T ? T[string] : unknown = Reflect.get(target, prop, receiver);

      if (typeof value === 'object' && value !== null) {
        return proxify<any>(value, options);
      }

      if (typeof value !== 'string') {
        return value;
      }

      const valueStr = value.toString();

      // TODO: pattern matcher
      let absoluteValue = undefined
      if (!options.urlPattern.test(valueStr)) {
        if (options.relativeURIs === false) {
          return valueStr;
        }

        if (valueStr[0] !== '/') {
          return valueStr;
        }

        absoluteValue = `${options.urlPattern.protocol}://${options.urlPattern.hostname}${options.urlPattern.port ? ':'+options.urlPattern.port : ''}${valueStr}`;
        if (!options.urlPattern.test(absoluteValue)) {
          return valueStr;
        }
      }

      if (resources.has(valueStr)) {
        return resources.get(valueStr);
      }

      resources.set(valueStr, {'@id': valueStr});

      const callFetch = (iri: string, object: T, tableMap: TableMap<T>, uri: RequestInfo | URL) => {
        options.fetchFn(uri)
          .then(data => {
            tableMap.set(iri, proxify(data, options))
            if (options.onUpdate) {
              options.onUpdate(object, { iri, data })
            }
          })
          .catch((err) => options.onError(err))
      };

      callFetch(valueStr, proxify(options.root, options), resources as TableMap<T>, absoluteValue === undefined ? valueStr : absoluteValue)

      return resources.get(valueStr)
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
      return proxify<T>(d, options as LdOptions<T>)
    })
}
