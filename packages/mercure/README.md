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

This can be used in conjunction with [@api-platform/ld](/linked-data) as the `fetchFn`.

### Examples

See [our Tanstack query example](https://github.com/api-platform/esa/blob/main/tests-server/mercure.html) or the source code of our [home page](https://github.com/api-platform/esa/blob/main/api/public/index.js).
