---
name: openclaw-kb
description: "3-tier personal knowledge base. ALWAYS use proactively: (1) store facts from conversations (entities + relations in KG), (2) ingest URLs/documents shared by user (create wiki pages + KG entries + embeddings), (3) answer questions by searching KG first, then data lake, then semantic search. Wiki pages are Obsidian-compatible with wikilinks. Use when: any entity (person, org, concept) is mentioned, any URL or document is shared, any question requires recalling stored knowledge. NOT for: ephemeral chat, weather, time queries."
---

# OpenClaw Knowledge Base

3-tier knowledge system: Knowledge Graph (facts) → Data Lake (structured records) → Semantic Search (FTS5 + embeddings). Wiki pages synced to Obsidian via iCloud/Google Drive.

## Setup

```bash
cd ~/kb && npm install && node -e "import { initDatabase } from './src/db.mjs'; initDatabase('./jarvis.db');"
```

Requires: Node.js 18+, `better-sqlite3`, `sqlite-vec`. Optional: Ollama `nomic-embed-text` for embeddings.

## Agent Behavior Rules

### Silent storage
When you detect facts in conversation (names, companies, relationships), store them in the KG **without announcing it**. Don't say "I'm storing this in the knowledge base" every time.

### URL/Document ingestion
When the user shares a URL or document, acknowledge briefly ("Got it, ingesting now!") then delegate to a sub-agent. Report back when done with a **short summary** (e.g. "Added 5 entities and 3 concepts to the wiki.").

### Answering questions
Use KB data naturally. Don't explain which tier the answer came from.

### Verbosity
Only be detailed about KB internals when explicitly asked.

### Language
All generated content (wiki pages, summaries, descriptions) MUST be in **English**.

## When to Store What

### Always store in KG (silent, no wiki page):
- People mentioned by name → entity type `person`
- Companies/orgs mentioned → entity type `org`
- Simple factual relations (works_at, knows, located_in...)

### Store in KG + create wiki page when:
- User explicitly shares a URL or document → **ALWAYS** create source + concept pages
- User says "remember this", "note this", or shares notable knowledge
- Entity is a concept, technology, or domain knowledge worth retrieving later
- Entity is a key person (colleague, expert, author — not casual mentions)

### Never store:
- Casual greetings, weather/time questions, ephemeral context

## CRITICAL: URL Ingestion Workflow

When a user shares a URL, follow this EXACT workflow. Do NOT skip steps.

### Step 1: Acknowledge
Reply briefly: "Got it, ingesting now!"

### Step 2: Fetch the content
Use `web_fetch` to get the article content.

### Step 3: Build ONE batch script
Create a SINGLE `node -e` script that does EVERYTHING in one call. NEVER run separate scripts for each entity. This is the #1 performance rule.

```bash
cd ~/kb && node -e "
import { initDatabase, createEntity, createRelation, getRelationsFrom, getRelationsTo } from './src/db.mjs';
import { createPage, regenerateIndex } from './src/wiki.mjs';
import { writeFileSync, mkdirSync } from 'fs';
initDatabase('./jarvis.db');
const db = initDatabase('./jarvis.db');

// === RAW SOURCE (MANDATORY) ===
mkdirSync('./raw', { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const slug = 'article-slug-here';
const rawFilename = today + '-' + slug + '.md';
writeFileSync('./raw/' + rawFilename, [
  '---',
  'title: \"Article Title\"',
  'source: \"https://original-url.com\"',
  'date: ' + today,
  'author: \"Author Name\"',
  'ingested: ' + new Date().toISOString(),
  'tags: [knowledge]',
  '---',
  '',
  '# Article Title',
  '',
  'Source: https://original-url.com',
  '',
  '## Summary',
  '',
  'YOUR SUMMARY OF THE ARTICLE HERE (2-3 paragraphs)',
  ''
].join('\n'));

// === ENTITIES (check for duplicates first!) ===
function findOrCreate(name, type, description) {
  const existing = db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
  if (existing) return { ...existing, metadata: JSON.parse(existing.metadata) };
  return createEntity({ name, type, metadata: { description } });
}

const e1 = findOrCreate('Entity Name', 'concept', 'Description here');
const e2 = findOrCreate('Another Entity', 'person', 'Description here');
// ... more entities

// === RELATIONS ===
function safeRelation(sourceId, targetId, type) {
  if (sourceId === targetId) return;
  try { createRelation({ source_id: sourceId, target_id: targetId, type }); } catch(e) {}
}
safeRelation(e1.id, e2.id, 'related_to');

// === WIKI PAGES (only for notable entities) ===
function makePage(entity) {
  const meta = typeof entity.metadata === 'string' ? JSON.parse(entity.metadata) : entity.metadata;
  const rels = [
    ...getRelationsFrom(entity.id).map(r => ({ ...r, direction: 'outgoing' })),
    ...getRelationsTo(entity.id).map(r => ({ ...r, direction: 'incoming' }))
  ];
  createPage(
    { name: entity.name, type: entity.type, description: meta.description || '', attributes: meta },
    rawFilename,
    { wikiDir: './wiki', relations: rels, kgId: entity.id }
  );
}
makePage(e1);
makePage(e2);

regenerateIndex({ wikiDir: './wiki' });
console.log('Done: X entities, Y relations, Z pages');
"
```

