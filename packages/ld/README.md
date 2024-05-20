# Linked Data

Rich JSON formats like JSON-LD use IRIs to reference embeded data. This library fetches the wanted URIs automatically.

I have an API referencing books and their authors, `GET /books/1` returns:

```json
{
      "@id": "/books/1",
      "@type": ["https://schema.org/Book"],
      "title": "Hyperion",
      "author": "https://localhost/authors/1"
}
```

Thanks to `ld` you can load authors automatically when you need them:

```javascript
import ld from '@api-platform/ld'

const pattern = new URLPattern("/authors/:id", "https://localhost");
const books = await ld('/books', {
    urlPattern: pattern,
    onUpdate: (newBooks) => {
        log()
    }
})

function log() {
    console.log(books.author?.name)
}

log()
```

## Options

- `fetchFn` fetch function, defaults to `fetch().then((res) => res.json())`
- `urlPattern` the url pattern filter 
- `relativeURIs` supports relative URIs (defaults to `true`)
- `onUpdate: (root, options: { iri: string, data: any })` callback on data update
- `onError` error callback on fetch errors

## Examples

- [Axios](../../tests-server/axios.html)
- [React](../../tests-server/react.html)
- [SWR](../../tests-server/use-swr.html)
- [Tanstack Query](../../tests-server/tanstack-query.html)
- [Github API](../../tests-server/github.html)
