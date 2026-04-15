# Data Model: Document Ingestion Pipeline with Semantic Chunking & Embeddings

**Feature**: 009-doc-ingestion-pipeline
**Date**: 2026-04-15

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│   entities   │1     *│    chunks    │1     1│   vec_chunks     │
│──────────────│───────│──────────────│───────│──────────────────│
│ id (PK)      │       │ id (PK)      │       │ chunk_id (PK,FK) │
│ name         │       │ entity_id(FK)│       │ embedding[768]   │
│ type         │       │ chunk_index  │       │ (cosine distance)│
│ metadata     │       │ content      │       └──────────────────┘
│ created_at   │       │ metadata     │
│ updated_at   │       │ created_at   │
└──────┬───────┘       └──────┬───────┘
       │                      │
       │1                     │*
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│vec_embeddings│       │ search_index │
│──────────────│       │──────────────│
│ entity_id(PK)│       │ name         │
│embedding[768]│       │ content_text │
│(cosine dist) │       │ source_table │
└──────────────┘       │ source_id    │
                       └──────────────┘
```

## New Table: `chunks`

Stores semantically meaningful segments of document content, linked to a parent entity.

```sql
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL CHECK(length(content) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunks_entity ON chunks(entity_id);
CREATE UNIQUE INDEX idx_chunks_entity_index ON chunks(entity_id, chunk_index);
```

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique chunk identifier |
| `entity_id` | INTEGER | NOT NULL, FK → entities(id) CASCADE | Parent entity this chunk belongs to |
| `chunk_index` | INTEGER | NOT NULL, UNIQUE(entity_id, chunk_index) | Position within the entity's chunk sequence (0-based) |
| `content` | TEXT | NOT NULL, CHECK(length > 0) | The chunk text content |
| `metadata` | TEXT | DEFAULT '{}' | JSON object with: `source` (file path or URL), `section` (heading hierarchy as string array), `tokenCount` (approximate) |
| `created_at` | TEXT | DEFAULT datetime('now') | Creation timestamp |

### Metadata JSON Schema

```json
{
  "source": "string — file path or URL",
  "section": ["string — heading hierarchy, e.g. ['Chapter 1', 'Introduction']"],
  "tokenCount": "number — approximate token count (words / 0.75)",
  "pageNumber": "number | null — page number for PDFs",
  "chunkMethod": "string — 'hierarchical' | 'heading-boundary'"
}
```

### Cascade Behavior

- **Entity deleted** → All chunks for that entity are automatically deleted (ON DELETE CASCADE)
- **Entity re-ingested** → Application code deletes existing chunks first (`deleteChunksForEntity(entityId)`), then inserts new chunks within a transaction (FR-018)

## New Virtual Table: `vec_chunks`

Stores 768-dimensional vector embeddings for chunk-level semantic search.

```sql
CREATE VIRTUAL TABLE vec_chunks USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  embedding float[768] distance_metric=cosine
);
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `chunk_id` | INTEGER | PRIMARY KEY, references chunks(id) |
| `embedding` | float[768] | 768-dimensional vector (nomic-embed-text native output), cosine distance metric |

### Notes

- **768 dimensions** — same as the existing `vec_embeddings` table. Both use nomic-embed-text's native 768-dim output.
- **Cosine distance** — same metric as existing `vec_embeddings`. Range: [0, 2] where 0 = identical.
- **No FK constraint** — vec0 virtual tables do not support foreign key constraints. Application code must ensure referential integrity (delete vec_chunks entry when chunk is deleted).

## FTS5 Integration: Triggers for `chunks`

Auto-sync chunk content to the `search_index` FTS5 table, following the exact pattern used by `entities` and `data_records`.

```sql
CREATE TRIGGER chunks_search_index_insert
AFTER INSERT ON chunks
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (
    json_extract(NEW.metadata, '$.section[0]'),
    NEW.content,
    'chunks',
    NEW.id
  );
END;

CREATE TRIGGER chunks_search_index_update
AFTER UPDATE ON chunks
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'chunks' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (
    json_extract(NEW.metadata, '$.section[0]'),
    NEW.content,
    'chunks',
    NEW.id
  );
END;

CREATE TRIGGER chunks_search_index_delete
AFTER DELETE ON chunks
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'chunks' AND source_id = OLD.id;
END;
```

### FTS5 Field Mapping

| FTS5 Column | Chunk Source | Description |
|-------------|-------------|-------------|
| `name` | `json_extract(metadata, '$.section[0]')` | Top-level section heading (or NULL if no headings) |
| `content_text` | `content` | Full chunk text — this is the primary searchable content |
| `source_table` | `'chunks'` | Literal string identifying the source table |
| `source_id` | `id` | Chunk's primary key |

## Migration: `002-chunks-and-embeddings.sql`

Full migration file to be placed in `src/migrations/`:

