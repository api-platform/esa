import EventSource from 'eventsource'
let lastEventId: string
const eventSources = new Map();
const topics = new Map();

type Callback<T> = (data: T) => void;
type Options = {
  rawEvent?: boolean;
} & RequestInit;

function listen<T>(mercureUrl: string, options: Options, cb: Callback<T>) {
  if (eventSources.has(mercureUrl)) {
    const eventSource = eventSources.get(mercureUrl)
    eventSource.eventSource.close()
    eventSources.delete(mercureUrl)
  }

  const url = new URL(mercureUrl)
  topics.forEach((mercureUrl, topic) => {
    url.searchParams.append('topic', topic)
  })


  const headers: {[key: string]: string} = {}
  if (lastEventId) {
    headers['Last-Event-Id'] = lastEventId
  }

  const eventSource = new EventSource(url.toString(), { withCredentials: true, headers});
  eventSource.onmessage = (event: any) => {
    lastEventId = event.lastEventId
    try {
      cb(options.rawEvent ? event : JSON.parse(event.data))
    } catch (e) {
      // onerror(e)
    }
  }

  eventSources.set(mercureUrl, {
    cb,
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
  listen(mercureUrl, ee.options, ee.cb)
}

export default function mercure<T>(url: string, opts: Callback<T> | Options, cb: Callback<T>) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {} 
  }

  return fetch(url, opts)
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
        listen(mercureUrl, opts, cb)
      }

      return res;
    });
}

