# Export & Import

OpenClaw KB can export the entire database to portable flat files and import them into a fresh database. This enables backups, data migration between machines, and version-controlled snapshots of your knowledge base.

## Export

The export command dumps every table in the database to a set of flat files — five JSONL files (one per table) plus a JSON metadata file.

### CLI Usage

```bash
node src/kb-export.mjs <output-directory> [--db <database-path>]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `<output-directory>` | *(required)* | Directory to write export files into (created if it doesn't exist) |
| `--db <path>` | `jarvis.db` | Path to the SQLite database file |

### Example

```bash
# Export the default database
node src/kb-export.mjs ./backup-2025-04-15

# Export a custom database
node src/kb-export.mjs ./backup --db /data/my-kb.db
```

Output:

```
Exporting knowledge base from jarvis.db to ./backup-2025-04-15
  data_sources: 3 records
  entities: 42 records
  relations: 18 records
  data_records: 156 records
  embeddings: 42 records
Export complete. 6 files written to ./backup-2025-04-15
```

### Output Directory Structure

```
backup-2025-04-15/
├── data_sources.jsonl      # One data source per line
├── entities.jsonl           # One entity per line
├── relations.jsonl          # One relation per line
├── data_records.jsonl       # One data record per line
├── embeddings.jsonl         # One embedding per line (vector as array)
└── metadata.json            # Schema version, timestamp, record counts
```

### File Formats

**JSONL files** — Each line is a self-contained JSON object representing one database row. Empty tables produce empty files.

```json title="entities.jsonl (one line per entity)"
{"id":1,"name":"node.js","type":"topic","metadata":{"category":"technology"},"created_at":"2025-04-10T12:00:00","updated_at":"2025-04-10T12:00:00"}
{"id":2,"name":"acme corp","type":"entity","metadata":{"industry":"tech"},"created_at":"2025-04-10T12:05:00","updated_at":"2025-04-10T12:05:00"}
```

```json title="relations.jsonl"
{"id":1,"source_id":1,"target_id":2,"type":"used_by","metadata":{},"created_at":"2025-04-10T12:10:00"}
```

```json title="embeddings.jsonl"
{"entity_id":1,"embedding":[0.012,-0.034,0.056,...]}
```

!!! note "Embedding format"
    Embeddings are stored as `Float32Array` in SQLite but exported as regular JSON number arrays for portability. The import process reconstructs the `Float32Array` automatically.

**metadata.json** — Contains the schema version, export timestamp, and record counts for validation.

```json title="metadata.json"
{
  "schema_version": "003",
  "exported_at": "2025-04-15T10:30:00.000Z",
  "record_counts": {
    "data_records": { "article": 120, "health_metric": 36 },
    "data_sources": 3,
    "embeddings": 42,
    "entities": 42,
    "relations": 18
  }
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Missing required argument (no output directory) |
| 2 | Database file not found or cannot be opened |

### Programmatic API

```js
import { initDatabase, closeDatabase } from './db.mjs';
import { exportDatabase } from './kb-export.mjs';

initDatabase('jarvis.db');
exportDatabase('./backup', { silent: true });
closeDatabase();
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `silent` | `boolean` | `false` | Suppress stdout progress messages |

---

## Import

The import command restores a previously exported directory into a **new** database. It validates the export directory, checks schema compatibility, and imports all records inside a single transaction for atomicity.

!!! warning "Fresh database required"
    Import **always** creates a new database file. If the target path already exists, import will refuse to run. This prevents accidental data corruption.

### CLI Usage

```bash
node src/kb-import.mjs <export-directory> [--db <database-path>]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `<export-directory>` | *(required)* | Directory containing the export files |
| `--db <path>` | `jarvis.db` | Path for the new database file (must not exist) |

### Example

```bash
# Import into the default database path
node src/kb-import.mjs ./backup-2025-04-15

# Import into a specific path
node src/kb-import.mjs ./backup --db /data/restored.db
```

Output:

```
Importing knowledge base from ./backup-2025-04-15 to jarvis.db
  Validating export directory... OK
  Schema version: 003 (compatible)
  data_sources: 3 records imported
  entities: 42 records imported
  relations: 18 records imported
  data_records: 156 records imported
  embeddings: 42 records imported
Import complete. Database created at jarvis.db
```

### Required Files

The export directory must contain all six files:

| File | Description |
|------|-------------|
| `metadata.json` | Schema version and record counts |
| `data_sources.jsonl` | Data source definitions |
| `entities.jsonl` | Knowledge graph entities |
| `relations.jsonl` | Entity relationships |
| `data_records.jsonl` | Structured data records |
| `embeddings.jsonl` | Vector embeddings |

### Validation Steps

Import performs these checks before writing any data:

1. **Directory exists** — the export directory must be present
2. **All files present** — all six required files must exist
3. **Metadata parseable** — `metadata.json` must be valid JSON
4. **Target DB does not exist** — prevents overwriting existing data
5. **Schema version compatible** — export version must not be newer than the current schema

If any check fails, import exits with an error and no database is created.

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Missing required argument (no export directory) |
| 2 | Export directory not found |
| 3 | Missing required files in export directory |
| 4 | Target database already exists |
| 5 | Schema version incompatible (export is newer) |
| 6 | Data validation error (malformed JSONL) |

### Programmatic API

```js
import { importDatabase } from './kb-import.mjs';
import { closeDatabase } from './db.mjs';

importDatabase('./backup', '/data/restored.db', { silent: true });
closeDatabase();
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `silent` | `boolean` | `false` | Suppress stdout progress messages |

!!! note "Transaction safety"
    The entire import runs inside a single SQLite transaction. If any record fails to import (e.g., malformed data), the transaction is rolled back and the partially created database file is deleted.

---

## Backup Strategy

### Manual Snapshots

Create timestamped snapshots before major operations:

```bash
# Before a large ingestion run
node src/kb-export.mjs "./backups/$(date +%Y-%m-%d-%H%M)"

# After verifying the ingestion worked
node src/kb-export.mjs "./backups/$(date +%Y-%m-%d-%H%M)-post-ingest"
```

### Automated Backups with cron

```bash
# Daily backup at 2 AM — add to crontab
0 2 * * * cd /path/to/openclaw-kb && node src/kb-export.mjs "./backups/$(date +\%Y-\%m-\%d)"
```

### Retention

Export directories are plain files, so standard file-system tools work for retention:

```bash
# Delete backups older than 30 days
find ./backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```

### Version Control

Because exports are JSONL (one JSON object per line), they diff cleanly in Git:

```bash
# Track exports in Git for history
cd backups
git init
git add .
git commit -m "KB snapshot $(date +%Y-%m-%d)"
```

---

## Data Portability

### Migrating Between Machines

1. Export on the source machine:

    ```bash
    node src/kb-export.mjs ./transfer
    ```

2. Copy the directory to the target machine (scp, rsync, USB, etc.):

    ```bash
    scp -r ./transfer user@target:/path/to/openclaw-kb/
    ```

3. Import on the target machine:

    ```bash
    node src/kb-import.mjs ./transfer --db jarvis.db
    ```

### Inspecting Export Data

Since export files are plain JSON, you can inspect them with standard tools:

```bash
# Count entities
wc -l backup/entities.jsonl

# Find a specific entity
grep '"acme corp"' backup/entities.jsonl | jq .

# Check metadata
cat backup/metadata.json | jq .
```

### Merging Databases

There is no built-in merge capability. To combine two databases:

1. Export both databases to separate directories
2. Manually combine the JSONL files (resolve ID conflicts)
3. Import the merged files into a fresh database

!!! tip "Avoid ID conflicts"
    Entity IDs are auto-incremented integers. When merging, you'll need to re-map IDs in `relations.jsonl` and `embeddings.jsonl` to match the new entity IDs.
