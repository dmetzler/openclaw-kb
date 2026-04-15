# API Contract: wiki-search.mjs

**Feature**: 005-hybrid-search  
**Module**: `src/wiki-search.mjs`  
**Date**: 2026-04-14

## Module Overview

ES module exporting four named search functions. All database access flows through `db.mjs` — no direct `better-sqlite3` imports. The module is stateless and read-only.

```javascript
import { search, searchKG, searchData, searchSemantic } from './wiki-search.mjs';
```

---

## Types

### SearchResult

Returned by all four public functions. Shape is identical regardless of source tier.

```javascript
/**
 * @typedef {Object} SearchResult
 * @property {number} id          - Source record ID (entities.id or data_records.id)
 * @property {string} name        - Entity name, record type, or matched content title
 * @property {string} snippet     - Content preview (FTS5 highlighted with <b> tags, or metadata excerpt)
 * @property {number} tier        - Source tier: 1 (KG), 2 (Data), 3 (Semantic)
 * @property {string} source_table - Underlying table: 'entities' or 'data_records'
 * @property {number} score       - Normalized relevance score (0–1)
 * @property {Object} [metadata]  - Tier-specific additional data (see data-model.md)
 */
```

### SearchOptions

```javascript
/**
 * @typedef {Object} SearchOptions
 * @property {number}   [maxResults=20]       - Maximum results to return
 * @property {number[]} [tiers=[1,2,3]]       - Tier numbers to query (1=KG, 2=Data, 3=Semantic)
 * @property {boolean}  [includeScores=false] - Include score and tier fields in results
 */
```

### SemanticSearchOptions

```javascript
/**
 * @typedef {Object} SemanticSearchOptions
 * @property {number}                  [ftsWeight=0.7]     - FTS5 score weight (0–1)
 * @property {number}                  [vectorWeight=0.3]  - Vector similarity weight (0–1)
 * @property {number}                  [minScore=0.0]      - Minimum combined score threshold
 * @property {number}                  [maxResults=20]     - Maximum results to return
 * @property {Float32Array|number[]}   [queryVector]       - Pre-computed query embedding (768-dim)
 */
```

---

## Functions

### `search(query, options?)`

Unified cross-tier search. Queries all specified tiers, merges results with deduplication, and ranks by tier priority (KG > Data > Semantic).

**Signature**:
```javascript
export function search(query, options = {})
```

**Parameters**:

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | *(required)* | Search query text |
| `options` | `SearchOptions` | `{}` | Search configuration |
| `options.maxResults` | `number` | `20` | Max results. Clamped to 1 if ≤ 0. |
| `options.tiers` | `number[]` | `[1, 2, 3]` | Which tiers to query. Invalid tier numbers are ignored. |
| `options.includeScores` | `boolean` | `false` | When true, `score` and `tier` fields are populated. |

**Returns**: `SearchResult[]` — Deduplicated results ordered by tier priority (1 > 2 > 3), then by score within each tier (descending). Array length ≤ `maxResults`.

**Behavior**:
1. Validate and trim `query`. If empty after trim, return `[]`.
2. Query each requested tier sequentially (KG → Data → Semantic).
3. Merge results using `${source_table}:${source_id}` dedup key. Higher-priority tier wins on collision.
4. Sort by tier priority (ascending tier number), then by score (descending) within each tier.
5. Truncate to `maxResults`.
6. If `includeScores` is false, omit `score` and `tier` fields from each result.

**Error behavior**: Never throws. Returns `[]` for invalid inputs (empty query, no matching tiers). Logs warnings for unexpected internal errors via `console.warn`.

**Example**:
```javascript
const results = search('Node.js', { maxResults: 10, tiers: [1, 3], includeScores: true });
// [
//   { id: 42, name: 'Node.js', snippet: '...', tier: 1, source_table: 'entities', score: 1.0, metadata: { entity_type: 'technology', depth: 0, path: '42', relation_type: null } },
//   { id: 7, name: 'Node.js', snippet: 'A JavaScript runtime...', tier: 3, source_table: 'entities', score: 0.85, metadata: { fts_score: 0.9, vec_score: 0.7, combined_method: 'weighted' } }
// ]
```

