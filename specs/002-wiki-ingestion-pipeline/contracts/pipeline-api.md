# API Contract: Wiki Ingestion Pipeline

**Branch**: `002-wiki-ingestion-pipeline` | **Date**: 2026-04-14

This document defines the public API surface for all four modules introduced by this feature. Internal/private functions are omitted. All modules use ES Module exports (`.mjs`).

---

## Module: `src/ingest.mjs`

Pipeline orchestrator. Entry point for all ingestion operations.

### `ingestUrl(url, llm, options?)`

Fetches a URL, archives the raw content, extracts entities/concepts via LLM, creates/updates wiki pages and KG entities, regenerates the index, and appends to the log.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | YES | URL to fetch and ingest. Must be a valid HTTP/HTTPS URL. |
| `llm` | `LLMProvider` | YES | Provider-agnostic LLM interface (see `extractor.mjs`). |
| `options` | `IngestOptions` | NO | Configuration overrides. |

**`IngestOptions`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `wikiDir` | `string` | `'wiki'` | Root directory for wiki pages. |
| `rawDir` | `string` | `'raw'` | Root directory for raw source files. |
| `fetchTimeout` | `number` | `15000` | URL fetch timeout in milliseconds. |

**Returns:** `Promise<IngestResult>`

**`IngestResult`:**

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | `true` if pipeline completed (even with partial failures). |
| `rawFile` | `string` | File name of the archived raw source (e.g., `2026-04-14-article-title.md`). |
| `pagesCreated` | `string[]` | File names of newly created wiki pages. |
| `pagesUpdated` | `string[]` | File names of updated wiki pages. |
| `pagesFailed` | `{ name: string, error: string }[]` | Pages that failed to create/update, with error details. |
| `entitiesCreated` | `number` | Count of new KG entities created in SQLite. |
| `relationsCreated` | `number` | Count of new KG relations created in SQLite. |

**Throws:**

| Error | When |
|-------|------|
| `Error('Invalid URL: ...')` | `url` is not a valid HTTP/HTTPS URL. |
| `Error('Fetch failed: ...')` | HTTP error, timeout, or unreachable host (FR-015). No raw file or pages created. |

**Behavior notes:**
- On fetch failure, pipeline halts entirely — no raw file, no pages, no log entry (FR-015).
- On LLM extraction failure (after retries), raw file is still archived, log records the failure (FR-018).
- On partial page creation failure, successful pages are kept, failures are logged (FR-019).
- Duplicate URL ingestion creates a new raw file and merges into existing pages (FR-014).

---

### `ingestText(title, text, llm, options?)`

Archives raw text, extracts entities/concepts via LLM, creates/updates wiki pages and KG entities, regenerates the index, and appends to the log.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | YES | Title for the raw source file. Non-empty. |
| `text` | `string` | YES | Raw text content to ingest. Non-empty. |
| `llm` | `LLMProvider` | YES | Provider-agnostic LLM interface. |
| `options` | `IngestOptions` | NO | Same as `ingestUrl`. |

**Returns:** `Promise<IngestResult>` (same shape as `ingestUrl`).

**Throws:**

| Error | When |
|-------|------|
| `Error('Title must be a non-empty string')` | `title` is empty or not a string. |
| `Error('Text must be a non-empty string')` | `text` is empty or not a string. |

**Behavior notes:**
- Raw file frontmatter has `source: "manual"` instead of a URL.
- Otherwise identical pipeline to `ingestUrl` (extraction, page creation, index, log).

---

## Module: `src/wiki.mjs`

Wiki page CRUD, index regeneration, and operation log management.

### `createPage(entity, rawFileName, options?)`

Creates a new wiki page Markdown file with YAML frontmatter and body content. Also creates a corresponding KG entity in SQLite via `db.mjs`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entity` | `ExtractedEntity` | YES | Entity data from LLM extraction (see `extractor.mjs`). |
| `rawFileName` | `string` | YES | Name of the raw source file (without path). |
| `options` | `WikiOptions` | NO | Configuration overrides. |

**`WikiOptions`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `wikiDir` | `string` | `'wiki'` | Root directory for wiki pages. |

**Returns:** `{ fileName: string, filePath: string, kgId: number }`

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | `string` | Final file name (may be disambiguated). |
| `filePath` | `string` | Full path to the created file. |
| `kgId` | `number` | ID of the created KG entity in SQLite. |

**Throws:**

| Error | When |
|-------|------|
| `Error('Entity name must be a non-empty string')` | `entity.name` is empty. |
| `Error('Invalid entity type: ...')` | `entity.type` is not one of `entity`, `concept`, `topic`, `comparison`. |

**Behavior notes:**
- Checks all wiki subdirectories for file name collisions (FR-006). Disambiguates with type suffix if needed.
- Creates subdirectories (`wiki/entities/`, etc.) if they don't exist (FR-017).
- Frontmatter uses `JSON_SCHEMA` for date safety; wikilinks in `related` are quoted (R2 constraints).
- Body is pure Markdown, no HTML (FR-005). Cross-references use `[[name|Display]]` wikilinks (FR-004).

---

### `updatePage(fileName, newEntity, rawFileName, options?)`

Merges new information into an existing wiki page. Updates frontmatter (`updated`, `sources`, `confidence`, `related`) and appends new content to the body. Also updates the corresponding KG entity.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fileName` | `string` | YES | Existing page file name (without path). |
| `newEntity` | `ExtractedEntity` | YES | New entity data to merge. |
| `rawFileName` | `string` | YES | Name of the new raw source file. |
| `options` | `WikiOptions` | NO | Configuration overrides. |

