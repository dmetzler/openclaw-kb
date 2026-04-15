# Research: Hybrid 3-Tier Search System

**Feature**: 005-hybrid-search  
**Date**: 2026-04-14  
**Status**: Complete

## R-001: FTS5 BM25 Score Normalization

**Decision**: Use hyperbolic saturation formula `relevance / (1 + relevance)` where `relevance = -rank`.

**Rationale**: FTS5's `rank` column returns negative BM25 scores (more negative = better match). The hyperbolic saturation formula maps these to a stable 0–1 range without requiring batch context:
- Rank `-1` → score `0.5`
- Rank `-5` → score `0.833`
- Rank `-15` → score `0.938`
- Rank `-50` → score `0.980`

This is the dominant pattern across production hybrid search systems (OpenClaw, ElizaOS, Chaterm, beacon-plugin). It handles edge cases (non-finite, positive ranks) cleanly and is deterministic per-result (no batch dependency).

**Alternatives Considered**:
- **Sigmoid (`1 / (1 + Math.exp(rank))`)**: Simpler but poor discrimination — most results cluster in the 0.5–1.0 range without meaningful spread.
- **Min-max normalization**: Requires batch context (all results must be present to normalize), making it non-deterministic across queries. Useful as a secondary step but not as the primary normalizer.
- **Raw rank passthrough**: Not comparable with vector similarity scores, which are 0–1.

**Implementation**:
```javascript
function bm25ToScore(rank) {
  if (!Number.isFinite(rank)) return 0.001;
  if (rank < 0) {
    const relevance = -rank;
    return relevance / (1 + relevance);
  }
  return 1 / (1 + rank);
}
```

---

## R-002: vec0 Cosine Distance to Similarity Conversion

**Decision**: Use `similarity = 1 - distance` for vec0 cosine distance results.

**Rationale**: The `vec_embeddings` table is defined with `distance_metric=cosine`, so the `distance` column returns cosine distance in range [0, 2] (0 = identical vectors). The conversion `1 - distance` maps to:
- Distance `0.0` → similarity `1.0` (identical)
- Distance `0.5` → similarity `0.5` (moderately similar)
- Distance `1.0` → similarity `0.0` (orthogonal)
- Distance `2.0` → similarity `-1.0` (opposite, rare for text embeddings)

In practice, text embeddings rarely produce distance > 1.0, so the effective range is [0, 1].

**Alternatives Considered**:
- **`(2 - distance) / 2`**: Normalizes to strict [0, 1] for all inputs but distorts the linear relationship with true cosine similarity.
- **No conversion**: Distance is inversely related to relevance, making weighted combination with FTS5 scores counterintuitive.

**Implementation**:
```javascript
function vecDistanceToSimilarity(distance) {
  return Math.max(0, 1 - distance);
}
```

---

## R-003: Weighted Score Fusion Strategy

**Decision**: Use direct weighted score fusion with configurable weights (default: FTS5 0.7, vector 0.3). Redistribute weight to 100% text when no vector results are available.

**Rationale**: The spec (FR-009) explicitly requires configurable `ftsWeight` and `vectorWeight` parameters. Direct weighted fusion is simpler than RRF, preserves score magnitude information, and produces deterministic combined scores (SC-004). The spec's default weights (ftsWeight 0.7, vectorWeight 0.3) favor keyword precision over semantic discovery, which is appropriate for a knowledge base where entity names and record types are well-defined.

**Alternatives Considered**:
- **Reciprocal Rank Fusion (RRF)**: Ignores score magnitudes, uses only rank position. Simpler but loses information — a barely-matching FTS hit at rank 3 scores the same as a perfect hit at rank 3. RRF uses a constant `k=60` universally. Not suitable here because the spec requires explicit score control via weights.
- **Tri-component hybrid (vector + BM25 + RRF)**: Overly complex for this use case. Appropriate for code search (beacon-plugin) where identifier boosting and file-type penalties matter, but unnecessary for a knowledge base search module.

**Graceful Degradation**: When no vector results exist (FR-011), redistribute vector weight to FTS:
```javascript
const hasVec = vecResults.length > 0;
const effectiveFtsWeight = hasVec ? ftsWeight : 1.0;
const effectiveVecWeight = hasVec ? vectorWeight : 0;
```

---

## R-004: Knowledge Graph Traversal Strategy

**Decision**: Use the existing `traverseGraph()` function from `db.mjs` for graph expansion. Supplement with FTS5 search on `search_index` (filtered to `source_table = 'entities'`) for the initial entity name/type matching.

**Rationale**: `db.mjs` already exports `traverseGraph(startEntityId, maxDepth)` which implements a recursive CTE with BFS, depth tracking, and cycle detection via path-string inspection. This function:
- Returns entities with `{ id, name, type, depth, path }` ordered by depth then id
- Prevents cycles via `INSTR(t.path, CAST(e.id AS TEXT)) = 0`
- Follows **outbound relations only** (source → target direction)
- Already tested and stable

The `searchKG()` function will:
1. Use `db.search(query, { source_table: 'entities' })` to find seed entities by name/metadata match
2. For each seed, call `db.traverseGraph(seed.source_id, maxDepth)` to discover related entities
3. Rank direct matches (depth 0) above traversed matches using distance-decay scoring

