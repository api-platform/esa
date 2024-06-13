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

URLPattern is available as a polyfil at https://www.npmjs.com/package/urlpattern-polyfill

## Examples

### Tanstack Query

```javascript
import ld from "@api-platform/ld";
import {useEffect} from "react"
import {createRoot} from "react-dom/client"
import {
  QueryClient,
  useQuery,
  QueryClientProvider,
} from '@tanstack/react-query'

const queryClient = new QueryClient();
const pattern = new URLPattern("/(books|authors)/:id", window.origin);

function Books() {
  const {isPending, error, data: books} = useQuery({
    queryKey: ['/books'],
    notifyOnChangeProps: 'all',
    queryFn: ({queryKey}) => ld(queryKey, {
      urlPattern: pattern,
      onUpdate: (root, {iri, data}) => {
        queryClient.setQueryData(queryKey, root)
      }
    })
  })

  if (isPending) return 'Loading...'
  if (error) return 'An error has occurred: ' + error.message
  return (
    <ul>
      {books.member.map(b => (<li data-testid="book">{b?.title} - {b?.author?.name}</li>))}
    </ul>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Books />
    </QueryClientProvider>
  )
}
createRoot(root).render(<App />)
```

### React

```javascript
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import ld from "@api-platform/ld";

function App() {
const pattern = new URLPattern("/(books|authors)/:id", window.origin);
const [books, setBooks] = useState({});

useEffect(() => {
  let ignore = false;
  setBooks({});
  ld('/books', {onUpdate: (books) => setBooks(books), urlPattern: pattern})
  .then(books => {
    if (!ignore) {
      setBooks(books);
    }
  });
  return () => {
    ignore = true;
  };
}, []);

return (
  <ul>
    {books.member?.map(b => (<li data-testid="book">{b.title} - {b.author?.name}</li>))}
  </ul>
);
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
```

### Axios

```javascript
import ld from "@api-platform/ld";
const pattern = new URLPattern("/(books|authors)/:id", window.origin);
const list = document.getElementById('list')

function onUpdate(books) {
  const l = []
  books.member.forEach((book) => {
    const li = document.createElement('li')
    li.dataset.testid = 'book'
    li.innerText = `${book.title} - ${book.author?.name}`
    l.push(li)
  });
  list.replaceChildren(...l)
}

ld('/books', {urlPattern: pattern, onUpdate, fetchfn: (url, options) => axios.get(url)})
  .then((books) => {
    books.member.forEach((book) => {
      const li = document.createElement('li')
      li.dataset.testid = 'book'
      li.innerText = `${book.title} - ${book.author?.name}`
      list.appendChild(li)
    });
  })
```

### VanillaJS

```javascript
import ld from "@api-platform/ld";
const pattern = new URLPattern("/(books|authors)/:id", window.origin);
const list = document.getElementById('list')

function onUpdate(books) {
  const l = []
  books.member.forEach((book) => {
    const li = document.createElement('li')
    li.dataset.testid = 'book'
    li.innerText = `${book.title} - ${book.author?.name}`
    l.push(li)
  });
  list.replaceChildren(...l)
}

ld('/books', {urlPattern: pattern, onUpdate})
  .then((books) => {
    books.member.forEach((book) => {
      const li = document.createElement('li')
      li.dataset.testid = 'book'
      li.innerText = `${book.title} - ${book.author?.name}`
      list.appendChild(li)
    });
  })
```

### SWR

Example of a SWR hook:

```typescript
import ld, { LdOptions } from '@api-platform/ld'
import useSWR from 'swr'
import {useState} from 'react'
import type { SWRConfiguration, KeyedMutator } from 'swr'

export type fetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Fetcher = (...args: any[]) => Promise<any>
export type onUpdateCallback<T> = (root: T, options: { iri: string, data: object }) => void;

export default function useSWRLd<T extends object>(url: string, fetcher: Fetcher, config: Partial<LdOptions<T>> & SWRConfiguration = {}) {
  let cb: undefined | KeyedMutator<T> = undefined

  // You may need to force re-rendering as the comparison algorithm of SWR does not work well when object keys are added
  // another solution is to improve the compare function
  const [, setRender] = useState(false)
  const res = useSWR(
    url,
    (url: RequestInfo | URL, opts: RequestInit) =>
      ld(url, {
        ...opts,
        fetchFn: fetcher,
        urlPattern: config.urlPattern,
        onUpdate: (root) => {
          if (cb) {
            cb(root, { optimisticData: root, revalidate: false })
            setRender((s: boolean) => !s)
          }
        },
        relativeURIs: config.relativeURIs,
        onError: config.onError,
      }),
    config
  );

  cb = res.mutate
  return res
}
```
