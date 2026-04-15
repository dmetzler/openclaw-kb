# Research: Document Ingestion Pipeline with Semantic Chunking & Embeddings

**Feature**: 009-doc-ingestion-pipeline
**Date**: 2026-04-15

## Research Task 1: Docling — Document Conversion via Python Subprocess

### Decision: Use docling v2.88.0 via a thin Python wrapper script called from Node.js using `child_process.spawn`

### Rationale

Docling (MIT license, maintained by DS4SD/IBM) is the only mature library that converts PDF, DOCX, PPTX, and images to structured Markdown while preserving document hierarchy (headings, tables, sections, page boundaries). No Node.js-native alternative provides comparable structural fidelity.

The project already has a Python dependency chain (MkDocs for documentation), so adding a Python package is not a new class of dependency.

### Key Findings

- **Installation**: `pip install docling` (Python 3.10+). First run downloads HuggingFace AI models automatically.
- **Supported inputs**: PDF, DOCX, PPTX, XLSX, HTML, images (PNG/JPEG/TIFF with OCR), Markdown, CSV, LaTeX, audio.
- **CLI**: `docling document.pdf --to md --to json --output dir/` — converts and writes output files.
- **Python API**: `DocumentConverter().convert(path)` returns a `DoclingDocument` with `export_to_markdown()`, `export_to_dict()`, etc.
- **Performance**: ~6 minutes for a 9-page PDF on the N150 server (CPU only). Acceptable for batch ingestion.
- **OCR**: Built-in via EasyOCR or Tesseract engines. Enabled by default for images; can be forced for PDFs with `--force-ocr`.

### Implementation Approach

A thin Python helper script (`src/scripts/convert_and_chunk.py`) that:
1. Accepts a file path as CLI argument
2. Converts via `DocumentConverter`
3. Chunks via `HierarchicalChunker`
4. Outputs JSON to stdout: `{ "markdown": "...", "chunks": [{ "text": "...", "headings": [...], "contextualized": "..." }] }`

Node.js calls this via `child_process.spawn('python3', ['src/scripts/convert_and_chunk.py', filePath])`:
- Use `spawn` (not `exec`) to handle large stdout output via streaming.
- Set `PYTHONUNBUFFERED=1` environment variable.
- Parse JSON from stdout; capture stderr for error reporting.
- Timeout: 120 seconds default (configurable via `DOCLING_TIMEOUT_MS` env var).

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| `pdf-parse` (Node.js) | Extracts raw text only — no headings, tables, or structural metadata |
| `pdfjs-dist` (Node.js) | Low-level PDF rendering, no semantic structure extraction |
| `mammoth` (Node.js) | DOCX only, no PDF/PPTX support |
| Docling CLI directly | No chunking in CLI output — would require a second Python invocation for chunking |
| Docling as HTTP microservice | Overengineered for a single-user CLI tool; adds deployment complexity |

---

## Research Task 2: Semantic Chunking Strategy

### Decision: Two chunking strategies — HierarchicalChunker for docling output, heading-boundary chunker for non-docling Markdown

### Rationale

Docling's `HierarchicalChunker` operates on `DoclingDocument` objects (the internal structured representation), not on raw Markdown strings. It produces one chunk per document element (paragraph, table, list) with heading hierarchy metadata — ideal for structure-preserving chunking.

For content not processed by docling (URLs via readability, plain Markdown files, backfill of existing wiki pages), a simpler heading-boundary chunker splits on `h1`/`h2`/`h3` headings and paragraph boundaries. This is implemented in Node.js.

### Key Findings — HierarchicalChunker

- **Import**: `from docling.chunking import HierarchicalChunker`
- **Input**: `DoclingDocument` object (from `converter.convert(path).document`)
- **Output**: Yields `DocChunk` objects:
  - `chunk.text`: serialized chunk content (Markdown-like)
  - `chunk.meta.headings`: list of parent heading strings, e.g., `["Title", "Section 1", "Subsection 1.1"]`
  - `chunk.meta.doc_items`: references to source document items
  - `chunk.meta.origin`: source file information
- **`contextualize(chunk)`**: Prepends heading hierarchy to chunk text, producing text ideal for embedding:
  - Raw: `"Machine learning is a subset of AI."`
  - Contextualized: `"ML Guide\nIntroduction\nMachine learning is a subset of AI."`
- **No token limits**: Creates one chunk per element. Chunks may be smaller or larger than 200–500 tokens.
- **Alternative — HybridChunker**: Token-aware splitting/merging with `max_tokens` parameter and HuggingFace tokenizer. More complex but enforces token budgets. Could be used instead if token-size consistency is critical.

