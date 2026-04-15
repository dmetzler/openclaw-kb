# Module API Contracts: Document Ingestion Pipeline

**Feature**: 009-doc-ingestion-pipeline
**Date**: 2026-04-15

## Module: `converter.mjs` — Document Format Detection & Conversion

### `convertDocument(filePath, options?) → Promise<ConversionResult>`

Detects document format and converts to structured Markdown. Uses docling for PDF/DOCX/PPTX/images; passes through Markdown and text files unchanged.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | `string` | Yes | Absolute path to the document file |
| `options.timeoutMs` | `number` | No | Docling subprocess timeout (default: `120000`) |
| `options.pythonPath` | `string` | No | Path to Python 3 binary (default: `'python3'`) |

**Returns**: `ConversionResult`
```javascript
{
  markdown: string,           // Structured Markdown content
  chunks: Array<{             // Pre-chunked by docling's HierarchicalChunker (only for docling-converted files)
    text: string,             // Chunk text content
    headings: string[],       // Heading hierarchy, e.g. ["Chapter 1", "Section 1.1"]
    contextualized: string    // Heading-prepended text for embedding
  }> | null,                  // null for non-docling files (Markdown, text)
  source: {
    path: string,             // Original file path
    format: string,           // Detected format: 'pdf' | 'docx' | 'pptx' | 'image' | 'markdown' | 'text'
    converter: string         // 'docling' | 'passthrough'
  }
}
```

**Errors**:
| Condition | Error Message |
|-----------|---------------|
| File does not exist | `"File not found: {filePath}"` |
| Unsupported format | `"Unsupported file format: .{ext}. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt"` |
| Python not found | `"Python 3 is required for document conversion. Install from python.org"` |
| Docling not installed | `"docling is required for PDF/DOCX/PPTX conversion. Install with: pip install docling"` |
| Docling conversion error | `"Failed to convert {filePath}: {stderr}"` |
| Subprocess timeout | `"Document conversion timed out after {timeoutMs}ms"` |

---

### `detectFormat(filePath) → string`

Returns the document format based on file extension.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | `string` | Yes | Path to the file |

**Returns**: `'pdf' | 'docx' | 'pptx' | 'image' | 'markdown' | 'text'`

**Errors**: Throws if extension is unsupported.

---

### `isDoclingAvailable() → Promise<boolean>`

Checks if Python 3 and docling are available. Caches the result after first check.

---

## Module: `chunker.mjs` — Semantic Chunking for Non-Docling Content

### `chunkMarkdown(markdown, options?) → Array<Chunk>`

Splits Markdown content into semantically meaningful chunks using heading-boundary chunking. Used for URL-ingested content, plain Markdown files, and backfill of existing wiki pages.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `markdown` | `string` | Yes | Markdown content to chunk |
| `options.source` | `string` | No | Source identifier (file path or URL) |
| `options.maxTokens` | `number` | No | Maximum tokens per chunk (default: `500`) |
| `options.minTokens` | `number` | No | Minimum tokens per chunk before merging with next (default: `50`) |

**Returns**: `Array<Chunk>`
```javascript
{
  text: string,               // Chunk content
  metadata: {
    source: string | null,    // File path or URL
    section: string[],        // Heading hierarchy
    index: number,            // Chunk sequence number (0-based)
    tokenCount: number        // Approximate token count
  }
}
```

**Chunking Algorithm**:
1. Split markdown by heading lines (`# `, `## `, `### `)
2. Track heading hierarchy: when a heading at level N appears, clear levels ≥ N
3. Within each section, split on double-newline paragraph boundaries if section exceeds `maxTokens`
4. Merge adjacent chunks below `minTokens` with the following chunk
5. Assign sequential `index` values (0-based)
6. Token count = `text.split(/\s+/).length / 0.75`

---

### `estimateTokens(text) → number`

Approximate token count using whitespace splitting.

**Returns**: `Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75)`

---

## Module: `embedder.mjs` — Ollama Embedding Client

### `embed(text, options?) → Promise<Float32Array | null>`

Generates a vector embedding for a search query. Adds `search_query: ` prefix.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | `string` | Yes | Text to embed |
| `options.baseUrl` | `string` | No | Ollama URL (default: env `OLLAMA_URL` or `'http://localhost:11434'`) |
| `options.model` | `string` | No | Model name (default: env `OLLAMA_MODEL` or `'nomic-embed-text'`) |
| `options.timeoutMs` | `number` | No | Request timeout (default: env `OLLAMA_TIMEOUT_MS` or `60000`) |

**Returns**: `Float32Array(768)` or `null` if Ollama is unavailable.

**Behavior on Ollama unavailable**: Returns `null`, logs warning via `console.warn`. Does NOT throw.

---

### `embedDocument(text, options?) → Promise<Float32Array | null>`

Generates a vector embedding for a document chunk. Adds `search_document: ` prefix.

Same parameters and error handling as `embed()`.

---

### `embedBatch(texts, options?) → Promise<Array<Float32Array | null>>`

Generates embeddings for multiple document chunks in a single Ollama API call. Adds `search_document: ` prefix to each text.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `texts` | `string[]` | Yes | Texts to embed (batch) |
| `options` | same as `embed()` | No | Same options |

**Returns**: `Array<Float32Array(768) | null>` — one embedding per input text. All `null` if Ollama unavailable.

---

### `isOllamaAvailable(options?) → Promise<boolean>`

