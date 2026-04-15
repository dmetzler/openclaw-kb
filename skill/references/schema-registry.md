# Schema Registry

The data lake (Tier 2) validates records against JSON Schema definitions stored in the `data_schemas` table. Six types are pre-registered at database initialization. Custom types can be added at runtime.

## Pre-Registered Types

### `health_metric`

Health measurements such as weight, heart rate, or blood pressure.

| Field | Type | Required |
|-------|------|----------|
| metric_type | string | yes |
| value | number | yes |
| unit | string | yes |
| recorded_at | string | yes |
| device | string | no |

```json
{
  "metric_type": "heart_rate",
  "value": 72,
  "unit": "bpm",
  "recorded_at": "2026-04-14T10:00:00Z",
  "device": "Fitbit Sense"
}
```

### `activity`

Exercise or movement activity records.

| Field | Type | Required |
|-------|------|----------|
| activity_type | string | yes |
| duration_minutes | number | yes |
| recorded_at | string | yes |
| distance_km | number | no |
| calories | number | no |
| avg_hr | number | no |

```json
{
  "activity_type": "running",
  "duration_minutes": 45,
  "distance_km": 8.2,
  "calories": 420,
  "avg_hr": 145,
  "recorded_at": "2026-04-14T07:30:00Z"
}
```

### `grade`

Academic grades and performance scores.

| Field | Type | Required |
|-------|------|----------|
| student | string | yes |
| subject | string | yes |
| score | number | yes |
| max_score | number | yes |
| school_year | string | yes |
| recorded_at | string | yes |
| coefficient | number | no |
| trimester | string | no |

```json
{
  "student": "Ava Martin",
  "subject": "Mathematics",
  "score": 17.5,
  "max_score": 20,
  "coefficient": 2,
  "trimester": "T2",
  "school_year": "2025-2026",
  "recorded_at": "2026-02-15T00:00:00Z"
}
```

### `meal`

Meals and food intake records.

| Field | Type | Required |
|-------|------|----------|
| meal_type | string | yes |
| items | array (strings) | yes |
| recorded_at | string | yes |
| calories_est | number | no |

```json
{
  "meal_type": "lunch",
  "items": ["salad", "grilled chicken", "apple"],
  "calories_est": 520,
  "recorded_at": "2026-04-14T12:15:00Z"
}
```

### `sleep`

Sleep duration and quality records.

| Field | Type | Required |
|-------|------|----------|
| duration_hours | number | yes |
| recorded_at | string | yes |
| quality | string | no |
| deep_sleep_pct | number | no |
| device | string | no |

```json
{
  "duration_hours": 7.4,
  "quality": "good",
  "deep_sleep_pct": 18,
  "recorded_at": "2026-04-14T06:00:00Z",
  "device": "Oura Ring"
}
```

### `finance`

Personal finance transactions and expenses.

| Field | Type | Required |
|-------|------|----------|
| category | string | yes |
| amount | number | yes |
| currency | string | yes |
| recorded_at | string | yes |
| description | string | no |

```json
{
  "category": "groceries",
  "amount": 84.35,
  "currency": "USD",
  "description": "Weekly grocery run",
  "recorded_at": "2026-04-13T18:45:00Z"
}
```

## Registering Custom Types

### Programmatic

```javascript
import { registerSchema, validateRecord, insertRecord, createDataSource } from '../src/db.mjs';

// 1. Define and register the schema
registerSchema(
  'weather',                      // record_type (must match /^[a-zA-Z0-9_-]+$/)
  'Weather',                      // label
  'Weather readings',             // description
  {                               // JSON Schema
    type: 'object',
    properties: {
      temperature_c: { type: 'number' },
      humidity_pct: { type: 'number' },
      recorded_at: { type: 'string' },
    },
    required: ['temperature_c', 'recorded_at'],
    additionalProperties: false,
  },
  {                               // example (must validate against the schema)
    temperature_c: 21.3,
    humidity_pct: 65,
    recorded_at: '2026-04-14T09:00:00Z',
  },
);

// 2. Validate before inserting (optional — insertRecord validates automatically)
const check = validateRecord('weather', { temperature_c: 19.5, recorded_at: '2026-04-14T10:00:00Z' });
// { valid: true, errors: null }

// 3. Insert a record
const src = createDataSource({ name: 'weather-station', type: 'iot' });
insertRecord('weather', {
  source_id: src.id,
  temperature_c: 19.5,
  humidity_pct: 72,
  recorded_at: '2026-04-14T10:00:00Z',
});
```

### CLI

```bash
# Create schema definition file
cat > weather-schema.json << 'EOF'
{
  "record_type": "weather",
  "label": "Weather",
  "description": "Weather readings",
  "json_schema": {
    "type": "object",
    "properties": {
      "temperature_c": { "type": "number" },
      "humidity_pct": { "type": "number" },
      "recorded_at": { "type": "string" }
    },
    "required": ["temperature_c", "recorded_at"],
    "additionalProperties": false
  },
  "example": { "temperature_c": 21.3, "humidity_pct": 65, "recorded_at": "2026-04-14T09:00:00Z" }
}
EOF

# Register it
node src/schema-registry.mjs register weather-schema.json

# Validate data against it
echo '{"temperature_c": 19.5, "recorded_at": "2026-04-14T10:00:00Z"}' > data.json
node src/schema-registry.mjs validate weather data.json
```

## Querying Schemas

```javascript
import { listSchemas, getSchema } from '../src/db.mjs';

// List all registered types (record_type, label, description)
const schemas = listSchemas();

// Get full schema definition (includes json_schema, example, timestamps)
const schema = getSchema('health_metric');
```

```bash
node src/schema-registry.mjs list
node src/schema-registry.mjs get health_metric
```

## Behavior Notes

- **Validation on insert**: `insertRecord()` validates data against the registered schema. Throws `Validation failed` if invalid.
- **Unregistered types**: `insertRecord()` logs a warning but allows insertion. No validation occurs.
- **Schema updates**: `registerSchema()` uses `INSERT OR REPLACE` — calling it again with the same `record_type` overwrites the definition.
- **Wiki pages**: Each registered schema auto-generates an Obsidian page at `wiki/schemas/{type}.md` with a fields table and example.
- **record_type format**: Must match `/^[a-zA-Z0-9_-]+$/` (letters, digits, underscores, hyphens).
- **additionalProperties**: All pre-registered schemas use `additionalProperties: false`. Custom schemas can set this to `true` if desired.
- **All schemas use `additionalProperties: false`** by convention. The `source_id` and other `insertRecord` envelope fields are stripped before validation — only the data payload fields are checked.

## Database Table

```sql
CREATE TABLE data_schemas (
  record_type TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  json_schema TEXT,      -- JSON string
  example     TEXT,      -- JSON string
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);
```
