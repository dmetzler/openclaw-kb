# Data Model: Hybrid 3-Tier Search System

**Feature**: 005-hybrid-search  
**Date**: 2026-04-14

## Entities

This feature does not introduce new database tables or schema changes. It operates as a read-only query layer over existing tables defined in spec 001 (sqlite-db-layer) and spec 004 (generic-data-records).

### Existing Tables Consumed

#### entities (Tier 1 — Knowledge Graph)

| Column | Type | Constraints | Indexed |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | PK |
| name | TEXT | NOT NULL, CHECK(length > 0) | idx_entities_name |
| type | TEXT | NOT NULL, CHECK(length > 0) | idx_entities_type |
| metadata | TEXT | DEFAULT '{}' (JSON) | — |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | — |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | — |

#### relations (Tier 1 — Knowledge Graph Edges)

| Column | Type | Constraints | Indexed |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | PK |
| source_id | INTEGER | NOT NULL, FK → entities(id) ON DELETE CASCADE | idx_relations_source |
| target_id | INTEGER | NOT NULL, FK → entities(id) ON DELETE CASCADE | idx_relations_target |
| type | TEXT | NOT NULL, CHECK(length > 0) | idx_relations_type |
| metadata | TEXT | DEFAULT '{}' (JSON) | — |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | — |

UNIQUE(source_id, target_id, type), CHECK(source_id != target_id)

#### data_records (Tier 2 — Data Lake)

| Column | Type | Constraints | Indexed |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | PK |
| source_id | INTEGER | NOT NULL, FK → data_sources(id) | — |
| record_type | TEXT | NOT NULL, CHECK(length > 0) | idx_data_records_type_time (composite) |
| data | TEXT | NOT NULL, DEFAULT '{}' (JSON) | — |
| recorded_at | TEXT | NOT NULL | idx_data_records_type_time (composite) |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | — |

#### search_index (Tier 3 — FTS5 Semantic, spans Tiers 1+2)

| Column | Type | Indexed | Notes |
|--------|------|---------|-------|
| name | TEXT | FTS5 | Entity name or record_type |
| content_text | TEXT | FTS5 | Entity metadata JSON or record data JSON |
| source_table | TEXT | FTS5 | 'entities' or 'data_records' |
| source_id | INTEGER | UNINDEXED | ID in source table |

Configuration: `prefix='2 3'` (2–3 character prefix indexing)

Auto-populated by triggers on INSERT/UPDATE/DELETE of `entities` and `data_records`.

#### vec_embeddings (Tier 3 — Vector Semantic)

| Column | Type | Notes |
|--------|------|-------|
| entity_id | INTEGER | PRIMARY KEY, references entities(id) |
| embedding | float[768] | distance_metric=cosine |

## Data Flow

```text
                    ┌─────────────────────────────────────────────────────┐
                    │                wiki-search.mjs                      │
                    │                                                     │
  search(query) ──▶│  ┌──────────┐  ┌───────────┐  ┌───────────────┐   │
                    │  │ searchKG │  │searchData │  │searchSemantic │   │
                    │  └────┬─────┘  └─────┬─────┘  └───────┬───────┘   │
                    │       │              │                │            │
                    │       ▼              ▼                ▼            │
                    │  ┌─────────────────────────────────────────────┐   │
                    │  │          deduplicateResults()               │   │
                    │  │   (KG > Data > Semantic priority)          │   │
                    │  └──────────────────┬──────────────────────────┘   │
                    │                     │                              │
                    │                     ▼                              │
                    │              SearchResult[]                        │
                    └─────────────────────────────────────────────────────┘
                                          │
                    Uses exclusively via named imports:
                                          │
                    ┌─────────────────────────────────────────────────────┐
                    │                    db.mjs                           │
                    │                                                     │
                    │  search()          → FTS5 query on search_index     │
                    │  findNearestVectors() → vec0 KNN on vec_embeddings │
                    │  traverseGraph()   → Recursive CTE on entities +   │
                    │                      relations                     │
                    │  getEntity()       → Single entity lookup          │
                    │  queryRecords()    → Filtered data_records query   │
                    └─────────────────────────────────────────────────────┘
```

## Result Schemas

### SearchResult (unified result object)

Returned by all four public functions. Shape is consistent regardless of which tier produced the result.