```sql
-- Migration 002: Chunks and Chunk-Level Embeddings
-- Adds chunk storage, 768-dim vector embeddings, and FTS5 indexing
-- for semantic chunking and chunk-level search.

-- Step 1: Create chunks table
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL CHECK(length(content) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_entity ON chunks(entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chunks_entity_index ON chunks(entity_id, chunk_index);

-- Step 2: Create vec_chunks virtual table (768-dim, cosine distance)
CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  embedding float[768] distance_metric=cosine
);

-- Step 3: Create FTS5 triggers for chunks
CREATE TRIGGER IF NOT EXISTS chunks_search_index_insert
AFTER INSERT ON chunks
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (
    json_extract(NEW.metadata, '$.section[0]'),
    NEW.content,
    'chunks',
    NEW.id
  );
END;

CREATE TRIGGER IF NOT EXISTS chunks_search_index_update
AFTER UPDATE ON chunks
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'chunks' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (
    json_extract(NEW.metadata, '$.section[0]'),
    NEW.content,
    'chunks',
    NEW.id
  );
END;

CREATE TRIGGER IF NOT EXISTS chunks_search_index_delete
AFTER DELETE ON chunks
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'chunks' AND source_id = OLD.id;
END;
```

## Extensions to `db.mjs`

### New Constant

```javascript
export const CHUNK_EMBEDDING_DIMENSIONS = 768;
```

### New Exported Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `insertChunk` | `(entityId, chunkIndex, content, metadata) → number` | Inserts a chunk, returns chunk ID |
| `getChunks` | `(entityId) → Array<{id, entity_id, chunk_index, content, metadata, created_at}>` | Returns all chunks for an entity, ordered by chunk_index |
| `deleteChunksForEntity` | `(entityId) → number` | Deletes all chunks for an entity, returns count deleted |
| `upsertChunkEmbedding` | `(chunkId, vector: Float32Array) → void` | Inserts or replaces 768-dim embedding for a chunk |
| `findNearestChunks` | `(queryVector: Float32Array, k?: number) → Array<{chunk_id, distance}>` | KNN search on vec_chunks, returns k nearest chunks |
| `getChunkWithEntity` | `(chunkId) → {chunk, entity} | null` | Returns chunk joined with its parent entity (for search results) |

### Existing Table — `entities` (unchanged)

```sql
CREATE TABLE entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) > 0),
  type TEXT NOT NULL CHECK(length(type) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

No changes needed. Chunks reference entities via `entity_id` FK.

### Existing Table — `vec_embeddings` (unchanged)

```sql
CREATE VIRTUAL TABLE vec_embeddings USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[768] distance_metric=cosine
);
```

Remains for entity-level embeddings. Both `vec_embeddings` and `vec_chunks` use 768 dimensions.

### Existing Table — `search_index` (unchanged structure, new content)

```sql
CREATE VIRTUAL TABLE search_index USING fts5(
  name,
  content_text,
  source_table,
  source_id UNINDEXED,
  prefix='2 3'
);
```

No structural changes. The new triggers automatically index chunk content with `source_table = 'chunks'`.

## Validation Rules

| Rule | Enforcement | Error |
|------|-------------|-------|
| Chunk content must be non-empty | `CHECK(length(content) > 0)` | SQLite constraint error |
| Chunk index must be unique per entity | `UNIQUE(entity_id, chunk_index)` | SQLite constraint error |
| Entity must exist for chunk insertion | FK constraint | SQLite foreign key error |
| Embedding dimension must be 768 | Application-level check in `upsertChunkEmbedding()` | `"Expected 768-dimensional embedding, got ${vector.length}"` |
| Metadata must be valid JSON | Application-level validation before insert | `"Invalid metadata: must be a JSON object"` |

## State Transitions

### Entity Re-Ingestion Flow

```
Entity exists with chunks
    │
    ▼
BEGIN TRANSACTION
    │
    ├── deleteChunksForEntity(entityId)  ─── CASCADE deletes vec_chunks entries
    │                                    ─── Triggers delete FTS5 entries
    │
    ├── [Update entity if needed]
    │
    ├── For each new chunk:
    │   ├── insertChunk(entityId, index, content, metadata)  ─── Trigger inserts FTS5 entry
    │   └── upsertChunkEmbedding(chunkId, vector)            ─── If Ollama available
    │
    └── COMMIT
```

### New Document Ingestion Flow

```
ingestFile(filePath) or ingestUrl(url)
    │
    ├── Convert to Markdown (docling or readability)
    ├── Extract entities via LLM
    ├── Create/update wiki pages
    ├── Create/update KG entities
    │
    ├── Chunk content:
    │   ├── If docling source → HierarchicalChunker (Python)
    │   └── If readability/markdown → heading-boundary (Node.js)
    │
    ├── For each chunk:
    │   ├── insertChunk(entityId, index, content, metadata)
    │   └── embed + upsertChunkEmbedding(chunkId, vector)  [graceful if Ollama down]
    │
    └── Return result summary
```
