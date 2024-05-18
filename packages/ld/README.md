# Linked Data

Rich JSON formats like JSON-LD use IRIs to reference embeded data. This library fetches the wanted URIs automatically.

## React SWR example

I have an API referencing books and their authors, `GET /books/1` returns:

```json
{
      "@id": "/books/1",
      "@type": ["https://schema.org/Book"],
      "title": "Hyperion",
      "author": "https://localhost/authors/1"
}
```

Thanks to `ld` you don't need to call `fetch` to get the author data: 

```javascript
import useSWRLd from "use-swrld";

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
