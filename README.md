# OpenClaw Knowledge Base

**A 3-tier personal knowledge system for AI agents.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)]()

---

## Overview

OpenClaw KB is a portable, single-file knowledge base built on SQLite. It combines a **knowledge graph** (entities and relations with recursive traversal), a **data lake** (generic typed records with JSON Schema validation), and a **semantic search index** (FTS5 full-text + vec0 vector embeddings) into one unified database — `jarvis.db`.

Wiki pages are auto-generated as Markdown files compatible with [Obsidian](https://obsidian.md), so you can browse and edit your knowledge base with any Markdown editor. The system is designed as the memory layer for AI agents like [OpenClaw](https://github.com/dmetzler/openclaw), but works equally well as a standalone personal knowledge manager.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OpenClaw KB                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  Tier 1: KG  │  │ Tier 2: DL  │  │ Tier 3: Search │  │
│  │  ─────────── │  │ ─────────── │  │ ────────────── │  │
│  │  entities    │  │ data_records│  │ FTS5 (BM25)    │  │
│  │  relations   │  │ data_sources│  │ vec0 (cosine)  │  │
│  │  traversal   │  │ data_schemas│  │ 384d + 768d    │  │
│  │  (depth 2)   │  │ JSON Schema │  │ embeddings     │  │
│  └──────┬───────┘  └──────┬──────┘  └───────┬────────┘  │
│         │                 │                  │           │
│         └────────┬────────┴──────────────────┘           │
│                  │                                       │
│         ┌────────▼────────┐                              │
│         │   jarvis.db     │     wiki/  (Obsidian .md)    │
│         │   (SQLite WAL)  │     raw/   (immutable src)   │
│         └─────────────────┘                              │
└─────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
     URL ingestion   File ingestion  KG migration
     (Readability)   (docling/PDF)   (kg-store.json)
```

| Tier | Purpose | Technology | Best For |
|------|---------|------------|----------|
| **Knowledge Graph** | Structured facts and relationships | SQLite + recursive graph traversal | "What is related to X?" |
| **Data Lake** | Typed records with schema validation | SQLite + JSON columns + JSON Schema | "Show me all metrics from source Y" |
| **Semantic Index** | Full-text and vector similarity search | FTS5 + sqlite-vec (vec0) via Ollama | "Find content about topic Z" |

## Features

- **Knowledge Graph** with recursive traversal up to depth 2, entity/relation CRUD, and auto-indexed FTS5 search
- **Generic data lake** with JSON Schema validation, typed records, and a schema registry with Obsidian wiki pages
- **Semantic chunking** via [docling](https://github.com/DS4SD/docling) — supports PDF, DOCX, PPTX, and images
- **Vector embeddings** via [Ollama](https://ollama.com) with `nomic-embed-text` (768-dim chunks + 384-dim entities)
- **FTS5 full-text search** with BM25 ranking, prefix queries, and snippet extraction
- **Hybrid 3-tier search** with priority rules — KG → Data Lake → Semantic, deduplicated and merged
- **Obsidian-compatible wiki** with wikilinks, auto-generated index, YAML frontmatter, and operation log
- **Export & Import** for full database portability via JSONL/CSV/JSON flat files
- **Wiki lint and health checks** for broken links, orphan pages, and frontmatter validation
- **KG migration** from legacy `kg-store.json` format
- **MkDocs documentation** site with Material theme, Mermaid diagrams, and API reference
- **URL ingestion** with Mozilla Readability extraction and HTML-to-Markdown conversion
- **Single-file database** — `jarvis.db` with WAL mode, no server required

## Quick Start

### Prerequisites

- **Node.js** 18+ (runtime)
- **Ollama** with `nomic-embed-text` model (for vector embeddings, optional)
- **Python 3.10+** with `docling` (for PDF/DOCX ingestion, optional)

### Install

```bash
git clone https://github.com/dmetzler/openclaw-kb.git
cd openclaw-kb
npm install
```

### Initialize the Database

```bash
node -e "import('./src/db.mjs').then(m => { m.initDatabase(); m.closeDatabase(); console.log('jarvis.db created'); })"
```

### Ingest Content

```bash
# Ingest a web article (URL → fetch → extract → index)
node src/ingest.mjs https://example.com/article

# Ingest a local document (PDF, DOCX, PPTX, Markdown)
node src/ingest-file.mjs path/to/document.pdf
```

### Search

```bash
# Hybrid search across all 3 tiers
node src/wiki-search.mjs "your query"
```

### Export & Import

```bash
# Export the entire database to flat files
node src/kb-export.mjs ./backup

# Import into a fresh database
node src/kb-import.mjs ./backup --db new-kb.db
```

### Run Tests

```bash
npm test
```

## Programmatic Usage

```javascript
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  search,
  traverseGraph,
} from './src/db.mjs';

