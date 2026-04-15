---
name: openclaw-kb
description: >
  Personal knowledge base built on SQLite with a 3-tier architecture:
  Knowledge Graph (entities + relations with recursive traversal),
  Data Lake (JSON Schema-validated typed records), and
  Semantic Search (FTS5 full-text + vec0 vector embeddings).
  Single-file database (jarvis.db), Obsidian-compatible wiki generation,
  URL/file ingestion with LLM entity extraction, hybrid search across all tiers,
  JSONL export/import, and a schema registry for custom data types.
  Use this skill when working with openclaw-kb: ingesting content, searching,
  managing KG entities/relations, inserting data lake records, registering schemas,
  exporting/importing the database, or extending the system.
---

# OpenClaw KB

A portable, single-file knowledge base for AI agents. Three tiers unified in one SQLite database (`jarvis.db`).

## Setup

```bash
npm install
node -e "import('./src/db.mjs').then(m => { m.initDatabase(); m.closeDatabase(); })"
```

Optional dependencies:
- **Ollama** with `nomic-embed-text` — vector embeddings (768-dim chunks, 384-dim entities)
- **Python 3.10+** with `docling` — PDF/DOCX/PPTX ingestion

## Architecture

```
┌────────────────────────────────────────────────────┐
│  Tier 1: Knowledge Graph     │  Tier 2: Data Lake  │
│  entities + relations        │  data_records        │
│  traverseGraph (depth 2)     │  data_sources        │
│  384-dim entity embeddings   │  data_schemas (AJV)  │
├──────────────────────────────┴─────────────────────┤
│  Tier 3: Semantic Search                           │
│  FTS5 (BM25) + vec0 (768-dim chunk embeddings)     │
├────────────────────────────────────────────────────┤
│  jarvis.db (SQLite WAL)  │  wiki/ (Obsidian .md)   │
└────────────────────────────────────────────────────┘
```

**Tier 1 — Knowledge Graph**: Entities with name/type/metadata. Directed relations. Recursive traversal up to depth 2. Best for structured facts and "what is related to X?" queries.

**Tier 2 — Data Lake**: Generic typed records validated against JSON Schema. Six pre-registered types (health_metric, activity, grade, meal, sleep, finance). Extensible via `registerSchema()`. Best for time-series data and typed records.

**Tier 3 — Semantic Search**: FTS5 full-text with BM25 ranking + sqlite-vec cosine similarity on 768-dim chunk embeddings. Auto-embeds via Ollama. Best for "find content about topic Z."

**Hybrid Search** (`wiki-search.mjs`): Queries all tiers, deduplicates by `source_table:source_id`, ranks by tier priority (KG > Data Lake > Semantic).

## Core Operations

### Ingest

```bash
# URL → Readability → LLM extraction → chunks → embeddings → wiki pages
node src/ingest.mjs https://example.com/article

# File (PDF/DOCX/PPTX/MD) → docling → chunks → embeddings → wiki pages
node src/ingest-file.mjs path/to/document.pdf
```

Programmatic:

```javascript
import { initDatabase, closeDatabase } from '../src/db.mjs';
import { ingestUrl, ingestText } from '../src/ingest.mjs';
import { ingestFile } from '../src/ingest-file.mjs';

initDatabase();
const result = await ingestUrl('https://example.com', llm);
// result: { ok, rawFile, pagesCreated, pagesUpdated, entitiesCreated, relationsCreated, chunks }
closeDatabase();
```

The ingestion pipeline: fetch/convert → archive to `raw/` → LLM entity extraction (Zod-validated) → create wiki pages in `wiki/` → create KG entities + relations → chunk content → embed via Ollama → store in DB.

### Search

```bash
node src/wiki-search.mjs "your query"
```

```javascript
import { search, searchKG, searchData, searchSemantic } from '../src/wiki-search.mjs';

// Unified cross-tier search
const results = await search('Node.js', { maxResults: 10, tiers: [1, 2, 3], includeScores: true });

// Tier-specific
const kgResults = searchKG('Acme Corp');           // Tier 1 only
const dataResults = searchData('weight', 'health_metric');  // Tier 2, filtered by type
const semResults = await searchSemantic('machine learning'); // Tier 3 (FTS5 + vector)
```

### Knowledge Graph CRUD

```javascript
import {
  createEntity, getEntity, updateEntity, deleteEntity,
  createRelation, getRelationsFrom, getRelationsTo, deleteRelation,
  traverseGraph,
  upsertEmbedding, findNearestVectors,
} from '../src/db.mjs';

const alice = createEntity({ name: 'Alice', type: 'person', metadata: { role: 'engineer' } });
const acme = createEntity({ name: 'Acme Corp', type: 'organization' });
createRelation({ source_id: alice.id, target_id: acme.id, type: 'works_at' });

const graph = traverseGraph(alice.id, 2);  // depth-2 traversal
```

### Data Lake Records