**Alternatives Considered**:
- **Custom recursive CTE with bidirectional traversal**: More comprehensive (follows both outbound and inbound relations) but the existing `traverseGraph()` only does outbound. Adding inbound would require modifying `db.mjs`, which violates the principle of minimal change and the spec assumption that `db.mjs` exports are stable.
- **Application-level BFS with fan-out control**: Better for dense graphs with high-degree nodes, but adds complexity. The knowledge base is expected to be sparse (entity-relation graph, not a social network), so the recursive CTE approach is sufficient.

**Distance-Decay Scoring**:
```javascript
function depthToScore(depth) {
  if (depth === 0) return 1.0;    // Direct match
  if (depth === 1) return 0.6;    // Immediate neighbor
  return 0.3;                     // 2+ hops
}
```

---

## R-005: Cross-Tier Deduplication Strategy

**Decision**: Deduplicate by entity ID across tiers. When the same entity appears in multiple tiers, keep the highest-priority tier's result (KG > Data > Semantic). Use `source_id` + `source_table` as the composite deduplication key.

**Rationale**: The spec (FR-012) requires deduplication using entity identifiers, with the highest-priority tier's result kept. Since:
- KG entities have a numeric `id` in the `entities` table
- Data records have a numeric `id` in the `data_records` table
- Semantic results reference entities via `source_id` in the `search_index` table

The `source_table + source_id` pair uniquely identifies a result. For cross-tier deduplication: if the same entity ID appears from both the `entities` table (via KG search) and from the `search_index` (via semantic search), the KG result wins.

**Edge Case**: When a KG entity and a data record refer to the same real-world concept but have different IDs (e.g., entity "sleep" vs. data_record "sleep_tracker"), they are NOT duplicates — they represent different facets. The spec (edge case #6) acknowledges this: priority resolution applies to different aspects, not identity-level deduplication.

**Implementation**: Use a `Map<string, SearchResult>` keyed by `${source_table}:${source_id}`. Process tiers in priority order (KG first, Data second, Semantic third). Skip entries whose key already exists.

---

## R-006: FTS5 Query Sanitization

**Decision**: Reuse the existing query escaping logic from `db.search()` in `db.mjs`, which strips FTS5 special characters: `*"():^~+\-{}[]` (replaced with space).

**Rationale**: The existing `db.search()` function already handles FTS5 special character escaping. Since `wiki-search.mjs` must use `db.mjs` exclusively (FR-014), the sanitization is already applied when calling `db.search()`. For the `searchData()` function which also uses `db.search()`, the same sanitization applies.

For edge cases (FR-015):
- Empty/whitespace queries: Check before calling `db.search()`, return `[]` immediately
- Special characters only: After sanitization, if result is empty/whitespace, return `[]`

---

## R-007: Unified Search Result Schema

**Decision**: Define a single `SearchResult` object shape used by all search functions, with tier-specific optional fields.

**Rationale**: The spec (FR-004, Key Entities) defines the result shape as: identifier, name/title, content snippet, source tier (1/2/3), source table, relevance score, and optional metadata. A unified shape ensures consumers don't need to handle different result formats per tier.

**Implementation**:
```javascript
/**
 * @typedef {Object} SearchResult
 * @property {number} id - Source record ID
 * @property {string} name - Entity name, record type, or page title
 * @property {string} snippet - Content preview (highlighted for FTS5)
 * @property {number} tier - Source tier (1=KG, 2=Data, 3=Semantic)
 * @property {string} source_table - Underlying table ('entities', 'data_records')
 * @property {number} score - Normalized relevance score (0-1)
 * @property {Object} [metadata] - Tier-specific metadata
 */
```

---

## R-008: Performance Approach for <200ms Target

**Decision**: Execute tier queries sequentially (KG → Data → Semantic), using early termination when `maxResults` is reached from higher-priority tiers. No parallel execution needed.

**Rationale**: The spec targets 200ms for 1000+ entities, 5000+ data records, and 500+ wiki index entries (SC-003). Given:
- FTS5 queries are O(log n) with prefix indexing (already configured with `prefix='2 3'`)
- vec0 KNN queries are O(n·d) where n = embeddings count and d = dimensions, but sqlite-vec uses optimized SIMD internally
- `traverseGraph()` with maxDepth=2 expands at most ~20 nodes per seed on a sparse graph
- All queries are on `:memory:` or WAL-mode SQLite — no disk I/O bottlenecks

Sequential execution is sufficient. The total query time for three tier searches on the specified data sizes should be well under 100ms. Parallel execution would add complexity (Promise.all, error handling) without meaningful benefit.

**Validation**: Integration tests should include a timing assertion using `performance.now()` to verify the 200ms target.

---

## R-009: searchData Metadata Lookup Optimization

**Decision**: Accept current `queryRecords(hit.name, { limit: 1000 })` + `.find()` approach. Document as future optimization opportunity.

**Rationale**: The `searchData()` function enriches FTS5 results with full record metadata by:
1. Calling `queryRecords(recordType, { limit: 1000 })` to fetch up to 1,000 records of the matching type
2. Using `.find(r => r.id === hit.source_id)` to locate the specific record

This is O(n) per FTS5 hit. However:
- `db.mjs` does not export a `getDataRecord(id)` function for direct ID lookup
- Adding such a function would modify `db.mjs`, outside this feature's scope
- For the target scale (5,000+ records), FTS5 typically returns 5–20 hits. Each `queryRecords` call is fast on SQLite's in-memory or WAL-mode DB, well within the 200ms budget

**Future optimization**: When `db.mjs` is next enhanced, adding `getDataRecord(id)` would allow O(1) lookup per hit, reducing the scan from 1,000 rows to 1 row per result.
