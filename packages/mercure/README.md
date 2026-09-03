# @api-platform/mercure

`@api-platform/mercure` is an EventSource wrapper that [discovers a Mercure Hub](https://mercure.rocks/docs/1.0/concepts/discovery) according to the Link headers and handles subscriptions for you.

It speaks the [Mercure 1.0](https://mercure.rocks/docs/1.0/introduction) protocol: subscriptions are sent as `match` (exact) or `match_urlpattern` (URL Pattern) query parameters. The pre-1.0 `topic` parameter is not supported.

```javascript
import mercure, { close } from "@api-platform/mercure";

const res = await mercure('https://localhost/authors/1', {
    onUpdate: (author) => console.log(author)
})

const author = await res.json()

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

A new `EventSource` is created by subscribing to the topic `https://localhost/authors/1` on the Hub `https://localhost/.well-known/mercure`, as `?match=https%3A%2F%2Flocalhost%2Fauthors%2F1`.

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

const author = await res.json()
```

Available options:

- `onUpdate` called with each update, parsed as JSON unless `rawEvent` is set
- `rawEvent` to receive the `MessageEvent` instead of the parsed payload
- `onError` on EventSource error callback
- `EventSource` to provide your own `EventSource` constructor
- `withCredentials` to send credentials with the subscription, `true` by default
- `fetchFn` to provide your own fetch function, it needs to return a response so that we can read headers
- `matchUrlPattern` to subscribe with a URL Pattern instead of the exact topic, see below

This can be used in conjunction with [@api-platform/ld](/linked-data) as the `fetchFn`.

### Subscribing to a family of topics

By default each resource gets its own exact subscription. Fetching one hundred authors means one hundred `match` parameters on the subscription URL.

`matchUrlPattern` collapses them into one. Pass the [URL Pattern](https://mercure.rocks/docs/1.0/concepts/topics-and-matchers) covering the family, and every resource it matches shares a single subscription:

```javascript
import mercure, { close } from "@api-platform/mercure";

const matchUrlPattern = '/authors/:id'

await mercure('/authors/1', {matchUrlPattern, onUpdate})
// Reuses the subscription above. The hub sees one `match_urlpattern=/authors/:id`,
// not two `match=` parameters, and the connection is never dropped.
await mercure('/authors/2', {matchUrlPattern, onUpdate})
```

URL Patterns support named groups (`:id`), wildcards (`*`), regular expression constraints (`:type(news|alerts)`) and optional segments (`/items{/:tail}?`).

Two consequences worth knowing:

- **You receive updates for topics you never fetched.** The pattern is what the hub matches against, so `/authors/3` reaches you even if you only ever fetched authors 1 and 2. That is the point, but it means the payload is the only thing that tells updates apart: an SSE frame carries `id`, `event` and `data`, never the topic. With JSON-LD, dispatch on `@id`.
- **`close(topic)` is reference counted.** The subscription stays open while any of the topics it covers is still in use, and is dropped once the last one closes.

When several resources share a matcher, the callbacks passed to the most recent `mercure()` call serve the stream — the connection is reused, not rebuilt.

### Examples

See [our Tanstack query example](https://github.com/api-platform/esa/blob/main/tests-server/mercure.html), the [URL Pattern example](https://github.com/api-platform/esa/blob/main/tests-server/mercure-urlpattern.html), or the source code of our [home page](https://github.com/api-platform/esa/blob/main/api/public/index.js).
