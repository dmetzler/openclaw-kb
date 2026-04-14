# Quickstart: Knowledge Base Export & Import

**Feature**: 003-kb-export-import | **Date**: 2026-04-14

## Prerequisites

- Node.js 18+
- An existing knowledge base (`jarvis.db`) populated via spec 001/002
- `npm install` completed (for `better-sqlite3` and `sqlite-vec`)

## Export

Export the entire knowledge base to a directory of flat files:

```bash
node src/kb-export.mjs ./my-export
```

This creates `./my-export/` with 9 files:

```
my-export/
├── metadata.json        # Schema version + export timestamp + record counts
├── data_sources.jsonl   # Data sources (JSONL)
├── entities.jsonl       # Entities (JSONL)
├── relations.jsonl      # Relations (JSONL)
├── health_metrics.csv   # Health metrics (CSV)
├── activities.csv       # Activities (CSV)
├── grades.csv           # Grades (CSV)
├── meals.csv            # Meals (CSV)
└── embeddings.jsonl     # Embedding vectors (JSONL)
```

Export from a specific database:

```bash
node src/kb-export.mjs ./my-export --db /path/to/other.db
```

## Import

Restore an export into a fresh database:

```bash
node src/kb-import.mjs ./my-export --db restored.db
```

**Important**: The target database must not already exist. Import creates a fresh database with the full schema, then inserts all records.

## Round-Trip Verification

Verify export/import integrity by comparing two export cycles:

```bash
# Export original
node src/kb-export.mjs ./export-a

# Import into a fresh DB
node src/kb-import.mjs ./export-a --db roundtrip.db

# Re-export from the imported DB
node src/kb-export.mjs ./export-b --db roundtrip.db

# Compare (should show no differences)
diff -r ./export-a ./export-b
```

If the diff produces no output, the round-trip is lossless.

## Version Control

Export to a Git-tracked directory for knowledge evolution tracking:

```bash
# First export
node src/kb-export.mjs ./kb-snapshots
cd kb-snapshots && git init && git add -A && git commit -m "Initial KB snapshot"

# After modifying the knowledge base...
cd .. && node src/kb-export.mjs ./kb-snapshots
cd kb-snapshots && git diff  # See what changed
git add -A && git commit -m "KB update: added new entities"
```

JSONL and CSV formats produce meaningful line-level diffs — one changed entity = one changed line.

## What's Not Exported

- **Wiki pages** (`wiki/`) — already portable Markdown files on disk
- **Raw sources** (`raw/`) — already portable files on disk
- **FTS5 search index** — rebuilt automatically from triggers during import
- **Migration history** — recreated by `initDatabase()` during import

## Running Tests

```bash
npx vitest run tests/unit/csv.test.mjs
npx vitest run tests/unit/export-import.test.mjs
npx vitest run tests/integration/export.test.mjs
npx vitest run tests/integration/import.test.mjs
npx vitest run tests/integration/round-trip.test.mjs
```

Or run all tests:

```bash
npm test
```

## Error Handling

Both scripts provide actionable error messages:

```bash
# Missing files in export directory
$ node src/kb-import.mjs ./incomplete-export
Error: Missing required files in export directory: entities.jsonl, relations.jsonl

# Database already exists
$ node src/kb-import.mjs ./my-export --db jarvis.db
Error: Target database already exists: jarvis.db. Import requires a fresh (non-existent) database path.

# Schema version mismatch
$ node src/kb-import.mjs ./future-export
Error: Export schema version 005 is newer than current version 003. Cannot import from a newer schema.
```
