import {EventSource} from 'eventsource'

type Options<T> = {
  rawEvent?: boolean;
  EventSource?: any;
  headers?: {[key: string]: string};
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onError?: (error: unknown)  => void;
  onUpdate?: (data: MessageEvent|T)  => void;
  parse?: (data: string) => any;
  withCredentials?: boolean;
} & RequestInit;

export type SubscribeOptions<T> = {
  rawEvent?: boolean;
  onError?: (error: unknown) => void;
  onUpdate?: (data: MessageEvent|T) => void;
  parse?: (data: string) => any;
}

export type Connection = {
  EventSource?: any;
  headers?: {[key: string]: string};
  withCredentials?: boolean;
}

export type Matcher = {
  type: string;
  value: string;
}

type Subscriber<T> = SubscribeOptions<T>

type Subscription = {
  matcher: Matcher;
  subscribers: Set<Subscriber<any>>;
}

type Hub = {
  subscriptions: Map<string, Subscription>;
  connection: Connection;
  types: Set<string>;
  bound: Set<string>;
  dispatch?: (event: MessageEvent) => void;
  discoveryLastEventId?: string;
  lastEventId?: string;
  eventSource?: any;
}

type Link = {
  url: string;
  attributes: {[key: string]: string};
}

const hubs = new Map<string, Hub>()
const registrations = new Map<string, Set<() => void>>()

function matcherParam(type: string): string {
  return type === 'exact' ? 'match' : `match_${type}`
}

function key(matcher: Matcher): string {
  return `${matcher.type}:${matcher.value}`
}

function links(header: string | null): Link[] {
  if (!header) {
    return []
  }

  const parsed: Link[] = []
  for (const value of header.split(/,\s*(?=<)/)) {
    const link = /^\s*<([^>]*)>\s*(.*)$/.exec(value)
    if (!link) {
      continue
    }

    const attributes: {[key: string]: string} = {}
    for (const attribute of link[2].matchAll(/;\s*([^=;\s]+)\s*=\s*(?:"([^"]*)"|([^;\s]*))/g)) {
      attributes[attribute[1].toLowerCase()] = attribute[2] ?? attribute[3]
    }

    parsed.push({url: link[1], attributes})
  }

  return parsed
}

function relates(link: Link, rel: string): boolean {
  return (link.attributes['rel'] ?? '').split(/\s+/).includes(rel)
}

function subscribers(entry: Hub): Set<Subscriber<any>> {
  const all = new Set<Subscriber<any>>()
  entry.subscriptions.forEach((subscription) => subscription.subscribers.forEach((subscriber) => all.add(subscriber)))

  return all
}

function bindTypes(entry: Hub) {
  if (!entry.eventSource || !entry.dispatch) {
    return
  }

  entry.types.forEach((type) => {
    if (entry.bound.has(type)) {
      return
    }

    entry.bound.add(type)
    entry.eventSource.addEventListener(type, entry.dispatch)
  })
}

function listen(mercureUrl: string) {
  const entry = hubs.get(mercureUrl)
  if (entry === undefined) {
    return
  }

  if (entry.eventSource) {
    entry.eventSource.close()
    entry.eventSource = undefined
  }

  if (entry.subscriptions.size === 0) {
    hubs.delete(mercureUrl)

    return
  }

  const url = new URL(mercureUrl)
  entry.subscriptions.forEach((subscription) => {
    url.searchParams.append(matcherParam(subscription.matcher.type), subscription.matcher.value)
  })

  const headers: {[key: string]: string} = {...entry.connection.headers}
  if (entry.lastEventId) {
    headers['Last-Event-ID'] = entry.lastEventId
  } else if (entry.discoveryLastEventId) {
    url.searchParams.append('last_event_id', entry.discoveryLastEventId)
  }

  entry.eventSource = new (entry.connection.EventSource ?? EventSource)(url.toString(), {
    withCredentials: entry.connection.withCredentials !== undefined ? entry.connection.withCredentials : true,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {...init, headers: {...headers, ...init?.headers}}),
    headers,
  });

  entry.dispatch = (event: MessageEvent) => {
    entry.lastEventId = event.lastEventId
    entry.discoveryLastEventId = undefined
    subscribers(entry).forEach((subscriber) => {
      if (!subscriber.onUpdate) {
        return
      }

      try {
        subscriber.onUpdate(subscriber.rawEvent ? event : (subscriber.parse ?? JSON.parse)(event.data))
      } catch (e) {
        subscriber.onError && subscriber.onError(e)
      }
    })
  }

  entry.bound = new Set<string>()
  entry.eventSource.onmessage = entry.dispatch
  bindTypes(entry)

  entry.eventSource.onerror = (error: unknown) => {
    subscribers(entry).forEach((subscriber) => subscriber.onError && subscriber.onError(error))
  }
}