---

### `searchKG(query)`

Knowledge graph search with relation traversal. Finds entities by name/metadata match via FTS5, then traverses outbound relations from each seed entity.

**Signature**:
```javascript
export function searchKG(query)
```

**Parameters**:

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | *(required)* | Search query for entity name/metadata matching |

**Returns**: `SearchResult[]` — Results with `tier: 1` and `source_table: 'entities'`. Direct matches (depth 0) ranked above traversed matches. Traversed matches scored by distance-decay: depth 0 → 1.0, depth 1 → 0.6, depth 2+ → 0.3.

**Behavior**:
1. Validate and trim `query`. If empty after trim, return `[]`.
2. Call `db.search(query)` filtered to `source_table = 'entities'` to find seed entities.
3. For each seed entity, call `db.traverseGraph(seedId, maxDepth)` with `maxDepth = 2`.
4. Deduplicate traversed entities across all seeds using entity `id` as the dedup key. Keep the result with the smallest depth (closest to a direct match).
5. Score each result using distance-decay: `depthToScore(depth)`.
6. Return results sorted by score (descending), then by id (ascending) for tie-breaking.

**Error behavior**: Never throws. Returns `[]` for empty queries or when no entities match.

**Example**:
```javascript
const results = searchKG('Acme Corp');
// [
//   { id: 10, name: 'Acme Corp', snippet: '{"industry":"tech"}', tier: 1, source_table: 'entities', score: 1.0, metadata: { entity_type: 'company', depth: 0, path: '10', relation_type: null } },
//   { id: 5, name: 'Alice', snippet: '{"role":"engineer"}', tier: 1, source_table: 'entities', score: 0.6, metadata: { entity_type: 'person', depth: 1, path: '10,5', relation_type: 'works_at' } }
// ]
```

---

### `searchData(query, recordType?)`

Data records search via FTS5, optionally filtered by record type.

**Signature**:
```javascript
export function searchData(query, recordType)
```

**Parameters**:

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | *(required)* | Search query text |
| `recordType` | `string` | `undefined` | Filter to a specific record type (e.g., `'health_metric'`). Omit for all types. |

**Returns**: `SearchResult[]` — Results with `tier: 2` and `source_table: 'data_records'`. Ordered by FTS5 relevance score (descending).

**Behavior**:
1. Validate and trim `query`. If empty after trim, return `[]`.
2. Call `db.search(query)` filtered to `source_table = 'data_records'`.
3. If `recordType` is provided, further filter results to matching record type by looking up the underlying `data_records` row via `db.queryRecords()` or comparing the `name` field (which stores record_type for data records).
4. Normalize FTS5 rank to 0–1 score using `bm25ToScore(rank)`.
5. Populate `metadata` with `{ record_type, recorded_at, data }` from the underlying data record.
6. Return results sorted by score (descending).

**Error behavior**: Never throws. Returns `[]` for empty queries or no matches.

**Example**:
```javascript
const results = searchData('blood pressure', 'health_metric');
// [
//   { id: 101, name: 'health_metric', snippet: '...blood pressure...', tier: 2, source_table: 'data_records', score: 0.78, metadata: { record_type: 'health_metric', recorded_at: '2026-04-10T08:30:00Z', data: { systolic: 120, diastolic: 80 } } }
// ]
```

---

### `searchSemantic(query, options?)`

Combined FTS5 full-text and vec0 vector similarity search with configurable weights.

**Signature**:
```javascript
export function searchSemantic(query, options = {})
```

**Parameters**:

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `string` | *(required)* | Search query text |
| `options` | `SemanticSearchOptions` | `{}` | Semantic search configuration |
| `options.ftsWeight` | `number` | `0.7` | Weight for FTS5 score. Clamped to [0, 1]. |
| `options.vectorWeight` | `number` | `0.3` | Weight for vector similarity. Clamped to [0, 1]. |
| `options.minScore` | `number` | `0.0` | Minimum combined score threshold. Results below this are excluded. |
| `options.maxResults` | `number` | `20` | Maximum results to return. |
| `options.queryVector` | `Float32Array\|number[]` | `undefined` | Pre-computed 768-dim query embedding. If absent, vector search is skipped. |

