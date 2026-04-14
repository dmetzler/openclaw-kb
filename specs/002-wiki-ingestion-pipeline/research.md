# Research: Wiki Structure, Templates & Ingestion Pipeline

**Branch**: `002-wiki-ingestion-pipeline` | **Date**: 2026-04-14

## R1: URL Fetching & Content Extraction

### Decision
Use `@mozilla/readability` + `jsdom` for article extraction from HTML, and `turndown` + `turndown-plugin-gfm` for HTML→Markdown conversion. Use Node.js native `fetch()` with `AbortSignal.timeout()` for HTTP fetching.

### Rationale
- This is the dominant stack across production projects: n8n, fetch-mcp, Jina Reader, dialoqbase, Cherry Studio all use this exact combination.
- `@mozilla/readability` is the industry standard for article extraction — the same algorithm Firefox Reader View uses. No credible alternative exists.
- `jsdom` provides a full DOM implementation that Readability requires. Alternative: `linkedom` is ~10x lighter but less spec-compliant.
- `turndown` with the GFM plugin handles tables, strikethrough, and task lists — important for preserving article structure as Markdown.
- Native `fetch()` (Node.js 18+) with `AbortSignal.timeout()` avoids adding an HTTP client dependency.

### Alternatives Considered
- **Puppeteer/Playwright** (headless browser): Too heavy for a CLI tool. Only needed for JS-rendered pages, which are out of scope.
- **node-fetch**: Unnecessary — native `fetch()` is available in Node.js 18+.
- **linkedom** instead of jsdom: ~10x lighter, but less spec-compliant. Could revisit if memory becomes a concern at high concurrency.
- **Jina Reader as a service**: External dependency, adds network latency, not self-contained.

### Key Patterns

**Fetching with timeout and size limits:**
```javascript
const response = await fetch(url, {
  signal: AbortSignal.timeout(15_000),
  redirect: 'follow',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; OpenClawBot/1.0)',
    'Accept': 'text/html,application/xhtml+xml,*/*',
  },
});
```

**Content extraction:**
```javascript
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const virtualConsole = new VirtualConsole(); // suppress JSDOM noise
const dom = new JSDOM(html, { url, virtualConsole });
const article = new Readability(dom.window.document).parse();

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndown.use(gfm);
const markdown = turndown.turndown(article.content);
```

**Error handling strategy:**
- HTTP errors (4xx/5xx): Return structured error, halt pipeline for that input (FR-015).
- Timeout: `AbortSignal.timeout()` throws `AbortError` — catch and report.
- Non-HTML content-type: Check `content-type` header before parsing — skip PDFs, images, etc.
- Paywall/bot detection: Heuristic — check if `article.textContent.length < 200` after extraction.
- `isProbablyReaderable()` pre-check avoids expensive parsing on non-article pages.

---

## R2: YAML Frontmatter Parsing & Obsidian Compatibility

### Decision
Use `gray-matter` for YAML frontmatter parse/stringify roundtrip, with custom `js-yaml` v4 engine override to handle date serialization correctly.

### Rationale
- `gray-matter` is the **only** library that supports both parsing and writing frontmatter back. This is critical for the "update page frontmatter" requirement (FR-013).
- 4.7M weekly npm downloads, used by GitHub Docs, freeCodeCamp, Astro, VitePress.
- Built-in `matter.stringify()` produces valid YAML frontmatter that Obsidian parses correctly.
- Custom engine override lets us use `js-yaml` v4 and control date/schema behavior.

### Alternatives Considered
- **front-matter** (npm): Read-only — cannot write frontmatter back. Last published 6 years ago.
- **remark-frontmatter**: Plugin for the remark/unified AST pipeline — overkill for standalone use.
- **Manual YAML parsing with js-yaml directly**: Works for reading, but manually managing the `---` delimiters and body separation is error-prone. gray-matter handles this correctly.

### Obsidian Compatibility Constraints

1. **Frontmatter must start on line 1** — no leading whitespace or blank lines.
2. **No nested properties** — Obsidian's Properties UI only supports flat key-value pairs.
3. **Dates as strings** — `js-yaml` v3 auto-converts `YYYY-MM-DD` to JavaScript Date objects, which stringify as `2026-04-14T00:00:00.000Z`. Fix: use `JSON_SCHEMA` or quote dates.
4. **Wikilinks in properties must be quoted** — `related: "[[page-name]]"` not `related: [[page-name]]`.
5. **Lists use block style** — `js-yaml` default block style (`- item`) matches Obsidian's preferred format.
6. **`tags` must be plural** — Obsidian deprecated `tag` in favor of `tags` (list).

