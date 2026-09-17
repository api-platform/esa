import {EventSource} from 'eventsource'

type Options<T> = {
  rawEvent?: boolean;
  EventSource?: any;
  headers?: {[key: string]: string};
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onError?: (error: unknown)  => void;
  onUpdate?: (data: MessageEvent|T)  => void;
  withCredentials?: boolean;
} & RequestInit;

type Subscriber<T> = {
  rawEvent?: boolean;
  onError?: (error: unknown) => void;
  onUpdate?: (data: MessageEvent|T) => void;
}

type Connection = {
  EventSource?: any;
  headers?: {[key: string]: string};
  withCredentials?: boolean;
}

type Hub = {
  topics: Map<string, Set<Subscriber<any>>>;
  connection: Connection;
  lastEventId?: string;
  eventSource?: any;
}

const hubs = new Map<string, Hub>()
const registrations = new Map<string, Set<string>>()

function subscribers(hub: Hub): Set<Subscriber<any>> {
  const all = new Set<Subscriber<any>>()
  hub.topics.forEach((topicSubscribers) => topicSubscribers.forEach((subscriber) => all.add(subscriber)))

  return all
}

function listen(mercureUrl: string) {
  const hub = hubs.get(mercureUrl)
  if (hub === undefined) {
    return
  }

  if (hub.eventSource) {
    hub.eventSource.close()
    hub.eventSource = undefined
  }

  if (hub.topics.size === 0) {
    hubs.delete(mercureUrl)

    return
  }

  const url = new URL(mercureUrl)
  hub.topics.forEach((_, topic) => {
    url.searchParams.append('match', topic)
  })

  const headers: {[key: string]: string} = {...hub.connection.headers}
  if (hub.lastEventId) {
    headers['Last-Event-ID'] = hub.lastEventId
  }

  hub.eventSource = new (hub.connection.EventSource ?? EventSource)(url.toString(), {
    withCredentials: hub.connection.withCredentials !== undefined ? hub.connection.withCredentials : true,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {...init, headers: {...headers, ...init?.headers}}),
    headers,
  });

  hub.eventSource.onmessage = (event: MessageEvent) => {
    hub.lastEventId = event.lastEventId
    subscribers(hub).forEach((subscriber) => {
      if (!subscriber.onUpdate) {
        return
      }

      try {
        subscriber.onUpdate(subscriber.rawEvent ? event : JSON.parse(event.data))
      } catch (e) {
        subscriber.onError && subscriber.onError(e)
      }
    })
  }

  hub.eventSource.onerror = (error: unknown) => {
    subscribers(hub).forEach((subscriber) => subscriber.onError && subscriber.onError(error))
  }
}

export function close(topic: string) {
  const mercureUrls = registrations.get(topic)
  if (mercureUrls === undefined) {
    return
  }

  registrations.delete(topic)
  mercureUrls.forEach((mercureUrl) => {
    hubs.get(mercureUrl)?.topics.delete(topic)
    listen(mercureUrl)
  })
}

function subscribe<T>(mercureUrl: string, topic: string, opts: Options<T>) {
  let hub = hubs.get(mercureUrl)
  if (hub === undefined) {
    hub = {
      topics: new Map<string, Set<Subscriber<any>>>(),
      connection: {EventSource: opts.EventSource, headers: opts.headers, withCredentials: opts.withCredentials},
    }
    hubs.set(mercureUrl, hub)
  }

  const subscriber: Subscriber<T> = {rawEvent: opts.rawEvent, onError: opts.onError, onUpdate: opts.onUpdate}
  const registration = registrations.get(topic) ?? new Set<string>()
  registration.add(mercureUrl)
  registrations.set(topic, registration)

  const existing = hub.topics.get(topic)
  if (existing) {
    existing.add(subscriber)

    return
  }

  hub.topics.set(topic, new Set([subscriber]))
  listen(mercureUrl)
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
        subscribe(mercureUrl, topic === undefined ? url : topic, opts)
      }

      return res;
    });
}