### Key Findings — Heading-Boundary Chunker (Node.js)

For Markdown not processed by docling (URLs, plain .md files, backfill):
- Split on heading boundaries: lines starting with `#`, `##`, `###`
- Within sections, split on double-newline paragraph boundaries if section exceeds 500 tokens
- Each chunk includes metadata: `{ section: "heading text", index: N }`
- Token count approximation: `wordCount / 0.75` (per spec assumption)

### Decision on HierarchicalChunker vs HybridChunker

Use **HierarchicalChunker** (not HybridChunker) because:
1. HybridChunker requires a HuggingFace tokenizer dependency — adds Python package complexity
2. The spec states 200–500 token target as guidance, not a hard constraint
3. HierarchicalChunker preserves document structure more faithfully
4. The `contextualize()` method produces embedding-ready text with heading context

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| HybridChunker | Requires HuggingFace tokenizer, adds complexity. Token-size enforcement is not critical for this use case. |
| LangChain text splitters | Would add a heavy npm dependency for a single function. Rolling a heading-boundary splitter in Node.js is simpler. |
| Fixed-size token chunking | Breaks document structure — chunks might split mid-sentence or mid-table |
| Sentence-level chunking | Too granular — each sentence as a chunk loses section context |

---

## Research Task 3: Ollama Embedding API — nomic-embed-text

### Decision: Use Ollama's `POST /api/embed` endpoint with nomic-embed-text model for 768-dimensional embeddings

### Rationale

Ollama is already assumed by the spec as the embedding provider, running locally on the N150 server. The `/api/embed` endpoint supports batch embedding (multiple texts in one request) and is the modern successor to the deprecated `/api/embeddings` endpoint.

### Key Findings

- **Endpoint**: `POST http://localhost:11434/api/embed`
- **Request**: `{ "model": "nomic-embed-text", "input": "text" | ["text1", "text2", ...] }`
- **Response**: `{ "model": "...", "embeddings": [[0.1, 0.2, ...], ...], "total_duration": 14143917, "prompt_eval_count": 24 }`
- **Batch support**: Yes — pass `string[]` to `input`. Server processes in parallel via goroutines.
- **Dimensions**: nomic-embed-text native output is **768 dimensions**. Reducible via `dimensions` parameter.
- **Normalization**: Embeddings are L2-normalized server-side.
- **Max context**: 8192 tokens per input text.
- **Task prefixes**: nomic-embed-text benefits from task instruction prefixes:
  - `search_document: <text>` — for documents being indexed
  - `search_query: <text>` — for search queries
  These improve retrieval quality. The embedder module should add them automatically.

### Error Handling

| Error | HTTP Status | Handling |
|-------|------------|----------|
| Ollama not running | N/A (`ECONNREFUSED`) | Return `null`, log warning, continue pipeline without embeddings |
| Model not pulled | 404 | Throw descriptive error: "Model not found. Pull with: ollama pull nomic-embed-text" |
| Request timeout | N/A (`AbortError`) | Return `null`, log warning |
| Invalid input | 400 | Throw error (programming bug) |
| Server overloaded | 503 | Retry once after 1s, then return `null` with warning |

### Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server base URL |
| `OLLAMA_MODEL` | `nomic-embed-text` | Embedding model name |
| `OLLAMA_EMBED_DIMENSIONS` | `768` | Expected embedding dimensions |
| `OLLAMA_TIMEOUT_MS` | `60000` | Per-request timeout in milliseconds |

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| `ollama` npm package | Adds a runtime dependency. Native `fetch` is sufficient for a single endpoint. |
| OpenAI-compatible `/v1/embeddings` | Ollama supports this, but `/api/embed` is the native endpoint with richer response. |
| Local ONNX inference (e.g., `@xenova/transformers`) | Would avoid Ollama dependency but adds model management complexity. Ollama is already required by the spec. |

---

## Research Task 4: Database Schema Extension — Chunks and Chunk Embeddings

### Decision: New migration `002-chunks-and-embeddings.sql` adding `chunks` table and `vec_chunks` vec0 virtual table with 768 dimensions

### Rationale

The existing pattern (migration files in `src/migrations/`, sequential numbering, FTS5 trigger integration) is well-established and should be followed exactly.

### Key Findings — Existing Patterns