### Key Patterns

**Parse/stringify roundtrip with date safety:**
```javascript
import matter from 'gray-matter';
import yaml from 'js-yaml';

const options = {
  engines: {
    yaml: {
      parse: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }),
      stringify: (obj) => yaml.dump(obj, { lineWidth: -1, schema: yaml.JSON_SCHEMA })
    }
  }
};

const file = matter(rawMarkdown, options);
// file.data → frontmatter object
// file.content → Markdown body

const output = matter.stringify(file.content, file.data, options);
```

**Always pass `lineWidth: -1`** to prevent `js-yaml` from wrapping long values (discovered by GitHub Docs team).

### Wiki Page Frontmatter Schema

Per FR-003, every wiki page uses:
```yaml
---
id: "unique-string-id"
type: entity          # entity | concept | topic | comparison
created: "2026-04-14T10:30:00Z"
updated: "2026-04-14T10:30:00Z"
sources:
  - "2026-04-14-article-slug"
confidence: 0.85
related:
  - "[[other-page|Display Name]]"
kg_id: 42
---
```

### Raw Source Frontmatter Schema

Per FR-002:
```yaml
---
title: "Article Title"
source: "https://example.com/article"   # or "manual"
date: "2026-04-14T10:30:00Z"
author: "Author Name"                   # omitted if unavailable
tags:
  - knowledge-base
  - technology
---
```

---

## R3: LLM Extraction Interface Design

### Decision
Define a provider-agnostic LLM interface as a simple function contract (`(messages, options) => Promise<string>`). Use `zod` schemas for extraction output validation. No LLM framework dependency (no LangChain, no Vercel AI SDK).

### Rationale
- The spec explicitly states: "The specific LLM provider and model are configurable but out of scope." This calls for the lightest possible interface.
- A function-based contract (`llm: (prompt) => Promise<string>`) lets any provider be plugged in with a 3-line adapter — OpenAI, Anthropic, Ollama, or local models.
- `zod` validates LLM output structure without coupling to any provider's structured output mode. This means the pipeline works with providers that don't support structured output natively.
- Production projects (HazelJS, TypeAgent, RedPlanet/CORE) all converge on this pattern: simple interface + schema validation + retry on parse failure.

### Alternatives Considered
- **Vercel AI SDK `generateObject`**: Excellent library, but adds a heavy dependency tree and couples to its provider abstraction. Overkill for a single extraction call.
- **LangChain `.withStructuredOutput()`**: Even heavier dependency, adds abstraction layers that obscure what's happening.
- **TypeChat (Microsoft)**: Interesting approach (TypeScript types as prompts), but TypeScript-only and adds complexity.

### LLM Interface Contract

```javascript
/**
 * @typedef {Object} LLMProvider
 * @property {(systemPrompt: string, userPrompt: string) => Promise<string>} complete
 *   Takes a system prompt and user prompt, returns the LLM's text response.
 */
```

Any provider adapter implements this:
```javascript
// OpenAI adapter example
const openaiProvider = {
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

### Extraction Output Schema

Based on patterns from Microsoft TypeAgent, RedPlanet/CORE, and MCP memory server:

```javascript
import { z } from 'zod';

const ExtractedEntitySchema = z.object({
  name: z.string().describe('Canonical entity name, lowercase'),
  type: z.enum(['entity', 'concept', 'topic', 'comparison']).describe('Wiki page type'),
  description: z.string().describe('One-paragraph description'),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .nullable()
    .describe('Structured attributes (role, url, etc.)'),
});

const ExtractedRelationSchema = z.object({
  source: z.string().describe('Subject entity name'),
  predicate: z.string().describe('Relationship type'),
  target: z.string().describe('Object entity name'),
});

const ExtractionResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  relations: z.array(ExtractedRelationSchema),
  topics: z.array(z.string()).describe('Key topics as keywords'),
  summary: z.string().describe('One-sentence summary of the source content'),
});
```

### Extraction Pipeline Design

1. **Receive raw text** (from URL fetch or manual input).
2. **Chunk if needed** — if text exceeds ~4000 tokens, split into overlapping chunks.
3. **Call LLM** with system prompt defining the extraction schema + user prompt containing the text.
4. **Parse JSON response** — extract the JSON object from the LLM's response (handle markdown fences, preamble text).
5. **Validate with Zod** — parse against `ExtractionResultSchema`.
6. **Retry on failure** — if parse/validation fails, retry with error feedback (max 2 retries).
7. **Deduplicate entities** — normalize names (lowercase, trim), merge duplicates by name.

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Use `.nullable()` not `.optional()` in schemas | OpenAI strict mode requires all properties in `required` |
| Entity types constrained to wiki subdirectory types | Prevents LLM from inventing unbounded types |
| System prompt includes JSON schema example | More reliable than just describing the format |
| Retry with error feedback | LLM output is non-deterministic — retries with "your JSON was invalid because X" improve success rate |
| No chunking for MVP | Most articles are <4000 tokens. Add chunking as an enhancement later. |

---

## R4: File Naming & Collision Detection

### Decision
Derive file names from entity/concept names: lowercase, spaces→hyphens, strip non-alphanumeric (except hyphens), truncate at 80 chars with hash suffix, check uniqueness across all wiki subdirectories.

### Rationale
- FR-016 specifies the naming rules explicitly.
- FR-006 requires cross-subdirectory uniqueness for Obsidian wikilink resolution.
- Google Drive compatibility requires avoiding `:*?"<>|\` characters.
- Obsidian's "shortest path" resolution assumes unique file names across the vault.

### Algorithm

```javascript
function slugify(name) {
  let slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug.length > 80) {
    const hash = createHash('md5').update(name).digest('hex').slice(0, 6);
    slug = slug.slice(0, 73) + '-' + hash;
  }

  return slug;
}
```

### Collision Resolution

Per FR-006, if `python.md` exists in `wiki/entities/`, and a new concept page also wants the name `python`:
1. Check all wiki subdirectories for `python.md`.
2. If collision found, append type suffix: `python-concept.md`.
3. All wikilinks referencing this page use the disambiguated name.

---

## R5: Page Merging Strategy

### Decision
When updating an existing wiki page (FR-013), merge new information into existing content sections while preserving manually added content.

### Rationale
- FR-013 requires non-destructive updates.
- FR-014 requires merging when the same URL is re-ingested.
- The append-only nature of `raw/` means we always have provenance.

### Merge Algorithm

1. **Parse existing page** frontmatter and body.
2. **Update frontmatter**: set `updated` to now, append new source to `sources` list, update `confidence` (weighted average of old and new), merge `related` lists (union).
3. **Merge body content**: Append new information as a new section under a `## Updates` heading, or merge into existing sections if structure matches.
4. **Write back** with `matter.stringify()`.

### Open Decision
The spec says "merge new information" but doesn't define the merge strategy precisely. For MVP, we'll use **append-with-dedup**: new extracted content is appended to the page body, and duplicate sentences/paragraphs are removed. A more sophisticated semantic merge can be added later (potentially using the LLM to merge content intelligently).

---

## R6: Raw File Naming Convention

### Decision
Use `YYYY-MM-DD-slugified-title.md` for raw source files. Append numeric suffix for same-day duplicates.

### Rationale
- Per spec assumption: "Raw files use a naming convention of `YYYY-MM-DD-slugified-title.md`."
- Chronological sorting by file name.
- Same-day duplicates get `-2`, `-3`, etc.

### Algorithm

```javascript
function rawFileName(title, date) {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const slug = slugify(title);
  let name = `${dateStr}-${slug}.md`;

  // Check for existing files with same base name
  let counter = 2;
  while (existsSync(join('raw', name))) {
    name = `${dateStr}-${slug}-${counter}.md`;
    counter++;
  }

  return name;
}
```

---

## Summary of All Decisions

| Area | Decision | Key Dependency |
|------|----------|---------------|
| URL fetching | Native `fetch()` + `AbortSignal.timeout()` | None (built-in) |
| HTML extraction | `@mozilla/readability` + `jsdom` | `@mozilla/readability`, `jsdom` |
| HTML → Markdown | `turndown` + GFM plugin | `turndown`, `turndown-plugin-gfm` |
| YAML frontmatter | `gray-matter` with `js-yaml` v4 engine | `gray-matter` |
| LLM interface | Provider-agnostic function contract | None (interface only) |
| Output validation | `zod` schema validation | `zod` |
| File naming | Slugify + 80-char truncation + hash | `node:crypto` (built-in) |
| Collision detection | Cross-subdirectory scan + type suffix | None |
| Page merging | Append-with-dedup (MVP) | None |
| Raw file naming | `YYYY-MM-DD-slug.md` + counter | None |
| Module system | ES modules (.mjs) | Node.js 18+ |