```javascript
/**
 * @typedef {Object} SearchResult
 * @property {number} id          - Source record ID (entities.id or data_records.id)
 * @property {string} name        - Entity name, record type, or matched content title
 * @property {string} snippet     - Content preview text (FTS5 highlighted with <b> tags, or metadata excerpt)
 * @property {number} tier        - Source tier: 1 (KG), 2 (Data), 3 (Semantic)
 * @property {string} source_table - Underlying table: 'entities' or 'data_records'
 * @property {number} score       - Normalized relevance score (0–1). Present when includeScores=true.
 * @property {Object} [metadata]  - Tier-specific additional data (optional)
 */
```

### Tier-specific metadata shapes

**Tier 1 (KG) metadata**:
```javascript
{
  entity_type: string,        // Entity type (e.g., 'person', 'concept')
  depth: number,              // Graph traversal depth (0 = direct match)
  path: string,               // Traversal path (e.g., '1,5,12')
  relation_type: string|null  // Relation type for traversed results, null for direct
}
```

**Tier 2 (Data) metadata**:
```javascript
{
  record_type: string,        // Data record type (e.g., 'health_metric')
  recorded_at: string,        // ISO timestamp of the record
  data: Object                // Full record data payload
}
```

**Tier 3 (Semantic) metadata**:
```javascript
{
  fts_score: number|null,     // Normalized FTS5 score (0–1), null if no FTS match
  vec_score: number|null,     // Vector similarity score (0–1), null if no embedding match
  combined_method: string     // 'fts_only', 'vec_only', or 'weighted'
}
```

### SearchOptions (unified search options)

```javascript
/**
 * @typedef {Object} SearchOptions
 * @property {number}   [maxResults=20]      - Maximum results to return
 * @property {number[]} [tiers=[1,2,3]]      - Tier numbers to query
 * @property {boolean}  [includeScores=false] - Include score and tier fields in results
 */
```

### SemanticSearchOptions (semantic tier options)

```javascript
/**
 * @typedef {Object} SemanticSearchOptions
 * @property {number}         [ftsWeight=0.7]     - FTS5 score weight (0–1)
 * @property {number}         [vectorWeight=0.3]  - Vector similarity weight (0–1)
 * @property {number}         [minScore=0.0]      - Minimum combined score threshold
 * @property {number}         [maxResults=20]     - Maximum results
 * @property {Float32Array|number[]} [queryVector] - Pre-computed query embedding (768-dim)
 */
```

## Score Normalization Pipeline

```text
FTS5 rank (negative BM25)          vec0 distance (cosine, 0–2)
        │                                    │
        ▼                                    ▼
  bm25ToScore()                    vecDistanceToSimilarity()
  relevance/(1+relevance)          max(0, 1 - distance)
        │                                    │
        ▼                                    ▼
  ftsScore ∈ [0, 1]               vecScore ∈ [0, 1]
        │                                    │
        └──────────┐      ┌─────────────────┘
                   ▼      ▼
            combinedScore = ftsWeight × ftsScore + vectorWeight × vecScore
                      │
                      ▼
              score ∈ [0, 1]  (filtered by minScore)
```

## Deduplication Rules

1. **Within a tier**: FTS5 results are already deduplicated by SQLite. Vector results are deduplicated by entity_id. KG traversal uses cycle detection via path tracking.

2. **Across tiers**: Results are processed in priority order (Tier 1 → 2 → 3). A `Map<string, SearchResult>` keyed by `${source_table}:${source_id}` tracks seen results. When a result's key already exists, the lower-priority tier's result is discarded.

3. **Cross-tier identity**: Only results with the same `source_table` AND `source_id` are considered duplicates. An entity "sleep" (entities table) and a data record tracking sleep hours (data_records table) are NOT duplicates — they have different source tables.

## State Transitions

This module is stateless. No data modifications, no caching, no session state. Every function call is an independent read-only query.

## Validation Rules

| Input | Validation | Error |
|-------|-----------|-------|
| `query` (all functions) | Non-empty string after trim | Return `[]` (no throw, per FR-015) |
| `options.maxResults` | Must be positive integer if provided | Default to 20 if ≤ 0 or non-integer |
| `options.tiers` | Array of 1, 2, 3 | Ignore invalid tier numbers |
| `options.ftsWeight` + `vectorWeight` | Each 0–1, sum need not equal 1 | Clamp to [0, 1] |
| `options.minScore` | Number ≥ 0 | Default to 0.0 if negative |
| `options.queryVector` | Float32Array or number[] of length 768, or undefined | Skip vector search if absent |
| `recordType` (searchData) | String, optional | Omit filter if not provided |
