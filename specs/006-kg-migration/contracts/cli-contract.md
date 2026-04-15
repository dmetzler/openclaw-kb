# CLI Contract: kg-migrate.mjs

**Feature**: 006-kg-migration | **Date**: 2026-04-14

## Command Signature

```
node src/kg-migrate.mjs [OPTIONS] [FILE]
```

## Arguments

| Argument | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `FILE` | positional | no | `kg-store.json` (cwd) | Path to the legacy knowledge graph JSON file |

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dry-run` | boolean | `false` | Validate and report without writing to the database |
| `--db <path>` | string | `jarvis.db` | Path to the SQLite database file |

## Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| `0` | Success (even if some items were skipped) | Migration completed with 10 migrated, 2 skipped |
| `1` | Missing required argument or generic error | No file argument and no `kg-store.json` in cwd |
| `2` | Input file not found | `node src/kg-migrate.mjs nonexistent.json` |
| `3` | JSON parse error | `kg-store.json` contains malformed JSON |

## Output Format

### stdout — Progress and Summary

```
Migrating knowledge graph from kg-store.json to jarvis.db

Entities: 20 migrated, 5 skipped, 1 errors
Relations: 15 migrated, 0 skipped, 2 errors

Migration complete.
```

### stdout — Dry-Run Mode

```
Dry run: validating kg-store.json against jarvis.db

Entities: 20 would be migrated, 5 would be skipped, 1 errors
Relations: 15 would be migrated, 0 would be skipped, 2 errors

Dry run complete. No changes written.
```

### stderr — Errors

```
Error: File not found: nonexistent.json
```

```
Error: Failed to parse kg-store.json: Unexpected token } in JSON at position 42
```

```
Warning: Skipping entity "abc123": missing required field "label"
Warning: Skipping relation alice -> alice (rel: self_ref): source and target are the same entity
Warning: Skipping relation alice -> unknown (rel: knows): target entity "unknown" not found
```

## Programmatic API

```javascript
import { migrateKnowledgeGraph } from './kg-migrate.mjs';

const stats = migrateKnowledgeGraph(filePath, dbPath, {
  dryRun: false,  // default
  silent: false,  // default — suppress stdout when true
});

// Returns:
// {
//   entities: { migrated: 20, skipped: 5, errors: 1 },
//   relations: { migrated: 15, skipped: 0, errors: 2 }
// }
```

## Behavioral Contract

1. **Entity migration runs before relation migration** — relations depend on the ID mapping built during entity migration.
2. **Duplicate entities (same name+type) are skipped** — never updated (FR-011).
3. **Individual errors do not halt migration** — the script continues processing remaining items (FR-012).
4. **The entire migration is atomic** — wrapped in `runTransaction()`. If a fatal error occurs (not an individual item error), the entire migration rolls back.
5. **Database is initialized if needed** — `initDatabase()` is called before any operations (FR-016).
6. **The script is idempotent** — safe to run multiple times on the same database.
