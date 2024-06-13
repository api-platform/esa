## SWR Linked data

I have an API referencing books and their authors, `GET /books/1` returns:

```json
{
      "@id": "/books/1",
      "@type": ["https://schema.org/Book"],
      "title": "Hyperion",
      "author": "https://localhost/authors/1"
}
```

Thanks to [`ld`](../ld/) you  call `fetch` once, and use the object getter to retrieve the author name, this is how you could create a `useSWRLd` hook: 

```javascript
import ld, { LdOptions } from '@api-platform/ld'
import useSWR from 'swr'
import {useState} from 'react'
import type { SWRConfiguration, KeyedMutator } from 'swr'

export type fetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Fetcher = (...args: any[]) => Promise<any>
export type onUpdateCallback<T> = (root: T, options: { iri: string, data: object }) => void;

export default function useSWRLd<T extends object>(url: string, fetcher: Fetcher, config: Partial<LdOptions<T>> & SWRConfiguration = {}) {
  let cb: undefined | KeyedMutator<T> = undefined

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

function App() {
  // An URL Pattern is used to filter IRIs we want to reach automatically
  const pattern = new URLPattern("/authors/:id", "https://localhost");
  const { data: books, isLoading, error } = useSWRLd('https://localhost/books', pattern)
  if (error) return "An error has occurred.";
  if (isLoading) return "Loading...";

  return (
    <ul>
      {books?.member.map(b => (<li>{b?.title} - {b?.author?.name}</li>))}
    </ul>
  );
}
```
