import {EventSource} from 'eventsource'

// Mercure 1.0 encodes the matcher type in the name of the query parameter:
// bare "match" selects the default "exact" type, "match_urlpattern" selects
// URL Patterns (WHATWG), which stand for a whole family of topics.
type MatcherType = 'exact' | 'urlpattern'

const matcherParam: Record<MatcherType, string> = {
  exact: 'match',
  urlpattern: 'match_urlpattern',
}

type Options<T> = {
  rawEvent?: boolean;
  EventSource?: any;
  headers?: {[key: string]: string};
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onError?: (error: unknown)  => void;
  onUpdate?: (data: MessageEvent|T)  => void;
  withCredentials?: boolean;
  // Subscribe with a URL Pattern instead of the exact "rel=self" topic. Every
  // resource whose topic this pattern covers then shares a single
  // subscription: "/authors/:id" replaces one subscription per author.
  matchUrlPattern?: string;
} & RequestInit;

type Subscription = {
  type: MatcherType;
  // The topics this matcher currently stands for. An exact matcher holds one;
  // a URL Pattern holds every fetched resource it covers, so the subscription
  // outlives close() on any single one of them.
  topics: Set<string>;
}

// Everything about one hub. Kept per hub rather than in module-wide maps: two
// hubs can legitimately serve the same topic path, and a resume cursor is only
// meaningful to the hub that issued it.
type Hub = {
  // Matcher (an exact topic, or a URL Pattern) -> the subscription it opens.
  subscriptions: Map<string, Subscription>;
  lastEventId?: string;
  eventSource?: any;
  options?: Options<any>;
}

const hubs = new Map<string, Hub>()
// Topic -> the hub serving it and the matcher covering it. Global because
// close() is given a topic and nothing else.
const registrations = new Map<string, {mercureUrl: string, matcher: string}>()

function hub(mercureUrl: string): Hub {
  let entry = hubs.get(mercureUrl)
  if (entry === undefined) {
    entry = {subscriptions: new Map<string, Subscription>()}
    hubs.set(mercureUrl, entry)
  }

  return entry
}

// Attach the callbacks to a connection. Split out of listen() so a new
// subscriber joining an existing matcher can refresh them without dropping
// the stream and reconnecting.
function bind<T>(entry: Hub, options: Options<T>) {
  entry.options = options
  entry.eventSource.onmessage = (event: MessageEvent) => {
    entry.lastEventId = event.lastEventId
    if (options.onUpdate) {
      try {
        options.onUpdate(options.rawEvent ? event : JSON.parse(event.data))
      } catch (e) {
        options.onError && options.onError(e)
      }
    }
  }

  entry.eventSource.onerror = options.onError
}

function listen<T>(mercureUrl: string, options: Options<T> = {}) {
  const entry = hub(mercureUrl)
  if (entry.eventSource) {
    entry.eventSource.close()
    entry.eventSource = undefined
  }

  if (entry.subscriptions.size === 0) {
    return;
  }

  const url = new URL(mercureUrl)
  entry.subscriptions.forEach((subscription, matcher) => {
    url.searchParams.append(matcherParam[subscription.type], matcher)
  })

  const headers: {[key: string]: string} = {...options.headers}
  if (entry.lastEventId) {
    headers['Last-Event-ID'] = entry.lastEventId
  }

  entry.eventSource = new (options.EventSource ?? EventSource)(url.toString(), {
    withCredentials: options.withCredentials !== undefined ? options.withCredentials : true,
    // eventsource takes no headers option, only a fetch to wrap. The order
    // matters: on the reconnections it performs on its own it sets its own
    // Last-Event-ID, which is fresher than the cursor seeded here.
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {...init, headers: {...headers, ...init?.headers}}),
    headers,
  });
  bind(entry, options)
}

// Drop a topic from the matcher covering it, without touching any connection.
// Returns the hub whose subscription set changed, so the caller decides when to
// reconnect — moving a topic between matchers changes it twice.
function release(topic: string): string | undefined {
  const registration = registrations.get(topic)
  if (registration === undefined) {
    return undefined
  }

  registrations.delete(topic)

  const entry = hubs.get(registration.mercureUrl)
  const subscription = entry?.subscriptions.get(registration.matcher)
  if (!entry || !subscription) {
    return undefined
  }

  subscription.topics.delete(topic)
  // A URL Pattern covers a family: keep the subscription as long as one of its
  // topics is still in use.
  if (subscription.topics.size > 0) {
    return undefined
  }

  entry.subscriptions.delete(registration.matcher)

  return registration.mercureUrl
}

export function close(topic: string) {
  const mercureUrl = release(topic)
  if (mercureUrl === undefined) {
    return
  }

  listen(mercureUrl, hubs.get(mercureUrl)?.options)
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

      if (!mercureUrl) {
        return res
      }

      topic = topic === undefined ? url : topic
      const matcher = opts.matchUrlPattern ?? topic
      const entry = hub(mercureUrl)

      // Moving a topic from one matcher to another: drop the old registration
      // first, otherwise it keeps a topic nothing will ever close. Released
      // rather than closed, so this hub reconnects once below instead of twice.
      const previous = registrations.get(topic)
      if (previous !== undefined && (previous.matcher !== matcher || previous.mercureUrl !== mercureUrl)) {
        const released = release(topic)
        // A topic that moved to another hub leaves that one holding a
        // subscription it no longer serves.
        if (released !== undefined && released !== mercureUrl) {
          listen(released, hubs.get(released)?.options)
        }
      }

      let subscription = entry.subscriptions.get(matcher)
      const opened = subscription === undefined

      if (subscription === undefined) {
        subscription = {
          type: opts.matchUrlPattern === undefined ? 'exact' : 'urlpattern',
          topics: new Set<string>(),
        }
        entry.subscriptions.set(matcher, subscription)
      }

      subscription.topics.add(topic)
      registrations.set(topic, {mercureUrl, matcher})

      if (opened || !entry.eventSource) {
        listen(mercureUrl, opts)

        return res
      }

      // The matcher is already subscribed, so this resource needs no new
      // subscription at all — that is the point of collapsing a family into
      // one URL Pattern. Refresh the callbacks in place instead of
      // reconnecting; the latest registration serves the stream.
      bind(entry, opts)

      return res;
    });
}