```javascript
import {
  createDataSource, insertRecord, queryRecords,
  registerSchema, validateRecord, listSchemas,
} from '../src/db.mjs';

const src = createDataSource({ name: 'fitbit', type: 'api' });
insertRecord('health_metric', {
  source_id: src.id,
  metric_type: 'weight', value: 80, unit: 'kg',
  recorded_at: '2026-04-14T10:00:00Z',
});

const records = queryRecords('health_metric', {
  source_id: src.id, from: '2026-04-01', to: '2026-04-30', limit: 50,
});
```

See [schema-registry.md](references/schema-registry.md) for pre-registered types and custom schema registration.

### Export / Import

```bash
node src/kb-export.mjs ./backup
node src/kb-import.mjs ./backup --db new-kb.db
```

```javascript
import { exportDatabase } from '../src/kb-export.mjs';
import { importDatabase } from '../src/kb-import.mjs';

exportDatabase('./backup');                         // JSONL flat files
importDatabase('./backup', 'new-kb.db');            // into fresh DB
```

### KG Migration (legacy)

```bash
node src/kg-migrate.mjs --dry-run kg-store.json
node src/kg-migrate.mjs kg-store.json
```

```javascript
import { migrateKnowledgeGraph } from '../src/kg-migrate.mjs';
const stats = migrateKnowledgeGraph('kg-store.json', 'jarvis.db', { dryRun: false });
```

### Wiki Operations

```javascript
import { createPage, updatePage, findPage, readPage, regenerateIndex, appendLog } from '../src/wiki.mjs';

const page = createPage(entity, rawFile, { wikiDir: 'wiki' });
regenerateIndex({ wikiDir: 'wiki' });
```

Wiki pages live in `wiki/{entities,concepts,topics,comparisons}/` with YAML frontmatter and wikilinks. The index at `wiki/index.md` is auto-regenerated. Operations are logged to `wiki/log.md`.

### Backfill (chunks + embeddings for existing pages)

```bash
node src/backfill.mjs [--wiki-dir wiki] [--db jarvis.db]
```

### Schema Registry CLI

```bash
node src/schema-registry.mjs list
node src/schema-registry.mjs get health_metric
node src/schema-registry.mjs register schema.json
node src/schema-registry.mjs validate health_metric data.json
```

## When to Use What

| Task | Module | Function |
|------|--------|----------|
| Add a URL to the KB | `ingest.mjs` | `ingestUrl(url, llm)` |
| Add a PDF/DOCX | `ingest-file.mjs` | `ingestFile(path, llm)` |
| Search everything | `wiki-search.mjs` | `search(query, opts)` |
| Search KG only | `wiki-search.mjs` | `searchKG(query)` |
| Search data records | `wiki-search.mjs` | `searchData(query, type?)` |
| Semantic/vector search | `wiki-search.mjs` | `searchSemantic(query)` |
| Create entity | `db.mjs` | `createEntity({name, type, metadata?})` |
| Create relation | `db.mjs` | `createRelation({source_id, target_id, type})` |
| Traverse KG | `db.mjs` | `traverseGraph(entityId, depth)` |
| Insert data record | `db.mjs` | `insertRecord(type, data)` |
| Query data records | `db.mjs` | `queryRecords(type, filters?)` |
| Register schema | `db.mjs` | `registerSchema(type, label, desc, schema, example)` |
| Validate data | `db.mjs` | `validateRecord(type, data)` |
| Export database | `kb-export.mjs` | `exportDatabase(dir)` |
| Import database | `kb-import.mjs` | `importDatabase(dir, dbPath)` |
| Migrate legacy KG | `kg-migrate.mjs` | `migrateKnowledgeGraph(file, dbPath)` |
| Create wiki page | `wiki.mjs` | `createPage(entity, rawFile)` |
| Embed text | `embedder.mjs` | `embed(text)` / `embedBatch(texts)` |
| Chunk markdown | `chunker.mjs` | `chunkMarkdown(md, opts)` |
| Fetch URL content | `fetcher.mjs` | `fetchUrl(url)` |
| Extract entities (LLM) | `extractor.mjs` | `extract(text, llm)` |
| Convert document | `converter.mjs` | `convertDocument(filePath)` |

## Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| Entity embedding dims | 384 | `db.mjs` `EMBEDDING_DIMENSIONS` |
| Chunk embedding dims | 768 | `db.mjs` `CHUNK_EMBEDDING_DIMENSIONS` |
| Ollama model | `nomic-embed-text` | `embedder.mjs` |
| Default max search results | 20 | `wiki-search.mjs` |
| FTS5 prefix config | `'2 3'` | `schema.sql` |
| Max traversal depth | 2 | convention |

## References

- [API Quick Reference](references/api-quick-ref.md) — all exported functions with signatures
- [Schema Registry](references/schema-registry.md) — pre-registered types and custom schema registration
- Source: `../src/db.mjs`, `../src/wiki-search.mjs`, `../src/ingest.mjs`, `../src/ingest-file.mjs`
