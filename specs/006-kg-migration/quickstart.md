# Quickstart: KG Migration Tool

**Feature**: 006-kg-migration | **Date**: 2026-04-14

## Prerequisites

- Node.js 18+
- An existing `kg-store.json` file from the OpenClaw knowledge-graph-skill
- Dependencies installed (`npm install`)

## Basic Migration

```bash
# Migrate kg-store.json in current directory to jarvis.db
node src/kg-migrate.mjs

# Migrate a specific file
node src/kg-migrate.mjs path/to/kg-store.json

# Migrate to a specific database
node src/kg-migrate.mjs kg-store.json --db my-database.db
```

## Dry Run (Preview)

```bash
# See what would happen without writing anything
node src/kg-migrate.mjs --dry-run kg-store.json
```

Output:
```
Dry run: validating kg-store.json against jarvis.db

Entities: 42 would be migrated, 0 would be skipped, 0 errors
Relations: 87 would be migrated, 0 would be skipped, 0 errors

Dry run complete. No changes written.
```

## Re-Running (Idempotent)

The script is safe to run multiple times. Already-migrated entities are skipped:

```bash
# First run
node src/kg-migrate.mjs kg-store.json
# Entities: 42 migrated, 0 skipped, 0 errors

# Second run (same file)
node src/kg-migrate.mjs kg-store.json
# Entities: 0 migrated, 42 skipped, 0 errors
```

## Programmatic Usage (from tests or other scripts)

```javascript
import { migrateKnowledgeGraph } from './src/kg-migrate.mjs';

const stats = migrateKnowledgeGraph('kg-store.json', 'jarvis.db', {
  dryRun: false,
  silent: true, // suppress console output
});

console.log(stats);
// {
//   entities: { migrated: 42, skipped: 0, errors: 0 },
//   relations: { migrated: 87, skipped: 0, errors: 0 }
// }
```

## Expected Input Format

The `kg-store.json` file should have this structure:

```json
{
  "entities": {
    "alice": {
      "id": "alice",
      "label": "Alice Johnson",
      "type": "human",
      "category": "personal",
      "tags": ["founder"],
      "attrs": { "role": "CEO" }
    },
    "project-x": {
      "id": "project-x",
      "label": "Project X",
      "type": "project"
    }
  },
  "relations": [
    {
      "from": "alice",
      "to": "project-x",
      "rel": "leads",
      "attrs": { "since": "2024" }
    }
  ]
}
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Error: File not found` | Check the file path. Default is `kg-store.json` in the current directory. |
| `Error: Failed to parse` | Validate JSON syntax (e.g., `cat kg-store.json \| python -m json.tool`). |
| `Warning: missing required field "label"` | The legacy entity is missing a `label` field. It will be skipped. |
| `Warning: target entity "X" not found` | A relation references an entity that wasn't in the JSON or was skipped due to errors. |
| High skip count on re-run | Expected — entities already exist in the database. |