import { hybridSearch } from './src/wiki-search.mjs';

// Initialize
initDatabase();

// Create knowledge graph entries
const alice = createEntity({ name: 'Alice', type: 'person', metadata: { role: 'engineer' } });
const acme = createEntity({ name: 'Acme Corp', type: 'organization' });
createRelation({ source_id: alice.id, target_id: acme.id, type: 'works_at' });

// Traverse the graph
const related = traverseGraph(alice.id, 2);

// Hybrid search across all tiers
const results = hybridSearch('Alice');

closeDatabase();
```

## Documentation

Full documentation is available via [MkDocs](https://www.mkdocs.org/):

```bash
pip install -r requirements-docs.txt
npm run docs:serve
```

Then visit [http://127.0.0.1:8000](http://127.0.0.1:8000).

| Section | Description |
|---------|-------------|
| [User Guide](docs/user-guide/index.md) | Installation, ingestion, search, wiki, export/import |
| [Developer Guide](docs/developer-guide/index.md) | Architecture, pipeline internals, search algorithms |
| [API Reference](docs/api-reference/index.md) | All source modules with function signatures |
| [Contributing](docs/contributing/index.md) | Coding standards, testing, PR workflow |

## Project Structure

```
openclaw-kb/
├── src/                        # Source modules (ES Modules, .mjs)
│   ├── db.mjs                  # Database abstraction (35+ exported functions)
│   ├── wiki-search.mjs         # 3-tier hybrid search engine
│   ├── wiki.mjs                # Wiki page CRUD (Obsidian-compatible)
│   ├── ingest.mjs              # URL ingestion orchestrator
│   ├── ingest-file.mjs         # File ingestion (PDF/DOCX/PPTX/MD)
│   ├── extractor.mjs           # LLM-powered entity extraction (Zod)
│   ├── fetcher.mjs             # URL fetcher (Readability + Turndown)
│   ├── chunker.mjs             # Markdown semantic chunker
│   ├── embedder.mjs            # Ollama embedding client (nomic-embed-text)
│   ├── converter.mjs           # Document format conversion (docling)
│   ├── schema-registry.mjs     # JSON Schema registry + wiki pages
│   ├── backfill.mjs            # Chunk/embedding backfill for existing pages
│   ├── kb-export.mjs           # Database export (JSONL/JSON)
│   ├── kb-import.mjs           # Database import
│   ├── kg-migrate.mjs          # Legacy KG migration
│   ├── csv.mjs                 # CSV serialization helpers
│   ├── schema.sql              # Base database schema
│   └── migrations/             # Incremental SQL migrations
├── wiki/                       # Auto-generated Obsidian-compatible wiki
│   ├── entities/               # Entity pages
│   ├── concepts/               # Concept pages
│   ├── topics/                 # Topic pages
│   ├── comparisons/            # Comparison pages
│   ├── schemas/                # Schema registry pages
│   ├── index.md                # Auto-generated wiki index
│   └── log.md                  # Operation log
├── raw/                        # Archived immutable source documents
├── docs/                       # MkDocs documentation source
├── tests/                      # Vitest test suite (unit + integration)
├── jarvis.db                   # SQLite database (created at runtime)
├── mkdocs.yml                  # MkDocs configuration
├── package.json                # Node.js project configuration
├── vitest.config.mjs           # Test runner configuration
└── requirements-docs.txt       # Python docs dependencies
```

## License

[MIT](LICENSE)

## Contributing

See the [Contributing Guide](docs/contributing/index.md) for coding standards, testing requirements, and PR workflow.
