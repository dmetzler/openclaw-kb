# Installation

This guide walks you through setting up OpenClaw KB from scratch.

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18 or later | Runtime for all KB operations |
| **npm** | Bundled with Node.js | Dependency management |
| **Python** | 3.8+ | Documentation site only (optional) |

!!! note "Python is optional"
    Python is only required if you want to build or serve the documentation site locally. All KB functionality runs on Node.js alone.

## Clone the Repository

```bash
git clone https://github.com/dmetzler/openclaw-kb.git
cd openclaw-kb
```

## Install Dependencies

```bash
npm install
```

This installs all runtime dependencies:

| Package | Purpose |
|---------|---------|
| `better-sqlite3` | SQLite driver with native bindings |
| `sqlite-vec` | Vector similarity search extension (vec0) |
| `gray-matter` | YAML frontmatter parsing for wiki pages |
| `jsdom` | HTML parsing for web content ingestion |
| `@mozilla/readability` | Article extraction from web pages |
| `turndown` + `turndown-plugin-gfm` | HTML-to-Markdown conversion |
| `zod` | Schema validation for LLM extraction results |

## Initialize the Database

Create the SQLite database with all required tables, indexes, triggers, and virtual tables:

```bash
node -e "import('./src/db.mjs').then(m => { m.initDatabase(); m.closeDatabase(); console.log('jarvis.db created'); })"
```

This creates `jarvis.db` in the project root with:

- **`entities`** — Knowledge graph nodes
- **`relations`** — Directed edges between entities
- **`data_sources`** — Registered data source metadata
- **`data_records`** — Typed records (articles, metrics, events)
- **`search_index`** — FTS5 full-text search virtual table
- **`vec_embeddings`** — vec0 vector similarity virtual table (768 dimensions, cosine distance)
- **`schema_migrations`** — Migration version tracking

The database uses WAL mode for concurrent reads, enforces foreign keys, and sets a 5-second busy timeout.

## Custom Database Path

By default, the database is created at `jarvis.db` in the current directory. To use a custom path:

```javascript
import { initDatabase, closeDatabase } from './src/db.mjs';

initDatabase('/path/to/my/knowledge-base.db');
// ... use the database ...
closeDatabase();
```

Most CLI tools accept a `--db` flag:

```bash
node src/kb-export.mjs ./export --db /path/to/custom.db
node src/kb-import.mjs ./export --db /path/to/new.db
node src/kg-migrate.mjs --db /path/to/custom.db kg-store.json
```

## Verify the Installation

Run the test suite to confirm everything is working:

```bash
npm test
```

All tests use [Vitest](https://vitest.dev) and create temporary databases — your `jarvis.db` is never modified by tests.

## Install Documentation Dependencies (Optional)

To build or serve the documentation site locally:

```bash
pip install -r requirements-docs.txt
npm run docs:serve
```

Visit [http://127.0.0.1:8000/](http://127.0.0.1:8000/) to browse the docs.

## Project Structure

```
openclaw-kb/
├── src/
│   ├── db.mjs              # Database abstraction layer
│   ├── wiki-search.mjs     # 3-tier hybrid search
│   ├── wiki.mjs            # Wiki page CRUD
│   ├── ingest.mjs          # Ingestion orchestrator
│   ├── extractor.mjs       # LLM entity extraction
│   ├── fetcher.mjs         # URL fetching + Readability
│   ├── kb-export.mjs       # Database export (JSONL)
│   ├── kb-import.mjs       # Database import
│   ├── kg-migrate.mjs      # Legacy KG migration
│   ├── csv.mjs             # CSV parsing/serialization
│   ├── schema.sql          # Base database schema
│   └── migrations/         # SQL migration files
├── wiki/                   # Generated wiki pages (Obsidian-compatible)
├── raw/                    # Archived raw source content
├── docs/                   # MkDocs documentation source
├── tests/                  # Vitest test files
├── jarvis.db               # SQLite database (created at runtime)
├── mkdocs.yml              # MkDocs configuration
├── package.json            # Node.js project config
└── requirements-docs.txt   # Python docs dependencies
```

## Next Steps

- [Ingest your first article](ingestion.md)
- [Search across all tiers](search.md)
- [Browse wiki pages with Obsidian](wiki.md)
