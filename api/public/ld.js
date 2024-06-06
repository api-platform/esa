/// <reference types="urlpattern-polyfill" />
export const resources = new Map();
function proxify(obj, options) {
    if (undefined === options.root) {
        resources.clear();
        options.root = obj;
    }
    return new Proxy(obj, {
        get: (target, prop, receiver) => {
            if (prop === 'toJSON') {
                return () => obj;
            }
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'object' && value !== null) {
                return proxify(value, options);
            }
            if (typeof value !== 'string') {
                return value;
            }
            const valueStr = value.toString();
            // TODO: pattern matcher
            let absoluteValue = undefined;
            if (!options.urlPattern.test(valueStr)) {
                if (options.relativeURIs === false) {
                    return valueStr;
                }
                if (valueStr[0] !== '/') {
                    return valueStr;
                }
                absoluteValue = `${options.urlPattern.protocol}://${options.urlPattern.hostname}${options.urlPattern.port ? ':' + options.urlPattern.port : ''}${valueStr}`;
                if (!options.urlPattern.test(absoluteValue)) {
                    return valueStr;
                }
            }
            if (resources.has(valueStr)) {
                return resources.get(valueStr);
            }
            resources.set(valueStr, { '@id': valueStr });
            const callFetch = (iri, object, tableMap, uri) => {
                options.fetchFn(uri)
                    .then(data => {
                    tableMap.set(iri, proxify(data, options));
                    if (options.onUpdate) {
                        options.onUpdate(object, { iri, data });
                    }
                })
                    .catch((err) => options.onError(err));
            };
            callFetch(valueStr, proxify(options.root, options), resources, absoluteValue === undefined ? valueStr : absoluteValue);
            return resources.get(valueStr);
        }
    });
}
export default function ld(input, options = {}) {
    if (!options.urlPattern) {
        throw new Error('URL Pattern is mandatory.');
    }
    if (undefined === options.fetchFn) {
        options.fetchFn = (input, init) => fetch(input, init).then(res => res.json());
    }
    if (undefined === options.relativeURIs) {
        options.relativeURIs = true;
    }
    if (undefined === options.onError) {
        options.onError = console.error;
    }
    return options.fetchFn(input, options)
        .then((d) => {
        return proxify(d, options);
    });
}
