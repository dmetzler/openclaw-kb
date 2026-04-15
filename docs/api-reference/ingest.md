# ingest.mjs — Ingestion Pipeline

The ingest module orchestrates the full pipeline from URL or raw text to knowledge graph entities, wiki pages, and searchable content.

**Source:** `src/ingest.mjs` (355 lines)
**Dependencies:** `db.mjs`, `wiki.mjs`, `extractor.mjs`, `fetcher.mjs`, `fs`, `path`

---

## Exported Functions

### `ingestUrl(url, llmProvider)`

Fetches a URL, extracts entities and relations via LLM, and populates the knowledge graph and wiki.

```js
import { ingestUrl } from './ingest.mjs';

const result = await ingestUrl('https://example.com/article', {
  complete: async (system, user) => llmResponse
});
```

| Parameter | Type | Description |
|---|---|---|
| `url` | string | URL to fetch and ingest |
| `llmProvider` | LLMProvider | Object with a `complete(systemPrompt, userPrompt)` async method |

**Pipeline:**

1. `fetchUrl(url)` — Fetches and extracts article content
2. `archiveRawSource(markdown, url)` — Saves raw content to `raw/` directory
3. `extract(markdown, llmProvider)` — LLM extraction of entities and relations
4. For each entity: `createEntity()` + `createPage()`
5. For each relation: `createRelation()` with mapped entity IDs

**Returns:**

```js
{
  entities: [
    { id: 1, name: 'React', type: 'technology', attributes: {...} }
  ],
  relations: [
    { id: 1, source_id: 1, target_id: 2, type: 'built_with' }
  ]
}
```

**Throws:** If fetch fails, LLM call fails, or JSON parsing fails.

---

### `ingestText(text, llmProvider)`

Ingests raw text directly (skips the fetch stage).

```js
import { ingestText } from './ingest.mjs';

const result = await ingestText(
  '# My Article\n\nContent about React and JavaScript...',
  llmProvider
);
```

| Parameter | Type | Description |
|---|---|---|
| `text` | string | Raw text/Markdown content to ingest |
| `llmProvider` | LLMProvider | Object with a `complete(systemPrompt, userPrompt)` async method |

Same pipeline as `ingestUrl` but starts at step 3 (extraction). No raw source archival occurs.

**Returns:** Same shape as `ingestUrl`.

---

## LLMProvider Interface

Both functions accept an `llmProvider` object:

```js
/**
 * @typedef {Object} LLMProvider
 * @property {(systemPrompt: string, userPrompt: string) => Promise<string>} complete
 */
```

Any LLM backend (OpenAI, Anthropic, Ollama, local models) can be used by implementing this single-method interface.

---

## Internal Functions

### `archiveRawSource(markdown, url)`

Saves the raw fetched content to `raw/<slugified-url>.md` for provenance tracking. Creates the `raw/` directory if needed. This is a write-once operation — existing files are overwritten.

### `_ensureWikiDirs()`

Creates the wiki directory structure (`wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, `wiki/comparisons/`) if any directories are missing.

---

## Related Pages

- [Ingestion Pipeline](../developer-guide/ingestion-pipeline.md) — Detailed pipeline walkthrough
- [API: extractor.mjs](extractor.md) — Entity extraction details
- [API: fetcher.mjs](fetcher.md) — URL fetching details
- [API: db.mjs](db.md) — Entity and relation creation
- [API: wiki.mjs](wiki.md) — Wiki page creation
