# API Contracts: Data Schema Registry

**Feature**: 010-data-schema-registry  
**Date**: 2026-04-15

## Programmatic API (`db.mjs` exports)

### `registerSchema(recordType, label, description, jsonSchema, example)`

Stores or replaces a schema definition. Generates a wiki page as a side effect.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `recordType` | `string` | Yes | Unique type identifier. Must match `/^[a-zA-Z0-9_-]+$/`. |
| `label` | `string` | Yes | Human-readable name (e.g., "Health Metric"). Must be non-empty. |
| `description` | `string` | Yes | Purpose description for the data type. |
| `jsonSchema` | `object` | Yes | JSON Schema (draft-07) object defining valid data structure. Must be a valid, compilable JSON Schema. |
| `example` | `object` | Yes | Complete example record conforming to the schema. |

**Returns**: `{ record_type, label, description, json_schema, example, created_at, updated_at }` — the stored schema row with parsed JSON fields.

**Throws**:
- `Error('record_type is required and must match /^[a-zA-Z0-9_-]+$/')` — invalid record_type
- `Error('label is required and must be a non-empty string')` — missing/empty label
- `Error('jsonSchema must be a valid JSON Schema object')` — non-object or non-compilable schema

**Side effects**: Creates/overwrites `wiki/schemas/{slugified-record-type}.md`.

---

### `getSchema(recordType)`

Retrieves the full schema definition for a record type.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `recordType` | `string` | Yes | Record type to look up. |

**Returns**: `{ record_type, label, description, json_schema, example, created_at, updated_at }` with parsed JSON fields, or `null` if not found.

**Throws**: Nothing — returns null for missing schemas.

---

### `listSchemas()`

Returns all registered schemas (summary view).

**Parameters**: None.

**Returns**: `Array<{ record_type, label, description }>` — alphabetically sorted by record_type.

**Throws**: Nothing.

---

### `validateRecord(recordType, data)`

Validates a data object against the registered JSON Schema for the given type.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `recordType` | `string` | Yes | Record type whose schema to validate against. |
| `data` | `object` | Yes | Data object to validate. |

**Returns**: `{ valid: boolean, errors: string[] | null }` — `errors` is null when valid, otherwise an array of human-readable error strings.

**Throws**:
- `Error('No schema registered for record type: {recordType}')` — when no schema exists.

---

### `insertRecord(recordType, data)` (modified behavior)

Existing function with new validation step:

1. Existing parameter validation (unchanged)
2. **NEW**: Look up schema for `recordType`
   - If schema exists → validate `data` against it → throw on failure
   - If no schema exists → log warning via `console.warn()` → proceed
3. Existing INSERT + return (unchanged)

**New throw condition**:
- `Error('Validation failed for record type "{recordType}": {error details}')` — when data fails schema validation.

---

## CLI Contract (`node src/schema-registry.mjs`)

### `list`

```
$ node src/schema-registry.mjs list
```

**Output**: Table of all registered schemas (record_type, label, description).  
**Exit code**: 0

### `get <type>`

```
$ node src/schema-registry.mjs get health_metric
```

**Output**: Full schema details including JSON Schema and example (formatted JSON).  
**Exit code**: 0 (found), 1 (not found)

### `register <json-file>`

```
$ node src/schema-registry.mjs register schema.json
```

**Input file format**:
```json
{
  "record_type": "medication",
  "label": "Medication Tracking",
  "description": "Tracks medication intake and dosage",
  "json_schema": { ... },
  "example": { ... }
}
```

**Output**: Confirmation message with record_type.  
**Exit code**: 0 (success), 1 (validation error), 2 (file not found)

### `validate <type> <json-file>`

```
$ node src/schema-registry.mjs validate health_metric data.json
```

**Output**: "Valid" or list of validation errors.  
**Exit code**: 0 (valid), 1 (invalid or schema not found), 2 (file not found)

### No arguments / `help`

```
$ node src/schema-registry.mjs
```

**Output**: Usage information.  
**Exit code**: 1

---

## Wiki Page Contract (`wiki/schemas/{slug}.md`)

**File naming**: `slugify(record_type)` from `wiki.mjs` (lowercase, hyphens, alphanumeric).

**Format**:
```markdown
---
type: schema
record_type: health_metric
label: Health Metric
created_at: 2026-04-15T00:00:00.000Z
updated_at: 2026-04-15T00:00:00.000Z
---

# Health Metric

Tracks health-related measurements from various devices and manual entries.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| metric_type | string | Yes | Type of health metric |
| value | number | Yes | Measured value |
| unit | string | Yes | Unit of measurement |
| recorded_at | string | Yes | ISO 8601 timestamp |
| device | string | No | Device that recorded the metric |

## Example

\```json
{
  "metric_type": "heart_rate",
  "value": 72,
  "unit": "bpm",
  "recorded_at": "2026-04-15T10:30:00Z",
  "device": "Apple Watch"
}
\```
```
