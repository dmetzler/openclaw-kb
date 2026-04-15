# kb-export.mjs — Database Export

The export module dumps the entire database to a directory of JSONL files plus a JSON metadata file, creating a portable, version-controlled backup.

**Source:** `src/kb-export.mjs` (138 lines)
**Dependencies:** `db.mjs`, `fs`, `path`

---

## Exported Functions

### `exportDatabase(outputDir)`

Exports all database tables to a directory.

```js
import { exportDatabase } from './kb-export.mjs';

exportDatabase('./backup/2024-01-15');
```

| Parameter | Type | Description |
|---|---|---|
| `outputDir` | string | Target directory path (created if it does not exist) |

**Output files:**

| File | Format | Content |
|---|---|---|
| `entities.jsonl` | JSONL | One entity per line |
| `relations.jsonl` | JSONL | One relation per line |
| `data_sources.jsonl` | JSONL | One data source per line |
| `data_records.jsonl` | JSONL | One data record per line |
| `embeddings.jsonl` | JSONL | One embedding per line (Float32Array → regular array) |
| `metadata.json` | JSON | Export metadata (see below) |

**Metadata file structure:**

```json
{
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "schemaVersion": 1,
  "counts": {
    "entities": 150,
    "relations": 200,
    "data_sources": 3,
    "data_records": 500,
    "embeddings": 100
  }
}
```

**Behaviour:**

1. Creates the output directory if it does not exist
2. Retrieves all entities, relations, data sources, data records, and embeddings from the database
3. Writes each collection as a JSONL file (one JSON object per line)
4. Embeddings are converted from `Float32Array` to regular arrays for JSON serialisation
5. Writes `metadata.json` with export timestamp, schema version, and row counts

!!! note "JSONL format"
    Each `.jsonl` file contains one JSON object per line (no array wrapper, no trailing commas). This format is efficient for streaming reads and line-by-line processing.

---

## CLI Usage

```bash
node src/kb-export.mjs --output ./backup/2024-01-15
```

### Exit Codes

| Code | Meaning |
|---|---|
| 0 | Export completed successfully |
| 1 | Missing or invalid arguments |
| 2 | Export error (file system, database) |

---

## Related Pages

- [User Guide: Export & Import](../user-guide/export-import.md) — End-user export/import guide
- [API: kb-import.mjs](kb-import.md) — Importing from export files
- [API: db.mjs](db.md) — Bulk retrieval functions used by export
