# wiki-search.mjs — Hybrid Search

The wiki-search module provides a unified search interface that combines knowledge graph traversal, data lake queries, and semantic search (FTS5 + vector similarity) into a single ranked result set.

**Source:** `src/wiki-search.mjs` (556 lines)
**Dependencies:** `db.mjs`

---

## Exported Functions

### `search(query, options?)`

The primary search entry point. Queries all three tiers and returns a deduplicated, ranked result set.

```js
import { search } from './wiki-search.mjs';

const results = await search('machine learning', {
  maxResults: 20,
  ftsWeight: 0.7,
  vectorWeight: 0.3
});
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | string | — | Search query (must be non-empty) |
| `options.maxResults` | number | 20 | Maximum results (capped at 200) |
| `options.ftsWeight` | number | 0.7 | Weight for FTS5 BM25 score |
| `options.vectorWeight` | number | 0.3 | Weight for vector cosine similarity |

**Returns:** `Array<SearchResult>` — Deduplicated results sorted by descending score.

**Result shape:**

```js
{
  source_table: 'entities',  // 'entities' | 'data_records'
  source_id: 42,
  name: 'Machine Learning',
  snippet: '...matching text...',
  score: 0.85,
  tier: 1                    // 1=KG, 2=DataLake, 3=Semantic
}
```

**Throws:** `Error` if query is not a non-empty string.

---

### `searchKG(query, options?)`

Searches the knowledge graph via entity name matching and graph traversal.

```js
import { searchKG } from './wiki-search.mjs';

const kgResults = searchKG('React');
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | string | — | Entity name to search for |
| `options.maxResults` | number | 20 | Maximum results |

**Returns:** `Array<SearchResult>` — Entities scored by graph depth (1.0 for direct match, 0.6 for 1-hop, 0.3 for 2+ hops).

---

### `searchData(query, options?)`

Searches the data lake (structured records).

```js
import { searchData } from './wiki-search.mjs';

const dataResults = searchData('blood pressure');
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | string | — | Search query |
| `options.maxResults` | number | 20 | Maximum results |

**Returns:** `Array<SearchResult>` — Data records matching the query.

---

### `searchSemantic(query, options?)`

Combines FTS5 full-text search and vector similarity search.

```js
import { searchSemantic } from './wiki-search.mjs';

const semanticResults = searchSemantic('JavaScript frameworks', {
  ftsWeight: 0.7,
  vectorWeight: 0.3,
  maxResults: 10
});
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | string | — | Search query |
| `options.ftsWeight` | number | 0.7 | BM25 score weight |
| `options.vectorWeight` | number | 0.3 | Vector similarity weight |
| `options.maxResults` | number | 20 | Maximum results |

**Returns:** `Array<SearchResult>` — Results with combined FTS5 + vector scores.

---

## Internal Functions

These functions are not exported but document the scoring internals.

### `bm25ToScore(rank)`

Converts FTS5 negative rank to a `[0, 1)` score.

```js
bm25ToScore(-1)   // → 0.5
bm25ToScore(-10)  // → 0.909...
```

**Formula:** `(-rank) / (1 + (-rank))`

### `vecDistanceToSimilarity(distance)`

Converts cosine distance `[0, 2]` to similarity `[0, 1]`.

```js
vecDistanceToSimilarity(0)    // → 1.0
vecDistanceToSimilarity(0.5)  // → 0.5
vecDistanceToSimilarity(1.5)  // → 0.0 (clamped)
```

**Formula:** `Math.max(0, 1 - distance)`

### `depthToScore(depth)`

Maps graph traversal depth to a relevance score.

```js
depthToScore(0)  // → 1.0
depthToScore(1)  // → 0.6
depthToScore(2)  // → 0.3
```

### `deduplicateResults(results)`

Merges results by `(source_table, source_id)`, keeping the highest-scoring entry.

### `validateQuery(query)`

Validates that the query is a non-empty string. Throws `Error` if invalid.

### `clamp01(value)`

Clamps a numeric value to the `[0, 1]` range.

### `normaliseMaxResults(maxResults)`

Normalises the max results parameter: defaults to 20, minimum 1, maximum 200.

### `normaliseTiers(results)`

Ensures consistent result structure across tiers by normalising field names.

---

## Related Pages

- [Search Internals](../developer-guide/search-internals.md) — Scoring algorithms and fusion strategy
- [API: db.mjs](db.md) — Underlying database search and traversal functions
- [User Guide: Search](../user-guide/search.md) — End-user search documentation
