/// <reference types="urlpattern-polyfill" />
// @ts-ignore: Property 'UrlPattern' does not exist 
if (!globalThis.URLPattern) {
    await import("urlpattern-polyfill");
}
const table = new Map();
export default function ld(obj, pattern, cb, options = {}) {
    if (undefined === options.root) {
        table.clear();
        options.root = obj;
    }
    if (undefined === options.fetchFn) {
        options.fetchFn = (input, init) => fetch(input, init).then(res => res.json());
    }
    return new Proxy(obj, {
        get: (target, prop, receiver) => {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'object' && value !== null) {
                return ld(value, pattern, cb, options);
            }
            if (typeof value === 'string' && pattern.test(value)) {
                if (table.has(value)) {
                    return table.get(value);
                }
                table.set(value, undefined);
                ;
                ((iri, object, callback, t) => {
                    options.fetchFn(iri).then(data => {
                        t.set(iri, data);
                        if (callback) {
                            callback(object, { iri, data });
                        }
                    });
                })(value, ld(options.root, pattern, cb, options), cb, table);
                return table.get(value);
            }
            return value;
        }
    });
}