**Returns:** `{ fileName: string, filePath: string, kgId: number }`

**Throws:**

| Error | When |
|-------|------|
| `Error('Page not found: ...')` | No file with `fileName` exists in any wiki subdirectory. |

**Behavior notes:**
- Append-with-dedup merge strategy (R5): new content appended, duplicate paragraphs removed.
- `sources` list extended (union), `confidence` updated (weighted average), `related` merged (union).
- Preserves manually added content — only appends, never removes existing body text.

---

### `readPage(fileName, options?)`

Reads and parses a wiki page, returning its frontmatter and body separately.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `fileName` | `string` | YES | Page file name (without path, with `.md`). |
| `options` | `WikiOptions` | NO | Configuration overrides. |

**Returns:** `{ data: WikiFrontmatter, content: string, filePath: string } | null`

Returns `null` if the page does not exist.

**`WikiFrontmatter`:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier matching file name (without `.md`). |
| `type` | `string` | `entity`, `concept`, `topic`, or `comparison`. |
| `created` | `string` | ISO 8601 creation timestamp. |
| `updated` | `string` | ISO 8601 last-modified timestamp. |
| `sources` | `string[]` | Raw source file names. |
| `confidence` | `number` | 0.0--1.0 extraction confidence. |
| `related` | `string[]` | Wikilink references: `"[[name|Display]]"`. |
| `kg_id` | `number` | Corresponding KG entity ID. |

---

### `findPage(entityName, options?)`

Searches all wiki subdirectories for a page matching the given entity name (by slugifying the name and checking for existing files).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entityName` | `string` | YES | Entity name to search for. |
| `options` | `WikiOptions` | NO | Configuration overrides. |

**Returns:** `{ fileName: string, filePath: string, type: string } | null`

Returns `null` if no matching page exists.

---

### `regenerateIndex(options?)`

Scans all wiki subdirectories and regenerates `wiki/index.md` with all pages grouped by type, sorted alphabetically, using wikilinks.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `WikiOptions` | NO | Configuration overrides. |

**Returns:** `{ pageCount: number, filePath: string }`

| Field | Type | Description |
|-------|------|-------------|
| `pageCount` | `number` | Total number of wiki pages listed in the index. |
| `filePath` | `string` | Path to the generated `index.md`. |

**Behavior notes:**
- Overwrites `wiki/index.md` entirely on each call (FR-007).
- Reads frontmatter of each page to extract the title for wikilink display text.
- Groups: Entities, Concepts, Topics, Comparisons (in that order).
- Within each group, entries sorted alphabetically by display name.

---

### `appendLog(entry, options?)`

Appends a new operation log entry to `wiki/log.md`.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `entry` | `LogEntry` | YES | Operation details. |
| `options` | `WikiOptions` | NO | Configuration overrides. |

**`LogEntry`:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | `string` | YES | ISO 8601 timestamp. |
| `sourceType` | `string` | YES | `"url"` or `"text"`. |
| `source` | `string` | YES | URL or text title. |
| `rawFile` | `string` | YES | Raw file name. |
| `pagesCreated` | `string[]` | YES | File names of created pages. |
| `pagesUpdated` | `string[]` | YES | File names of updated pages. |
| `pagesFailed` | `{ name: string, error: string }[]` | NO | Failed pages with error detail. |
| `note` | `string` | NO | Additional note (e.g., "No entities extracted"). |

**Returns:** `void`

**Behavior notes:**
- Creates `wiki/log.md` with header if it doesn't exist.
- Appends only — never modifies existing entries (FR-008).
- Entries appear in chronological order (most recent at bottom).

---

### `slugify(name)`

Converts an entity/concept name to a file-system-safe slug.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | YES | Entity or concept name. |

**Returns:** `string` — Slugified name (lowercase, hyphens, no special chars, max 80 chars with hash suffix if truncated).

**Algorithm:** Lowercase, spaces to hyphens, strip non-alphanumeric (except hyphens), collapse consecutive hyphens, trim leading/trailing hyphens. If >80 chars, truncate to 73 + `-` + 6-char MD5 hash.

---

## Module: `src/fetcher.mjs`

URL fetching and HTML-to-Markdown extraction.

### `fetchUrl(url, options?)`

Fetches a URL, extracts the article content using Readability, and converts it to Markdown.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | YES | HTTP/HTTPS URL to fetch. |
| `options` | `FetchOptions` | NO | Configuration overrides. |

**`FetchOptions`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `timeout` | `number` | `15000` | Fetch timeout in milliseconds. |
| `userAgent` | `string` | `'Mozilla/5.0 (compatible; OpenClawBot/1.0)'` | User-Agent header. |

**Returns:** `Promise<FetchResult>`

**`FetchResult`:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Extracted article title. |
| `content` | `string` | Article content as Markdown (no HTML). |
| `author` | `string \| null` | Author name if available. |
| `excerpt` | `string \| null` | Article excerpt/description if available. |
| `url` | `string` | The final URL (after redirects). |

**Throws:**

| Error | When |
|-------|------|
| `Error('Fetch failed: HTTP {status}')` | Non-2xx HTTP response. |
| `Error('Fetch failed: timeout')` | Request exceeded timeout. |
| `Error('Fetch failed: {message}')` | Network error or unreachable host. |
| `Error('Content extraction failed: not a readable page')` | Readability cannot extract article content. |
| `Error('Unsupported content type: {type}')` | Response is not HTML (e.g., PDF, image). |

**Behavior notes:**
- Uses native `fetch()` with `AbortSignal.timeout()`.
- Checks `Content-Type` header — only processes `text/html` and `application/xhtml+xml`.
- Uses `isProbablyReaderable()` pre-check before full Readability parse.
- Suppresses JSDOM console noise via `VirtualConsole`.
- Turndown configured with `headingStyle: 'atx'`, `codeBlockStyle: 'fenced'`, GFM plugin enabled.

---

## Module: `src/extractor.mjs`

LLM extraction interface and output validation.

### Type: `LLMProvider`

```javascript
/**
 * @typedef {Object} LLMProvider
 * @property {(systemPrompt: string, userPrompt: string) => Promise<string>} complete
 */