- **Migration naming**: `NNN-description.sql` (version from first 3 chars)
- **Existing migration**: `001-generic-data-records.sql` — adds `data_sources`, `data_records` tables with FTS5 triggers
- **Vec0 pattern**: `CREATE VIRTUAL TABLE vec_embeddings USING vec0(entity_id INTEGER PRIMARY KEY, embedding float[768] distance_metric=cosine)`
- **FTS5 trigger pattern**: INSERT/UPDATE/DELETE triggers that sync content to `search_index` table
- **Schema version tracking**: `schema_migrations` table with `version`, `name`, `applied_at`
- **Current embedding dimension**: `EMBEDDING_DIMENSIONS = 768` in `db.mjs` — for entity-level embeddings

### Design Decisions

1. **New table `chunks`**: `id`, `entity_id` (FK CASCADE), `chunk_index`, `content`, `metadata` (JSON), `created_at`
2. **New vec0 table `vec_chunks`**: `chunk_id` INTEGER PRIMARY KEY, `embedding float[768] distance_metric=cosine`
3. **768 dimensions**: Same as `vec_embeddings` (also 768-dim). Constant `CHUNK_EMBEDDING_DIMENSIONS = 768`.
4. **FTS5 triggers**: Auto-sync chunk content to `search_index` with `source_table = 'chunks'`
5. **CASCADE delete**: Deleting an entity cascades to its chunks; deleting a chunk cascades to its vec_chunks entry.

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Reuse `vec_embeddings` table for chunks | Different granularity — entity-level vs chunk-level embeddings serve different search purposes. Separate tables allow independent KNN queries. |
| Add chunks as a JSON column on entities | Loses queryability, can't index in FTS5, can't do KNN search per chunk |
| Separate database file for chunks | Breaks single-file simplicity of `jarvis.db`, complicates transactions |

---

## Research Task 5: Extending Existing Modules — Minimal Surface Area

### Decision: Extend `db.mjs`, `ingest.mjs`, and `wiki-search.mjs` minimally; create new modules for new concerns

### Rationale

Following the single-responsibility principle and the existing project pattern of flat modules, new functionality goes in new files. Existing files are only extended where the new functionality is a natural continuation of their existing responsibility.

### Extensions to `db.mjs`

Add 5 new functions (bringing total from 35 to 40):
- `insertChunk(entityId, chunkIndex, content, metadata)` → returns chunk ID
- `getChunks(entityId)` → returns chunk records for an entity
- `deleteChunksForEntity(entityId)` → removes all chunks for an entity
- `upsertChunkEmbedding(chunkId, vector)` → inserts/updates 768-dim vector
- `findNearestChunks(queryVector, k)` → KNN search on vec_chunks

Add 1 new constant:
- `CHUNK_EMBEDDING_DIMENSIONS = 768`

### Extensions to `ingest.mjs`

After entity creation in `ingestUrl()` and `ingestText()`:
1. Chunk the content via `chunker.mjs`
2. Store chunks via `db.insertChunk()`
3. Generate embeddings via `embedder.mjs` (graceful if Ollama unavailable)
4. Store embeddings via `db.upsertChunkEmbedding()`

### Extensions to `wiki-search.mjs`

Update `searchSemantic()`:
1. Embed query via `embedder.embed(query)` (instead of expecting pre-computed `queryVector`)
2. Search `vec_chunks` via `db.findNearestChunks()` instead of `db.findNearestVectors()`
3. Return chunk-level results with parent entity context
4. Fallback to FTS5 if Ollama unavailable

---

## Research Task 6: Python Script Integration and Error Handling

### Decision: Validate docling/Python availability at runtime with actionable error messages; never fail the pipeline for optional dependencies

### Key Findings

- **Python detection**: Check `python3 --version` via `execFileSync` at module load time. Cache result.
- **Docling detection**: Check `python3 -c "import docling; print(docling.__version__)"` at first use. Cache result.
- **Error hierarchy**:
  - Python not found → "Python 3 is required for document conversion. Install from python.org"
  - Docling not installed → "docling is required for PDF/DOCX/PPTX conversion. Install with: pip install docling"
  - Docling conversion error → "Failed to convert {file}: {stderr}" (with truncated stderr)
  - File not found → "File not found: {path}"
  - Unsupported format → "Unsupported file format: .{ext}. Supported: .pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt"

### Task Prefix Strategy for nomic-embed-text

Based on Nomic's documentation, embeddings improve when prefixed with task instructions:
- **Indexing chunks**: `search_document: <chunk text>`
- **Search queries**: `search_query: <query text>`

The embedder module will add these automatically:
- `embed(text)` → for queries (adds `search_query: ` prefix)
- `embedDocument(text)` → for document chunks (adds `search_document: ` prefix)
- `embedBatch(texts)` → for batch document chunks (adds `search_document: ` prefix to each)