**Returns**: `SearchResult[]` — Results with `tier: 3`. Ordered by combined score (descending). Array length ≤ `maxResults`.

**Behavior**:
1. Validate and trim `query`. If empty after trim, return `[]`.
2. Call `db.search(query)` to get FTS5 results. Normalize ranks via `bm25ToScore(rank)`.
3. If `queryVector` is provided (and is a valid 768-element array), call `db.findNearestVectors(queryVector, maxResults)` to get vector results. Convert distances via `vecDistanceToSimilarity(distance)`.
4. If `queryVector` is absent, skip vector search. Set `effectiveFtsWeight = 1.0`, `effectiveVecWeight = 0`.
5. Build a combined result map keyed by `${source_table}:${source_id}`:
   - FTS-only match: `combinedScore = effectiveFtsWeight * ftsScore`
   - Vector-only match: `combinedScore = effectiveVecWeight * vecScore`
   - Both: `combinedScore = effectiveFtsWeight * ftsScore + effectiveVecWeight * vecScore`
6. Filter out results with `combinedScore < minScore`.
7. Populate `metadata.fts_score`, `metadata.vec_score`, and `metadata.combined_method` (`'fts_only'`, `'vec_only'`, or `'weighted'`).
8. Sort by combined score (descending), truncate to `maxResults`.

**Error behavior**: Never throws. Returns `[]` for empty queries. Ignores invalid `queryVector` (wrong length, non-numeric) and falls back to FTS-only. Logs `console.warn` if vec0 operations fail.

**Example**:
```javascript
// FTS5 + vector combined
const results = searchSemantic('artificial intelligence', {
  ftsWeight: 0.6,
  vectorWeight: 0.4,
  minScore: 0.3,
  queryVector: new Float32Array(768).fill(0.1) // placeholder embedding
});

// FTS5 only (no vector)
const ftsOnly = searchSemantic('exact keyword match');
```

---

## Internal Helper Functions (not exported)

These are implementation details documented here for contract completeness. They are NOT part of the public API.

| Function | Signature | Purpose |
|----------|-----------|---------|
| `bm25ToScore(rank)` | `(number) → number` | Convert FTS5 negative BM25 rank to 0–1 score |
| `vecDistanceToSimilarity(distance)` | `(number) → number` | Convert vec0 cosine distance to 0–1 similarity |
| `depthToScore(depth)` | `(number) → number` | Convert KG traversal depth to distance-decay score |
| `deduplicateResults(resultsByTier)` | `(Map<number, SearchResult[]>) → SearchResult[]` | Cross-tier dedup, higher tier wins |

---

## Dependencies

This module imports exclusively from `db.mjs`:

```javascript
import {
  search,             // FTS5 full-text search
  findNearestVectors, // vec0 KNN search
  traverseGraph,      // Recursive CTE graph traversal
  getEntity,          // Single entity lookup
  queryRecords        // Filtered data_records query
} from './db.mjs';
```

No other imports. No `better-sqlite3`. No `sqlite-vec`. No new npm packages.

---

## Error Contract

| Condition | Behavior |
|-----------|----------|
| Empty/whitespace query | Return `[]` (no throw) |
| FTS5 special characters in query | Sanitized by `db.search()` internally |
| `queryVector` wrong dimensions | Skip vector search, FTS-only fallback |
| `queryVector` absent | Skip vector search, FTS-only fallback |
| vec0 extension not loaded | `db.findNearestVectors()` fails gracefully → FTS-only fallback |
| `maxResults ≤ 0` | Clamp to default (20) |
| Invalid tier numbers in `options.tiers` | Ignore invalid numbers, query valid ones |
| No matching results | Return `[]` |
| Stale FTS5 entries (deleted source) | Entity lookup returns null → skip result |
