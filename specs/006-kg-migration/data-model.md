# Data Model: KG Migration Tool

**Feature**: 006-kg-migration | **Date**: 2026-04-14

## Entities

### Legacy Entity (Source — `kg-store.json`)

The legacy knowledge graph stores entities as an **object** keyed by string IDs.

```json
{
  "<string-id>": {
    "id": "<string>",
    "label": "<string>",
    "type": "<string>",
    "category": "<string | null>",
    "tags": "<string[] | null>",
    "parent": "<string | null>",
    "confidence": "<number | null>",
    "wikiPage": "<string | null>",
    "attrs": "<object | null>",
    "created": "<ISO 8601 string | null>",
    "updated": "<ISO 8601 string | null>"
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | Object key matches this value. Used as relation reference. |
| `label` | string | yes | Maps to SQLite `name`. Skip entity if missing. |
| `type` | string | yes | Preserved as-is in SQLite. Skip entity if missing. |
| `category` | string | no | Packed into `metadata` if non-empty. |
| `tags` | string[] | no | Packed into `metadata` if non-empty array. |
| `parent` | string | no | Packed into `metadata` if non-empty. |
| `confidence` | number | no | Packed into `metadata` if present. |
| `wikiPage` | string | no | Packed into `metadata` if non-empty. |
| `attrs` | object | no | Fields merged at top level of `metadata`. Treat `null` as `{}`. |
| `created` | string | no | Not migrated to SQLite columns (auto-generated). |
| `updated` | string | no | Not migrated to SQLite columns (auto-generated). |

**Known entity types** (19 total, not enforced — any string accepted):
`human`, `project`, `concept`, `tool`, `service`, `language`, `framework`, `credential`, `location`, `organization`, `event`, `document`, `skill`, `topic`, `workflow`, `integration`, `resource`, `goal`, `metric`

### Legacy Relation (Source — `kg-store.json`)

Relations are stored as an **array**.

```json
{
  "from": "<string>",
  "to": "<string>",
  "rel": "<string>",
  "attrs": "<object | null>"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `from` | string | yes | Legacy entity string ID. Resolved via ID mapping. |
| `to` | string | yes | Legacy entity string ID. Resolved via ID mapping. |
| `rel` | string | yes | Maps to SQLite `type`. |
| `attrs` | object | no | Maps to SQLite `metadata`. Treat `null`/missing as `{}`. |

**Known relation types** (18 total, not enforced — any string accepted):
`owns`, `uses`, `runs_on`, `knows`, `leads`, `contributes_to`, `depends_on`, `part_of`, `related_to`, `created_by`, `managed_by`, `integrates_with`, `stored_in`, `deployed_to`, `monitors`, `authenticates_with`, `belongs_to`, `references`

### SQLite Entity (Target — `jarvis.db`)

```sql
CREATE TABLE entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) > 0),
  type TEXT NOT NULL CHECK(length(type) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### SQLite Relation (Target — `jarvis.db`)

```sql
CREATE TABLE relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(length(type) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES entities(id) ON DELETE CASCADE,
  CHECK(source_id != target_id),
  UNIQUE(source_id, target_id, type)
);
```

## Field Mapping

### Entity Field Mapping

```text
Legacy (kg-store.json)          →  SQLite (entities table)
───────────────────────────────────────────────────────────
id (string key)                 →  (not stored — used for relation mapping only)
label                           →  name
type                            →  type
category                        ─┐
tags                             │
parent                           ├→ metadata (JSON object, non-empty fields only)
confidence                       │
wikiPage                         │
attrs.*                         ─┘  (attrs fields merged at top level of metadata)
created                         →  (discarded — SQLite auto-generates created_at)
updated                         →  (discarded — SQLite auto-generates updated_at)
```

### Metadata Construction Algorithm

```javascript
function buildMetadata(legacyEntity) {
  const metadata = {};

  // Optional scalar/array fields
  if (legacyEntity.category && legacyEntity.category !== '')
    metadata.category = legacyEntity.category;
  if (Array.isArray(legacyEntity.tags) && legacyEntity.tags.length > 0)
    metadata.tags = legacyEntity.tags;
  if (legacyEntity.parent && legacyEntity.parent !== '')
    metadata.parent = legacyEntity.parent;
  if (legacyEntity.confidence != null)
    metadata.confidence = legacyEntity.confidence;
  if (legacyEntity.wikiPage && legacyEntity.wikiPage !== '')
    metadata.wikiPage = legacyEntity.wikiPage;

  // Flatten attrs at top level (FR-005)
  const attrs = legacyEntity.attrs;
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null && value !== '' &&
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) {
        metadata[key] = value;
      }
    }
  }

  return metadata;
}
```

### Relation Field Mapping

```text
Legacy (kg-store.json)          →  SQLite (relations table)
───────────────────────────────────────────────────────────
from                            →  source_id  (via idMap: string → integer)
to                              →  target_id  (via idMap: string → integer)
rel                             →  type
attrs                           →  metadata   (JSON object, null → {})
```

## In-Memory State

### ID Mapping (FR-007)

Built during entity migration, consumed during relation migration:

```javascript
// Map<string, number> — legacy string ID → SQLite integer ID
const idMap = new Map();

// Populated as entities are created:
// idMap.set("alice", 1);
// idMap.set("bob", 2);
```

### Existing Entity Index (for duplicate detection)

Pre-loaded once before migration starts:

```javascript
// Set<string> — "name\0type" composite keys for O(1) lookup
const existingEntities = new Set(
  getAllEntities().map(e => `${e.name}\0${e.type}`)
);
```

### Migration Stats

```javascript
const stats = {
  entities: { migrated: 0, skipped: 0, errors: 0 },
  relations: { migrated: 0, skipped: 0, errors: 0 },
};
```

## Validation Rules

| Rule | Source | Behavior on Violation |
|------|--------|----------------------|
| Entity must have non-empty `label` | FR-004 / Edge case | Skip entity, increment `errors` |
| Entity must have non-empty `type` | FR-004 / Edge case | Skip entity, increment `errors` |
| Entity name+type must be unique | FR-010 | Skip entity, increment `skipped` |
| Relation `from` must exist in idMap | FR-008 | Skip relation, increment `errors` |
| Relation `to` must exist in idMap | FR-008 | Skip relation, increment `errors` |
| Relation `from !== to` (self-referential) | Edge case | Skip relation, increment `errors` |
| Relation (source_id, target_id, type) must be unique | Schema UNIQUE | Skip relation, increment `skipped` |

## State Transitions

This is a one-shot migration — no ongoing state machine. The processing flow is:

```
Parse JSON → Validate → Migrate Entities → Build ID Map → Migrate Relations → Report
```

Each entity/relation transitions through:
```
input → validate → [skip/error] or [create → success]
```