Checks if Ollama is reachable and the model is loaded. Caches result for 30 seconds.

---

## Module: `ingest-file.mjs` — File Ingestion Orchestrator

### `ingestFile(filePath, llm, options?) → Promise<IngestResult>`

Orchestrates the full ingestion pipeline for a local document file.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | `string` | Yes | Absolute path to the document file |
| `llm` | `object` | Yes | LLM provider for entity extraction (same as `ingestUrl`'s `llm` parameter) |
| `options.skipEmbedding` | `boolean` | No | Skip embedding generation (default: `false`) |
| `options.verbose` | `boolean` | No | Enable progress output (default: `false`) |

**Returns**: `IngestResult`
```javascript
{
  title: string,              // Extracted document title
  source: string,             // File path
  format: string,             // Detected format
  entities: Array<{           // Created/updated entities
    id: number,
    name: string,
    type: string
  }>,
  relations: Array<{          // Created relations
    id: number,
    source: string,
    target: string,
    type: string
  }>,
  chunks: {
    total: number,            // Total chunks created
    embedded: number          // Chunks with embeddings (0 if Ollama unavailable)
  },
  pages: string[]             // Created wiki page paths
}
```

**Pipeline Steps**:
1. Validate file exists and format is supported
2. Convert document via `converter.convertDocument(filePath)`
3. Archive raw content to `raw/` directory
4. Extract entities via `extractor.extract(markdown, llm)`
5. Create/update wiki pages via `wiki.createPage()` / `wiki.updatePage()`
6. Create/update KG entities and relations via `db.createEntity()` / `db.createRelation()`
7. Delete existing chunks for affected entities (re-ingestion)
8. Create new chunks: use docling chunks if available, else `chunker.chunkMarkdown()`
9. Generate and store embeddings for each chunk (graceful if Ollama unavailable)

---

## Module: `backfill.mjs` — Wiki Backfill CLI Script

### CLI Interface

```bash
node src/backfill.mjs [options]

Options:
  --db <path>       Database path (default: ./jarvis.db)
  --wiki <dir>      Wiki directory (default: ./wiki)
  --dry-run         Show what would be processed without making changes
  --verbose         Show detailed progress output
```

### `backfillWikiPages(options?) → Promise<BackfillResult>`

Programmatic entry point for the backfill script.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options.dbPath` | `string` | No | Database path (default: `'./jarvis.db'`) |
| `options.wikiDir` | `string` | No | Wiki directory (default: `'./wiki'`) |
| `options.dryRun` | `boolean` | No | Preview without changes (default: `false`) |
| `options.verbose` | `boolean` | No | Detailed progress (default: `false`) |

**Returns**: `BackfillResult`
```javascript
{
  processed: number,          // Pages successfully processed
  skipped: number,            // Pages already having chunks
  failed: number,             // Pages that failed processing
  total: number               // Total pages found
}
```

**Pre-conditions**: Ollama must be reachable. Script validates and exits with error if not.

---

## Extended Module: `db.mjs` — New Functions

### `insertChunk(entityId, chunkIndex, content, metadata) → number`

| Parameter | Type | Description |
|-----------|------|-------------|
| `entityId` | `number` | FK to entities.id |
| `chunkIndex` | `number` | Position within entity (0-based) |
| `content` | `string` | Chunk text |
| `metadata` | `object` | JSON-serializable metadata |

**Returns**: Inserted chunk ID.

---

### `getChunks(entityId) → Array<ChunkRecord>`

Returns all chunks for an entity, ordered by `chunk_index` ASC.

---

### `deleteChunksForEntity(entityId) → number`

Returns number of deleted chunks. CASCADE deletes vec_chunks entries and FTS5 index entries.

---

### `upsertChunkEmbedding(chunkId, vector) → void`

| Parameter | Type | Description |
|-----------|------|-------------|
| `chunkId` | `number` | FK to chunks.id |
| `vector` | `Float32Array` | Must be exactly 768 dimensions |

**Errors**: Throws if `vector.length !== 768`.

---

### `findNearestChunks(queryVector, k?) → Array<{chunk_id, distance}>`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `queryVector` | `Float32Array` | — | 768-dim query vector |
| `k` | `number` | `20` | Number of nearest neighbors |

**Returns**: Array sorted by distance ASC (nearest first).

---

### `getChunkWithEntity(chunkId) → {chunk, entity} | null`

Returns chunk record joined with its parent entity. Used to enrich search results with entity context.

---

## Extended Module: `wiki-search.mjs` — Updated `searchSemantic()`

### Updated Signature

```javascript
export function searchSemantic(query, options = {}) {
  const {
    ftsWeight = 0.7,
    vectorWeight = 0.3,
    queryVector,              // DEPRECATED: still accepted for backward compat
    maxResults = 20,
    minScore = 0.0
  } = options;
  // ...
}
```

**New behavior**: If `queryVector` is not provided, the function calls `embedder.embed(query)` internally to generate the query embedding. Results now come from `findNearestChunks()` instead of `findNearestVectors()`.

**Return format change**: Each result now includes `chunk` context:
```javascript
{
  id: number,                 // Entity ID (for backward compat)
  name: string,               // Entity name
  type: string,               // Entity type
  score: number,              // Combined score
  source: string,             // 'fts5' | 'vec_chunks' | 'combined'
  chunk: {                    // NEW: chunk context (null for FTS-only results)
    id: number,
    text: string,
    section: string[],
    chunkIndex: number
  } | null
}
```