```

Any object with a `complete` method that takes a system prompt and user prompt, returns the LLM's text response as a string.

---

### `extract(text, llm, options?)`

Sends raw text to the LLM for entity/concept/fact extraction, parses and validates the response.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | YES | Raw text content to extract from. |
| `llm` | `LLMProvider` | YES | LLM provider instance. |
| `options` | `ExtractOptions` | NO | Configuration overrides. |

**`ExtractOptions`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxRetries` | `number` | `2` | Max retry attempts on parse/validation failure. |

**Returns:** `Promise<ExtractionResult>`

**`ExtractionResult`:**

| Field | Type | Description |
|-------|------|-------------|
| `entities` | `ExtractedEntity[]` | Extracted entities and concepts. |
| `relations` | `ExtractedRelation[]` | Relationships between entities. |
| `topics` | `string[]` | Key topics/keywords. |
| `summary` | `string` | One-sentence summary. |

**`ExtractedEntity`:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Canonical entity name (lowercase). |
| `type` | `string` | `entity`, `concept`, `topic`, or `comparison`. |
| `description` | `string` | One-paragraph description. |
| `attributes` | `Record<string, string\|number\|boolean\|null> \| null` | Structured attributes. |

**`ExtractedRelation`:**

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | Subject entity name. |
| `predicate` | `string` | Relationship type (e.g., `"is_part_of"`, `"related_to"`). |
| `target` | `string` | Object entity name. |

**Throws:**

| Error | When |
|-------|------|
| `Error('Text must be a non-empty string')` | `text` is empty. |
| `Error('LLM provider must have a complete method')` | `llm` doesn't conform to `LLMProvider`. |
| `Error('Extraction failed after {n} attempts: {details}')` | LLM response couldn't be parsed/validated after all retries. |

**Behavior notes:**
- System prompt includes the JSON schema definition and an example response.
- Parses JSON from LLM response, handling markdown code fences and preamble text.
- Validates against `ExtractionResultSchema` (zod).
- On parse/validation failure, retries with error feedback to the LLM.
- Deduplicates entities by normalized name (lowercase, trimmed) after extraction.
- Entity names are normalized to lowercase for consistent file naming.

---

### `ExtractionResultSchema`

Exported zod schema for `ExtractionResult`. Available for external validation or testing.

```javascript
import { ExtractionResultSchema } from './extractor.mjs';
```

---

## Cross-Module Dependencies

```
ingest.mjs
  ├── fetcher.mjs     (fetchUrl)
  ├── extractor.mjs   (extract)
  ├── wiki.mjs        (createPage, updatePage, findPage, regenerateIndex, appendLog)
  └── db.mjs          (initDatabase — ensures DB is ready)

wiki.mjs
  └── db.mjs          (createEntity, updateEntity, getEntity)

fetcher.mjs
  └── (no internal dependencies — uses external: jsdom, readability, turndown)

extractor.mjs
  └── (no internal dependencies — uses external: zod)
```

## Error Handling Contract

All modules follow these conventions:
- Throw `Error` with descriptive messages (not custom error classes for MVP).
- Error messages are actionable: include what failed and why (e.g., `"Fetch failed: HTTP 404"` not `"Error"`).
- Input validation errors thrown synchronously (before any async work).
- Network/LLM errors thrown as rejected promises.
- Partial failures reported in return values (`pagesFailed`), not thrown.
