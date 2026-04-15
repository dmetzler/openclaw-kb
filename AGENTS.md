# openclaw-kb Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-15

## Active Technologies
- JavaScript (ES Modules), Node.js 18+ + `better-sqlite3` (SQLite driver), `sqlite-vec` (vec0 vector extension) (001-sqlite-db-layer)
- SQLite (single file: `jarvis.db`), WAL mode, foreign keys enforced (001-sqlite-db-layer)
- SQLite (`jarvis.db` via `db.mjs`), Markdown files on disk (`wiki/`, `raw/`) (002-wiki-ingestion-pipeline)
- JavaScript (ES Modules), Node.js 18+ + `better-sqlite3` (via `db.mjs`), `sqlite-vec` (via `db.mjs`), Node.js built-ins (`fs`, `path`, `readline`) (003-kb-export-import)
- SQLite (`jarvis.db` via `db.mjs`), flat files on disk (JSONL, CSV, JSON) (003-kb-export-import)
- JavaScript (ES Modules), Node.js 18+ + `better-sqlite3` (SQLite driver), `sqlite-vec` (vector extension), `vitest` (test runner) (004-generic-data-records)
- JavaScript (ES Modules), Node.js 18+ + `better-sqlite3` (via `db.mjs`), `sqlite-vec` (vec0 extension, via `db.mjs`), existing `db.mjs` abstraction layer (35 exported functions) (005-hybrid-search)
- SQLite (`jarvis.db`), WAL mode, foreign keys enforced. FTS5 virtual table (`search_index`) with prefix='2 3'. vec0 virtual table (`vec_embeddings`) with 384-dim cosine distance. (005-hybrid-search)
- JavaScript (ES Modules), Node.js 18+ + `better-sqlite3` (SQLite driver, via `db.mjs`), `sqlite-vec` (vec0 vector extension, via `db.mjs`), `vitest` 4.1.4 (test runner) (005-hybrid-search)
- JavaScript (ES Modules, `.mjs`), Node.js 18+ + `better-sqlite3` (via `db.mjs`), `sqlite-vec` (via `db.mjs`), Node.js built-ins (`fs`, `path`, `url`, `process`) (006-kg-migration)
- SQLite (`jarvis.db`), WAL mode, foreign keys enforced; input is a JSON file (`kg-store.json`) (006-kg-migration)
- Markdown (documentation content), Python 3.x (MkDocs toolchain), YAML (MkDocs config) + `mkdocs` (static site generator), `mkdocs-material` (Material theme), `pymdown-extensions` (Markdown extensions for admonitions, code blocks, Mermaid) (008-mkdocs-documentation)
- N/A — static Markdown files in `docs/` rendered to HTML (008-mkdocs-documentation)
- JavaScript (ES Modules, `.mjs`), Node.js 18+ + Python 3.10+ (docling subprocess) + `better-sqlite3` (via `db.mjs`), `sqlite-vec` (vec0 extension, via `db.mjs`), `docling` (Python package, called via `child_process.spawn`), Ollama HTTP API (nomic-embed-text model) (009-doc-ingestion-pipeline)
- SQLite (`jarvis.db` via `db.mjs`), WAL mode, foreign keys enforced. New tables: `chunks` (content storage), `vec_chunks` (vec0 virtual table, 768-dim cosine). Markdown files on disk (`wiki/`, `raw/`) (009-doc-ingestion-pipeline)
- JavaScript (ES Modules, `.mjs`), Node.js 18+ + `better-sqlite3` (existing), `sqlite-vec` (existing), `ajv` + `ajv-formats` (new) (010-data-schema-registry)

- (001-sqlite-db-layer)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 010-data-schema-registry: Added JavaScript (ES Modules, `.mjs`), Node.js 18+ + `better-sqlite3` (existing), `sqlite-vec` (existing), `ajv` + `ajv-formats` (new)
- 009-doc-ingestion-pipeline: Added JavaScript (ES Modules, `.mjs`), Node.js 18+ + Python 3.10+ (docling subprocess) + `better-sqlite3` (via `db.mjs`), `sqlite-vec` (vec0 extension, via `db.mjs`), `docling` (Python package, called via `child_process.spawn`), Ollama HTTP API (nomic-embed-text model)
- 008-mkdocs-documentation: Added Markdown (documentation content), Python 3.x (MkDocs toolchain), YAML (MkDocs config) + `mkdocs` (static site generator), `mkdocs-material` (Material theme), `pymdown-extensions` (Markdown extensions for admonitions, code blocks, Mermaid)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
