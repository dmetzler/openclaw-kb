# kb-import.mjs — Database Import

The import module restores a database from export files (JSONL + JSON metadata), populating a fresh SQLite database with entities, relations, data sources, data records, and embeddings.

**Source:** `src/kb-import.mjs` (206 lines)
**Dependencies:** `db.mjs`, `fs`, `path`, `readline`

---

## Exported Functions

### `importDatabase(inputDir, dbPath)`

Imports all data from an export directory into a new database.

```js
import { importDatabase } from './kb-import.mjs';

await importDatabase('./backup/2024-01-15', 'restored.db');
```

| Parameter | Type | Description |
|---|---|---|
| `inputDir` | string | Path to the export directory (must contain `metadata.json`) |
| `dbPath` | string | Path for the new database file (must not already exist) |

**Prerequisites:**

- The `inputDir` must contain a valid `metadata.json` file
- The `dbPath` must not point to an existing file (import requires a fresh database)
- The schema version in `metadata.json` must be compatible with the current codebase

**Import order:**

1. Validate input directory and metadata
2. Create and initialise fresh database at `dbPath`
3. Import data sources (establishes foreign key targets)
4. Import entities
5. Import relations
6. Import data records
7. Import embeddings (reconstructs `Float32Array` from regular arrays)

!!! warning "Fresh database required"
    Import will refuse to run against an existing database file. This prevents accidental data corruption or duplicate key conflicts. Delete or move the existing file first.

**Throws:** `Error` if the database file already exists, metadata is invalid, or required JSONL files are missing.

---

## CLI Usage

```bash
node src/kb-import.mjs --input ./backup/2024-01-15 --db restored.db
```

### Exit Codes

| Code | Meaning |
|---|---|
| 0 | Import completed successfully |
| 1 | Missing or invalid arguments |
| 2 | Input directory not found |
| 3 | Missing `metadata.json` |
| 4 | Schema version mismatch |
| 5 | Database file already exists |
| 6 | Import error (data validation, constraint violation) |

---

## Required Input Files

| File | Required | Description |
|---|---|---|
| `metadata.json` | Yes | Export metadata with schema version and counts |
| `entities.jsonl` | Yes | Entity rows |
| `relations.jsonl` | Yes | Relation rows |
| `data_sources.jsonl` | Yes | Data source rows |
| `data_records.jsonl` | Yes | Data record rows |
| `embeddings.jsonl` | No | Embedding rows (import skips if missing) |

### JSONL Processing

Files are read line-by-line using Node.js `readline` for memory efficiency. Each line is parsed as an independent JSON object and imported using the corresponding `import*` function from `db.mjs`.

### Embedding Reconstruction

Embeddings in the export are stored as regular JavaScript arrays (JSON-serialisable). During import, they are reconstructed as `Float32Array` objects:

```js
const embedding = new Float32Array(record.embedding);
```

---

## Related Pages

- [User Guide: Export & Import](../user-guide/export-import.md) — End-user export/import guide
- [API: kb-export.mjs](kb-export.md) — Exporting to the format this module reads
- [API: db.mjs](db.md) — Import functions used internally
