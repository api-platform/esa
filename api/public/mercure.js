/// <reference types="@types/eventsource" />
import EventSource from 'eventsource';
let lastEventId;
const eventSources = new Map();
const topics = new Map();
function listen(mercureUrl, options = {}) {
    var _a;
    if (eventSources.has(mercureUrl)) {
        const eventSource = eventSources.get(mercureUrl);
        eventSource.eventSource.close();
        eventSources.delete(mercureUrl);
    }
    if (topics.size === 0) {
        return;
    }
    const url = new URL(mercureUrl);
    topics.forEach((_, topic) => {
        url.searchParams.append('topic', topic);
    });
    const headers = options.headers || {};
    if (lastEventId) {
        headers['Last-Event-Id'] = lastEventId;
    }
    const eventSource = new ((_a = options.EventSource) !== null && _a !== void 0 ? _a : EventSource)(url.toString(), { withCredentials: options.withCredentials !== undefined ? options.withCredentials : true, headers });
    eventSource.onmessage = (event) => {
        lastEventId = event.lastEventId;
        if (options.onUpdate) {
            try {
                options.onUpdate(options.rawEvent ? event : JSON.parse(event.data));
            }
            catch (e) {
                options.onError && options.onError(e);
            }
        }
    };
    eventSource.onerror = options.onError;
    eventSources.set(mercureUrl, {
        options: options,
        eventSource: eventSource
    });
}
export function close(topic) {
    if (!topics.has(topic)) {
        return;
    }
    const mercureUrl = topics.get(topic);
    topics.delete(topic);
    const ee = eventSources.get(mercureUrl);
    listen(mercureUrl, ee.options);
}
export default async function mercure(url, opts) {
    return (opts.fetchFn ? opts.fetchFn(url, opts) : fetch(url, opts))
        .then((res) => {
        var _a;
        let mercureUrl;
        let topic;
        (_a = res.headers.get('link')) === null || _a === void 0 ? void 0 : _a.split(",").map((v) => new RegExp('<(.*)>; *rel="(.*)"', 'gi').exec(v.trimStart())).forEach((matches) => {
            if (!matches) {
                return;
            }
            if (matches[2] === 'mercure') {
                mercureUrl = matches[1];
            }
            if (matches[2] === 'self') {
                topic = matches[1];
            }
        });
        if (mercureUrl) {
            topics.set(topic === undefined ? url : topic, mercureUrl);
            listen(mercureUrl, opts);
        }
        return res;
    });
}
