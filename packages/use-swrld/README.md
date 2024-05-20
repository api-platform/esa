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

Thanks to [`ld`](../ld/) you  call `fetch` once, and use the object getter to retrieve the author name: 

```javascript
import useSWRLd from "@api-platform/use-swrld";

function App() {
  // An URL Pattern is used to filter IRIs we want to reach automatically
  const pattern = new URLPattern("/authors/:id", "https://localhost");
  const { data: books, isLoading, error } = useSWRLd('https://localhost/books', pattern)
  if (error) return "An error has occurred.";
  if (isLoading) return "Loading...";

  return (
    <ul>
      {books['hydra:member'].map(b => (<li>{b.title} - {b.author?.name}</li>))}
    </ul>
  );
}
```
