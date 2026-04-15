# fetcher.mjs — URL Fetching

The fetcher module downloads a web page, extracts its main article content using Mozilla Readability, and converts it to clean Markdown.

**Source:** `src/fetcher.mjs` (80 lines)
**Dependencies:** `jsdom`, `@mozilla/readability`, `turndown`

---

## Exported Functions

### `fetchUrl(url)`

Fetches a URL and returns its content as clean Markdown.

```js
import { fetchUrl } from './fetcher.mjs';

const result = await fetchUrl('https://example.com/article');
// → { title: 'Article Title', markdown: '# Article\n\nContent...', url: 'https://example.com/article' }
```

| Parameter | Type | Description |
|---|---|---|
| `url` | string | URL to fetch |

**Returns:**

```js
{
  title: string,     // Page title from Readability or <title> tag
  markdown: string,  // Clean Markdown content
  url: string        // Original URL (passed through)
}
```

**Pipeline:**

1. **HTTP fetch** — Uses Node.js built-in `fetch()` to download the page HTML
2. **DOM parsing** — Parses the HTML string into a DOM tree using [JSDOM](https://github.com/jsdom/jsdom)
3. **Readability** — Runs [Mozilla Readability](https://github.com/mozilla/readability) to extract the main article content, stripping navigation, sidebars, ads, and boilerplate
4. **Markdown conversion** — Converts the clean HTML to Markdown using [Turndown](https://github.com/mixmark-io/turndown)

**Throws:**

- Network errors (DNS failure, timeout, HTTP errors)
- `Error` if Readability cannot extract article content (e.g. login walls, empty pages, non-article URLs)

---

## Dependencies

| Library | Purpose |
|---|---|
| `jsdom` | Server-side DOM implementation for HTML parsing |
| `@mozilla/readability` | Article content extraction (same algorithm as Firefox Reader View) |
| `turndown` | HTML-to-Markdown conversion |

---

## Related Pages

- [Ingestion Pipeline](../developer-guide/ingestion-pipeline.md) — How fetching fits into the pipeline
- [API: ingest.mjs](ingest.md) — Orchestrates fetching with extraction and persistence
