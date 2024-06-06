/// <reference types="@types/eventsource" />
import EventSource from 'eventsource'
let lastEventId: string
const eventSources = new Map();
const topics = new Map();

type Options<T> = {
  rawEvent?: boolean;
  EventSource?: any;
  headers?: {[key: string]: string};
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onError?: (error: unknown)  => void;
  onUpdate?: (data: MessageEvent|T)  => void;
  withCredentials?: bool;
} & RequestInit;

function listen<T>(mercureUrl: string, options: Options<T> = {}) {
  if (eventSources.has(mercureUrl)) {
    const eventSource = eventSources.get(mercureUrl)
    eventSource.eventSource.close()
    eventSources.delete(mercureUrl)
  }

  if (topics.size === 0) {
    return;
  }

  const url = new URL(mercureUrl)
  topics.forEach((_, topic) => {
    url.searchParams.append('topic', topic)
  })

  const headers: {[key: string]: string} = options.headers || {}
  if (lastEventId) {
    headers['Last-Event-Id'] = lastEventId
  }

  const eventSource = new (options.EventSource ?? EventSource)(url.toString(), { withCredentials: options.withCredentials !== undefined ? options.withCredentials : true, headers});
  eventSource.onmessage = (event: MessageEvent) => {
    lastEventId = event.lastEventId
    if (options.onUpdate) {
      try {
        options.onUpdate(options.rawEvent ? event : JSON.parse(event.data))
      } catch (e) {
        options.onError && options.onError(e)
      }
    }
  }

  eventSource.onerror = options.onError
  eventSources.set(mercureUrl, {
    options: options,
    eventSource: eventSource
  })
}

export function close(topic: string) {
  if (!topics.has(topic)) {
    return
  }

  const mercureUrl = topics.get(topic)
  topics.delete(topic)
  const ee = eventSources.get(mercureUrl)
  listen(mercureUrl, ee.options)
}

export default async function mercure<T>(url: string, opts: Options<T>) {
  return (opts.fetchFn ? opts.fetchFn(url, opts) : fetch(url, opts))
    .then((res) => {
      let mercureUrl;
      let topic;
      res.headers.get('link')?.split(",")
        .map((v) => new RegExp('<(.*)>; *rel="(.*)"', 'gi').exec(v.trimStart()))
        .forEach((matches) => {
          if (!matches) {
            return
          }

          if (matches[2] === 'mercure') {
            mercureUrl = matches[1]
          }
          if (matches[2] === 'self') {
            topic = matches[1]
          }
        });

      if (mercureUrl) {
        topics.set(topic === undefined ? url : topic, mercureUrl)
        listen(mercureUrl, opts)
      }

      return res;
    });
}

