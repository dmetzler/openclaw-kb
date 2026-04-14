# Quickstart: Wiki Ingestion Pipeline

**Branch**: `002-wiki-ingestion-pipeline` | **Date**: 2026-04-14

## Prerequisites

- Node.js 18+
- SQLite database initialized via `db.mjs` (spec 001)
- An LLM provider adapter (see below)

## Install Dependencies

```bash
npm install gray-matter @mozilla/readability jsdom turndown turndown-plugin-gfm zod
```

## LLM Provider Setup

The pipeline requires an `LLMProvider` object — any object with a `complete(systemPrompt, userPrompt)` method returning a `Promise<string>`.

```javascript
// Example: OpenAI adapter
import OpenAI from 'openai';

const openai = new OpenAI();

const llm = {
  complete: async (system, user) => {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return res.choices[0].message.content;
  }
};
```

## Ingest a URL

```javascript
import { initDatabase } from './src/db.mjs';
import { ingestUrl } from './src/ingest.mjs';

// Initialize database (required once)
initDatabase();

const result = await ingestUrl('https://example.com/article', llm);

console.log(result);
// {
//   ok: true,
//   rawFile: '2026-04-14-article-title.md',
//   pagesCreated: ['javascript.md', 'web-development.md'],
//   pagesUpdated: [],
//   pagesFailed: [],
//   entitiesCreated: 2,
//   relationsCreated: 1
// }
```

## Ingest Raw Text

```javascript
import { initDatabase } from './src/db.mjs';
import { ingestText } from './src/ingest.mjs';

initDatabase();

const result = await ingestText(
  'Meeting Notes: Architecture Review',
  'We discussed migrating from monolith to microservices...',
  llm
);
```

## Directory Structure After Ingestion

```
wiki/
  entities/
    javascript.md          # Generated wiki page
  concepts/
    web-development.md     # Generated wiki page
  index.md                 # Auto-generated catalog
  log.md                   # Append-only operation log
raw/
  2026-04-14-article-title.md   # Immutable source archive
```

## Browse in Obsidian

1. Open the parent directory as an Obsidian vault (or add `wiki/` as a subfolder to an existing vault).
2. Navigate to any wiki page — frontmatter appears in the Properties panel.
3. Click `[[wikilinks]]` to follow cross-references.
4. Use Graph View to visualize entity relationships.

## Custom Options

```javascript
const result = await ingestUrl('https://example.com/article', llm, {
  wikiDir: 'my-wiki',        // Custom wiki directory (default: 'wiki')
  rawDir: 'my-raw',          // Custom raw directory (default: 'raw')
  fetchTimeout: 30000,       // Fetch timeout in ms (default: 15000)
});
```

## Using Individual Modules

```javascript
// Fetch a URL without running the full pipeline
import { fetchUrl } from './src/fetcher.mjs';
const { title, content, author } = await fetchUrl('https://example.com');

// Extract entities from text without creating pages
import { extract } from './src/extractor.mjs';
const { entities, relations, topics, summary } = await extract(content, llm);

// Create a wiki page directly
import { createPage } from './src/wiki.mjs';
const { fileName, kgId } = createPage(entities[0], 'raw-file-name.md');

// Regenerate the index
import { regenerateIndex } from './src/wiki.mjs';
const { pageCount } = regenerateIndex();
```

## Error Handling

```javascript
try {
  const result = await ingestUrl('https://example.com/404', llm);
} catch (error) {
  // "Fetch failed: HTTP 404"
  // No raw file or pages created on fetch failure.
  console.error(error.message);
}

// Partial failures are reported in the result, not thrown:
const result = await ingestUrl('https://example.com/article', llm);
if (result.pagesFailed.length > 0) {
  console.warn('Some pages failed:', result.pagesFailed);
  // Successfully created pages are still intact.
}
```

## Testing

```bash
npx vitest run
```

Tests use mock LLM providers and fixture HTML/text to avoid external dependencies.
