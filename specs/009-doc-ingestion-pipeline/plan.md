# Implementation Plan: Document Ingestion Pipeline with Semantic Chunking & Embeddings

**Branch**: `009-doc-ingestion-pipeline` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-doc-ingestion-pipeline/spec.md`

## Summary

Major enhancement to the OpenClaw KB ingestion pipeline: support for arbitrary document formats (PDF, DOCX, PPTX, images) via docling (Python subprocess), semantic chunking that preserves document structure, and 768-dimensional vector embeddings via Ollama's nomic-embed-text model. The existing URL ingestion and hybrid search are extended — not replaced — to incorporate chunk-level granularity. All new modules follow the project's established pattern: flat .mjs files in `src/`, function-based exports, SQLite storage via `db.mjs`, and vitest tests.

## Technical Context

**Language/Version**: JavaScript (ES Modules, `.mjs`), Node.js 18+ + Python 3.10+ (docling subprocess)
**Primary Dependencies**: `better-sqlite3` (via `db.mjs`), `sqlite-vec` (vec0 extension, via `db.mjs`), `docling` (Python package, called via `child_process.spawn`), Ollama HTTP API (nomic-embed-text model)
**Storage**: SQLite (`jarvis.db` via `db.mjs`), WAL mode, foreign keys enforced. New tables: `chunks` (content storage), `vec_chunks` (vec0 virtual table, 768-dim cosine). Markdown files on disk (`wiki/`, `raw/`)
**Testing**: `vitest` 4.1.4 (test runner), unit tests in `tests/unit/`, integration tests in `tests/integration/`
**Target Platform**: Linux server (N150), also macOS for development
**Project Type**: CLI / library (programmatic function calls + CLI scripts)
**Performance Goals**: Embedding generation ~200–500ms per chunk on CPU (Ollama on N150). Docling conversion ~6 min per 9-page PDF (acceptable for batch). Chunk-level KNN search <100ms for k=20 over 10K chunks.
**Constraints**: No GPU required (CPU inference via Ollama). Graceful degradation when Ollama or docling unavailable. Single-threaded sequential processing for backfill (simplicity over speed). Embedding dimension mismatch: existing `vec_embeddings` uses 384-dim; new `vec_chunks` uses 768-dim (intentional — different models).
**Scale/Scope**: Hundreds of wiki pages, thousands of chunks after backfill. Documents up to 100+ pages producing thousands of chunks per document. 5 new source modules, 1 Python helper script, 1 SQL migration, ~8 test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality — ✅ PASS

- All new modules (`converter.mjs`, `chunker.mjs`, `embedder.mjs`, `ingest-file.mjs`, `backfill.mjs`) will include JSDoc documentation for every exported function.
- Single-responsibility: each module handles one concern (conversion, chunking, embedding, orchestration, backfill).
- No dead code — new modules only; existing modules extended minimally.
- Descriptive naming: `convertDocument()`, `chunkMarkdown()`, `embed()`, `embedBatch()`, `ingestFile()`.

### II. Testing Standards — ✅ PASS

- Every new module will have corresponding unit tests (mocked external dependencies).
- Integration tests will verify the full pipeline: file → conversion → chunking → embedding → storage → search.
- External services (Ollama, docling) will be mocked in unit tests; integration tests may use real services with skip-if-unavailable guards.
- Test names will follow the existing convention: descriptive scenario names.
- New test files target ≥80% line coverage for changed files.

### III. User Experience Consistency — ✅ PASS

- `ingestFile()` follows the same pattern as existing `ingestUrl()` — similar signature, similar return value, similar progress output.
- Error messages are actionable: "docling not installed. Install with: pip install docling", "Ollama not reachable at http://localhost:11434. Start with: ollama serve".
- Backfill script provides progress output: "Processing 5/42: wiki/entities/python.md".
- Output formats remain consistent (Markdown wiki pages, JSON metadata).

### IV. Performance Requirements — ✅ PASS

- Performance targets defined above: embedding ~200–500ms/chunk, KNN search <100ms for k=20.
- Chunking uses streaming (JSONL from Python subprocess) — no unbounded memory growth.
- Batch embedding via Ollama's batch API (`input: string[]`) minimizes HTTP overhead.
- Database operations use transactions for atomic chunk replacement (FR-018).
- Backfill processes sequentially with progress reporting — no unbounded concurrency.

### Technology Stack — ✅ PASS

- `docling` (Python): well-maintained by DS4SD/IBM, MIT license, actively developed (v2.88.0, Apr 2026). Justified: only mature library supporting PDF+DOCX+PPTX+image→Markdown with structural preservation.
- Ollama: local embedding server already assumed by spec. No new Node.js dependencies — uses native `fetch`.
- No new npm runtime dependencies required.

### Development Workflow — ✅ PASS

- Feature branch `009-doc-ingestion-pipeline` already created.
- All changes via PR with description referencing spec.

**Gate result**: ALL PASS — proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/009-doc-ingestion-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CLI contract, module API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── db.mjs               # EXTEND: add chunk CRUD, vec_chunks search functions
├── schema.sql           # UNCHANGED (base schema)
├── migrations/
│   └── 002-chunks-and-embeddings.sql  # NEW: chunks table, vec_chunks vec0 table, FTS5 triggers
├── converter.mjs        # NEW: document format detection + docling subprocess wrapper
├── chunker.mjs          # NEW: semantic chunking (hierarchical for docling, heading-boundary for markdown)
├── embedder.mjs         # NEW: Ollama embedding API client (embed, embedBatch)
├── ingest.mjs           # EXTEND: add chunking + embedding stages to ingestUrl()
├── ingest-file.mjs      # NEW: ingestFile() orchestrator for local documents
├── wiki-search.mjs      # EXTEND: update searchSemantic() for chunk-level vec_chunks search
├── backfill.mjs         # NEW: CLI script to backfill existing wiki pages with chunks + embeddings
└── scripts/
    └── convert_and_chunk.py  # NEW: Python helper — docling conversion + HierarchicalChunker

tests/
├── unit/
│   ├── converter.test.mjs   # NEW: document converter unit tests
│   ├── chunker.test.mjs     # NEW: semantic chunker unit tests
│   ├── embedder.test.mjs    # NEW: embedder unit tests (mocked Ollama)
│   └── chunks-db.test.mjs   # NEW: chunk DB operations unit tests
├── integration/
│   ├── ingest-file.test.mjs # NEW: file ingestion end-to-end
│   ├── chunk-search.test.mjs # NEW: chunk-level semantic search
│   ├── backfill.test.mjs    # NEW: backfill script integration test
│   └── url-chunking.test.mjs # NEW: enhanced URL ingestion with chunks
└── fixtures/
    ├── sample.pdf           # NEW: test PDF for conversion
    ├── sample.docx          # NEW: test DOCX for conversion
    └── sample.md            # NEW: test markdown for pass-through
```

**Structure Decision**: Flat module structure in `src/` matching the existing project pattern — no subdirectories for source modules. Each new module is a single `.mjs` file with function-based exports. The Python helper script goes in `src/scripts/` to keep it separate from the Node.js modules.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Two embedding dimensions (384 for `vec_embeddings`, 768 for `vec_chunks`) | nomic-embed-text native output is 768-dim; existing entity embeddings use 384-dim from a different model/era | Rewriting all existing 384-dim embeddings would break backward compatibility and require re-embedding all entities. The two tables serve different purposes (entity-level vs chunk-level). |
| Python subprocess dependency (docling) | No Node.js library can convert PDF/DOCX/PPTX to structured Markdown with table/heading/section preservation | Pure Node.js PDF parsers (pdf-parse, pdfjs) extract raw text without structural information. docling is the only mature solution for multi-format structured conversion. |
