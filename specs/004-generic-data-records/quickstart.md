# Quickstart: Generic Data Records

**Feature**: 004-generic-data-records
**Date**: 2026-04-14

## Overview

After this feature is implemented, the data lake uses a single `data_records` table instead of four separate tables. You interact with it through two functions: `insertRecord()` and `queryRecords()`.

## Storing Records

```javascript
import { initDatabase, createDataSource, insertRecord } from './src/db.mjs';

initDatabase(':memory:');

// Create a data source first
const source = createDataSource({ name: 'my-app', type: 'api' });

// Insert a health metric
insertRecord('health_metric', {
  source_id: source.id,
  recorded_at: '2026-01-15T08:00:00',
  metric_type: 'weight',
  value: 75.5,
  unit: 'kg',
  metadata: { note: 'morning' }
});

// Insert a completely new type — no code changes needed!
insertRecord('finance', {
  source_id: source.id,
  recorded_at: '2026-01-15T12:00:00',
  amount: 42.50,
  category: 'groceries',
  vendor: 'Whole Foods'
});
```

## Querying Records

```javascript
import { queryRecords } from './src/db.mjs';

// Basic: get all finance records
const records = queryRecords('finance');

// With date range
const jan = queryRecords('finance', {
  from: '2026-01-01',
  to: '2026-01-31'
});

// With source filter
const fromApp = queryRecords('health_metric', {
  source_id: 1
});

// With JSON field filter (top-level keys only)
const groceries = queryRecords('finance', {
  jsonFilters: { category: 'groceries' }
});

// Pagination
const page2 = queryRecords('finance', {
  limit: 10,
  offset: 10
});
```

## Export & Import

```bash
# Export — creates data_records.jsonl (replaces 4 CSV files)
node src/kb-export.mjs ./backup

# Import — reads data_records.jsonl
node src/kb-import.mjs ./backup --db new.db
```

## Migration from Legacy Tables

If you have an existing `jarvis.db` with the old schema (health_metrics, activities, grades, meals), the migration runs automatically on `initDatabase()`:

```javascript
initDatabase('jarvis.db');
// Migration 001-generic-data-records.sql runs automatically:
// 1. Creates data_records table
// 2. Moves all data from 4 legacy tables
// 3. Drops legacy tables
// 4. Updates FTS5 triggers
```

## Record Counts

```javascript
import { getRecordCounts } from './src/db.mjs';

const counts = getRecordCounts();
// {
//   data_records: { health_metric: 4, activity: 3, grade: 2, meal: 1, finance: 2 },
//   data_sources: 1,
//   entities: 5,
//   relations: 3,
//   embeddings: 0
// }
```

## Full-Text Search

Data records are automatically indexed in FTS5. Search results include `source_table: 'data_records'`.

```javascript
import { search } from './src/db.mjs';

const results = search('groceries');
// [{ source_table: 'data_records', source_id: 2, name: 'finance', snippet: '...groceries...' }]
```
