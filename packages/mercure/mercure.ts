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
  mercureUrl: string;
  type: MatcherType;
  // The topics this matcher currently stands for. An exact matcher holds one;
  // a URL Pattern holds every fetched resource it covers, so the subscription
  // outlives close() on any single one of them.
  topics: Set<string>;
}

let lastEventId: string
const eventSources = new Map();
// Matcher (an exact topic, or a URL Pattern) -> the subscription it opens.
const subscriptions = new Map<string, Subscription>();
// Topic -> the matcher covering it.
const matchers = new Map<string, string>();

// Attach the callbacks to a connection. Split out of listen() so a new
// subscriber joining an existing matcher can refresh them without dropping
// the stream and reconnecting.
function bind<T>(entry: {eventSource: any, options: Options<T>}, options: Options<T>) {
  entry.options = options
  entry.eventSource.onmessage = (event: MessageEvent) => {
    lastEventId = event.lastEventId
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
  const current = eventSources.get(mercureUrl)
  if (current) {
    current.eventSource.close()
    eventSources.delete(mercureUrl)
  }

  const url = new URL(mercureUrl)
  let subscribed = 0
  subscriptions.forEach((subscription, matcher) => {
    if (subscription.mercureUrl !== mercureUrl) {
      return
    }

    url.searchParams.append(matcherParam[subscription.type], matcher)
    subscribed++
  })

  if (subscribed === 0) {
    return;
  }

  const headers: {[key: string]: string} = {...options.headers}
  if (lastEventId) {
    headers['Last-Event-ID'] = lastEventId
  }

  const eventSource = new (options.EventSource ?? EventSource)(url.toString(), {
    withCredentials: options.withCredentials !== undefined ? options.withCredentials : true,
    // eventsource takes no headers option, only a fetch to wrap. The order
    // matters: on the reconnections it performs on its own it sets its own
    // Last-Event-ID, which is fresher than the cursor seeded here.
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {...init, headers: {...headers, ...init?.headers}}),
    headers,
  });
  const entry = {options, eventSource}
  bind(entry, options)
  eventSources.set(mercureUrl, entry)
}

export function close(topic: string) {
  const matcher = matchers.get(topic)
  if (matcher === undefined) {
    return
  }

  matchers.delete(topic)

  const subscription = subscriptions.get(matcher)
  if (!subscription) {
    return
  }

  subscription.topics.delete(topic)
  // A URL Pattern covers a family: keep the subscription as long as one of its
  // topics is still in use.
  if (subscription.topics.size > 0) {
    return
  }

  subscriptions.delete(matcher)
  listen(subscription.mercureUrl, eventSources.get(subscription.mercureUrl)?.options)
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

      // Moving a topic from one matcher to another: release the old one first,
      // otherwise it keeps a topic nothing will ever close.
      const previous = matchers.get(topic)
      if (previous !== undefined && previous !== matcher) {
        close(topic)
      }

      let subscription = subscriptions.get(matcher)
      const opened = subscription === undefined

      if (subscription === undefined) {
        subscription = {
          mercureUrl,
          type: opts.matchUrlPattern === undefined ? 'exact' : 'urlpattern',
          topics: new Set<string>(),
        }
        subscriptions.set(matcher, subscription)
      }

      subscription.topics.add(topic)
      matchers.set(topic, matcher)

      const entry = eventSources.get(mercureUrl)
      if (opened || !entry) {
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