### Step 4: Sync to Obsidian
```bash
rclone copy ~/kb/wiki/ icloud:Obsidian/VAULT_NAME/wiki/ --transfers 1
rclone copy ~/kb/raw/ icloud:Obsidian/VAULT_NAME/raw/ --transfers 1
```

### CRITICAL RULES for URL ingestion:
- **raw/ is MANDATORY** — every URL must create a raw/YYYY-MM-DD-slug.md file with frontmatter + summary
- **One script, one exec** — batch ALL entities, relations, and pages in a single `node -e` call
- **Check duplicates** — use `findOrCreate` pattern, never blind `createEntity`
- **Source reference** — pass `rawFilename` as the source parameter to `createPage`
- The raw/ file should contain a **summary** of the article (not the full HTML dump), the source URL, and metadata

## Conversational Facts (inline, no sub-agent)

For simple facts from conversation, batch in one script:

```bash
cd ~/kb && node -e "
import { initDatabase, createEntity, createRelation, getRelationsFrom, getRelationsTo } from './src/db.mjs';
import { createPage, regenerateIndex } from './src/wiki.mjs';
initDatabase('./jarvis.db');
const db = initDatabase('./jarvis.db');

function findOrCreate(name, type, description) {
  const existing = db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
  if (existing) return { ...existing, metadata: JSON.parse(existing.metadata) };
  return createEntity({ name, type, metadata: { description } });
}

function safeRelation(s, t, type) { if (s !== t) try { createRelation({ source_id: s, target_id: t, type }); } catch(e) {} }

const e1 = findOrCreate('Damien Metzler', 'person', 'Software architect');
const e2 = findOrCreate('Hyland', 'org', 'Software vendor in Westlake, Ohio');
safeRelation(e1.id, e2.id, 'works_at');

// Only create wiki pages for notable entities
// regenerateIndex({ wikiDir: './wiki' });
console.log('Stored');
"
```

## Answering Questions (3-Tier Search)

### Step 1: Extract entities from the question
You ARE the NER engine. Identify people, orgs, concepts mentioned.

### Step 2: Search Tier 1 — Knowledge Graph (HIGHEST PRIORITY)
```bash
cd ~/kb && node -e "
import { initDatabase } from './src/db.mjs';
import { searchKG } from './src/wiki-search.mjs';
initDatabase('./jarvis.db');
console.log(JSON.stringify(searchKG('entity name'), null, 2));
"
```
If T1 has facts → **use them**. Do NOT override with T2 or T3.

### Step 3: Search Tier 2 — Data Lake (if T1 incomplete)
```bash
cd ~/kb && node -e "
import { initDatabase, queryRecords } from './src/db.mjs';
initDatabase('./jarvis.db');
console.log(JSON.stringify(queryRecords('record_type', { from: '2026-01-01' }), null, 2));
"
```

### Step 4: Search Tier 3 — Semantic (FALLBACK only)
```bash
cd ~/kb && node -e "
import { initDatabase } from './src/db.mjs';
import { searchSemantic } from './src/wiki-search.mjs';
initDatabase('./jarvis.db');
const r = await searchSemantic('query');
console.log(JSON.stringify(r, null, 2));
"
```

### Priority Rules: T1 facts > T2 data > T3 semantic. NEVER let T3 contradict T1.

## Wiki Rules
- Pages in: `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, `wiki/sources/`
- NEVER at wiki root
- Filenames: lowercase, hyphens, keep accents, no spaces
- Always use `createPage()` — never write files manually
- Always `regenerateIndex()` after batch
- Entity types: `person`, `org`, `place`, `concept`, `knowledge`, `event`, `media`, `product`, `project`, `topic`
- Relation types: `works_at`, `worked_at`, `owns`, `uses`, `created`, `related_to`, `part_of`, `knows`, `located_in`, `manages`, `member_of`, `depends_on`, `likes`, `references`, `covers`, `contrasts_with`, `inspired_by`, `authored`

## Check existing knowledge
```bash
cd ~/kb && node -e "
import { initDatabase } from './src/db.mjs';
const db = initDatabase('./jarvis.db');
db.prepare('SELECT id, name, type FROM entities ORDER BY name').all().forEach(e => console.log(e.id, e.type, e.name));
"
```

## References
- [Schema Registry](references/schema-registry.md) — register custom data types
- [API Quick Reference](references/api-quick-ref.md) — all exported functions
