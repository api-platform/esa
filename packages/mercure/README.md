# @api-platform/mercure

`@api-platform/mercure` is an EventSource wrapper that [discovers a Mercure Hub](https://mercure.rocks/spec#discovery) according to the Link headers and handles subscriptions for you.

```javascript
import mercure, { close } from "@api-platform/mercure";

const res = await mercure('https://localhost/authors/1', {
    onUpdate: (author) => console.log(author)
})

const author = res.then(res => res.json())

// Close if you need to 
history.onpushstate = function(e) {
    close('https://localhost/authors/1')
}
```

Assuming `/authors/1` returned:

```
Link: <https://localhost/authors/1>; rel="self"
Link: <https://localhost/.well-known/mercure>; rel="mercure"
```

A new `EventSource` is created by subscribing to the topic `https://localhost/authors/1` on the Hub `https://localhost/.well-known/mercure`. 

## Installation

```shell
npm install @api-platform/mercure
```

## Usage

Use `mercure` like [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API):

```javascript
import mercure, { close } from "@api-platform/mercure";

const res = await mercure('https://localhost/authors/1', {
    onUpdate: (author) => console.log(author)
})

const author = res.then(res => res.json())
```

Available options:

- `onError` on EventSource error callback
- `EventSource` to provide your own `EventSource` constructor
- `fetchFn` to provide your own fetch function, it needs to return a response so that we can read headers
- `parse` to read the payload yourself, `JSON.parse` by default. A parse error goes to `onError`
- `rawEvent` to receive the whole `MessageEvent` instead of the payload

This can be used in conjunction with [@api-platform/ld](/linked-data) as the `fetchFn`.

### Subscribing to a family of topics

A hub takes matchers rather than resources, and `subscribe` returns the function that ends the subscription:

```javascript
import mercure, { hub } from "@api-platform/mercure";

const authors = hub('https://localhost/.well-known/mercure')

const unsubscribe = authors.subscribe({type: 'urlpattern', value: '/authors/:id'}, {
    onUpdate: (author) => console.log(author)
})
```

Every resource you then fetch with `mercure()` that this pattern covers joins that subscription instead of opening one of its own. The family belongs to the caller that asked for it: `close(topic)` on a covered resource removes that callback alone, and the subscription ends when you call the returned function.

The hub matches the pattern, so you also receive updates for topics you never fetched. [URL Patterns](https://mercure.rocks/docs/1.0/concepts/topics-and-matchers) support named groups (`:id`), wildcards (`*`), regular expression constraints and optional segments.

`hub` takes the connection options, `headers`, `withCredentials` and `EventSource`, because they belong to the stream and not to one subscription. `subscribe(hubUrl, matcher, options)` is the same call in one step.

### Discovery

The `rel="mercure"` Link header can carry target attributes, and the client honours two of them.
`last-event-id` is the identifier of the last event the publisher had dispatched when it generated
the resource: it goes to the hub as a `last_event_id` query parameter, so an update published
between that moment and the subscription is not lost. `type` is the Server-Sent Events event type
the updates carry, and the client listens for it in addition to the default one.

### One connection per hub

Resources served by the same hub share one connection. An SSE frame does not name a topic, so every callback registered on that hub receives every update, and the payload is what tells them apart. With JSON-LD, dispatch on `@id`.

The connection uses the options of the call that opened it. A later call on the same hub adds its callbacks, but it does not change the credentials, the headers or the `EventSource` implementation of a stream that already runs.

### Examples

See [our Tanstack query example](https://github.com/api-platform/esa/blob/main/tests-server/mercure.html) or the source code of our [home page](https://github.com/api-platform/esa/blob/main/api/public/index.js).