function entryFor(mercureUrl: string, connection: Connection): Hub {
  let entry = hubs.get(mercureUrl)
  if (entry === undefined) {
    entry = {
      subscriptions: new Map<string, Subscription>(),
      types: new Set<string>(),
      bound: new Set<string>(),
      connection,
    }
    hubs.set(mercureUrl, entry)
  }

  return entry
}

export function hub(mercureUrl: string, connection: Connection = {}) {
  return {
    subscribe: <T>(matcher: Matcher, options: SubscribeOptions<T> = {}) => attach(mercureUrl, matcher, options, connection),
  }
}

export function subscribe<T>(mercureUrl: string, matcher: Matcher, options: Options<T> = {}): () => void {
  const connection = {EventSource: options.EventSource, headers: options.headers, withCredentials: options.withCredentials}

  return hub(mercureUrl, connection).subscribe(matcher, options)
}

function attach<T>(mercureUrl: string, matcher: Matcher, options: SubscribeOptions<T>, connection: Connection): () => void {
  const entry = entryFor(mercureUrl, connection)
  const subscriber: Subscriber<T> = {rawEvent: options.rawEvent, onError: options.onError, onUpdate: options.onUpdate, parse: options.parse}
  const subscription = entry.subscriptions.get(key(matcher))
  if (subscription) {
    subscription.subscribers.add(subscriber)
  } else {
    entry.subscriptions.set(key(matcher), {matcher, subscribers: new Set([subscriber])})
    listen(mercureUrl)
  }

  let released = false

  return () => {
    if (released) {
      return
    }

    released = true
    const current = hubs.get(mercureUrl)?.subscriptions.get(key(matcher))
    if (current === undefined) {
      return
    }

    current.subscribers.delete(subscriber)
    if (current.subscribers.size > 0) {
      return
    }

    hubs.get(mercureUrl)?.subscriptions.delete(key(matcher))
    listen(mercureUrl)
  }
}

export function close(topic: string) {
  const releases = registrations.get(topic)
  if (releases === undefined) {
    return
  }

  registrations.delete(topic)
  releases.forEach((release) => release())
}

function absolute(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value)
}

async function urlPattern(): Promise<any> {
  if (!('URLPattern' in globalThis)) {
    await import('urlpattern-polyfill')
  }

  return (globalThis as any).URLPattern
}

async function covers(matcher: Matcher, topic: string, base: string): Promise<boolean> {
  if (matcher.type !== 'urlpattern') {
    return false
  }

  const URLPattern = await urlPattern()

  try {
    const pattern = absolute(matcher.value) ? new URLPattern(matcher.value) : new URLPattern(matcher.value, base)

    return absolute(topic) ? pattern.test(topic) : pattern.test(topic, base)
  } catch {
    return false
  }
}

async function matcherFor(mercureUrl: string, topic: string): Promise<Matcher> {
  const entry = hubs.get(mercureUrl)
  if (entry) {
    for (const subscription of entry.subscriptions.values()) {
      if (await covers(subscription.matcher, topic, mercureUrl)) {
        return subscription.matcher
      }
    }
  }

  return {type: 'exact', value: topic}
}

export default async function mercure<T>(url: string, opts: Options<T>) {
  const res = await (opts.fetchFn ? opts.fetchFn(url, opts) : fetch(url, opts))
  const discovered = links(res.headers.get('link'))
  const hubLink = discovered.find((link) => relates(link, 'mercure'))
  if (hubLink === undefined) {
    return res
  }

  const topic = discovered.find((link) => relates(link, 'self'))?.url ?? url
  const entry = entryFor(hubLink.url, {EventSource: opts.EventSource, headers: opts.headers, withCredentials: opts.withCredentials})

  const discoveryLastEventId = hubLink.attributes['last-event-id']
  if (discoveryLastEventId && entry.lastEventId === undefined && entry.discoveryLastEventId === undefined) {
    entry.discoveryLastEventId = discoveryLastEventId
  }

  const type = hubLink.attributes['type']
  if (type) {
    entry.types.add(type)
    bindTypes(entry)
  }

  const release = subscribe(hubLink.url, await matcherFor(hubLink.url, topic), opts)
  const releases = registrations.get(topic) ?? new Set<() => void>()
  releases.add(release)
  registrations.set(topic, releases)

  return res
}
