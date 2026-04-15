# kg-migrate.mjs — Knowledge Graph Migration

The KG migration module imports a legacy knowledge graph from a JSON file (`kg-store.json`) into the SQLite database, mapping old string-based entity IDs to new integer IDs.

**Source:** `src/kg-migrate.mjs` (365 lines)
**Dependencies:** `db.mjs`, `fs`, `path`

---

## Exported Functions

### `migrateKnowledgeGraph(inputPath, options?)`

Migrates entities and relations from a legacy JSON file into the database.

```js
import { migrateKnowledgeGraph } from './kg-migrate.mjs';

const result = await migrateKnowledgeGraph('./kg-store.json');
// → { entities: 150, relations: 200, skipped: { entities: 2, relations: 5 } }
```

| Parameter | Type | Description |
|---|---|---|
| `inputPath` | string | Path to the `kg-store.json` file |
| `options.dryRun` | boolean | If `true`, print summary without modifying database |

**Pipeline:**

1. Reads and parses the JSON file
2. Validates structure (must have `entities` and/or `relations` objects)
3. Calls `buildMetadata()` for summary statistics
4. If `--dry-run`, prints summary and exits
5. Wraps all insertions in a single SQLite transaction
6. Inserts entities, building an old-ID → new-ID mapping
7. Inserts relations using the ID mapping
8. Returns migration statistics

**Transaction safety:** The entire migration runs inside a single transaction. If any insertion fails, the entire migration is rolled back.

**Returns:**

```js
{
  entities: number,    // Successfully migrated entity count
  relations: number,   // Successfully migrated relation count
  skipped: {
    entities: number,  // Entities skipped (empty name, etc.)
    relations: number  // Relations skipped (unmapped IDs, duplicates)
  }
}
```

---

### `buildMetadata(kgData)`

Produces a summary of the source data without modifying anything.

```js
import { buildMetadata } from './kg-migrate.mjs';
import { readFileSync } from 'fs';

const kgData = JSON.parse(readFileSync('./kg-store.json', 'utf8'));
const meta = buildMetadata(kgData);
// → {
//   entityCount: 150,
//   relationCount: 200,
//   entityTypes: { technology: 80, concept: 50, person: 20 },
//   relationTypes: { built_with: 100, related_to: 60, created_by: 40 }
// }
```

| Parameter | Type | Description |
|---|---|---|
| `kgData` | object | Parsed contents of `kg-store.json` |

**Returns:**

```js
{
  entityCount: number,
  relationCount: number,
  entityTypes: Record<string, number>,   // Type → count
  relationTypes: Record<string, number>  // Type → count
}
```

---

## CLI Usage

```bash
# Preview migration
node src/kg-migrate.mjs --input kg-store.json --dry-run

# Execute migration
node src/kg-migrate.mjs --input kg-store.json
```

### Exit Codes

| Code | Meaning |
|---|---|
| 0 | Migration completed successfully |
| 1 | Input file not found or unreadable |
| 2 | Invalid JSON in input file |
| 3 | Migration error (database constraint violation, etc.) |

---

## Source File Format

```json
{
  "entities": {
    "<string-id>": {
      "name": "Entity Name",
      "type": "entity",
      "attributes": {},
      "created": "2024-01-15T10:00:00Z",
      "updated": "2024-01-20T14:30:00Z"
    }
  },
  "relations": {
    "<string-id>": {
      "source": "<entity-string-id>",
      "target": "<entity-string-id>",
      "type": "relation_type",
      "attributes": {}
    }
  }
}
```

---

## Related Pages

- [KG Migration Guide](../developer-guide/kg-migration.md) — Detailed migration walkthrough
- [API: db.mjs](db.md) — Entity and relation creation functions
