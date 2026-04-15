# Quickstart: Hybrid 3-Tier Search

**Feature**: 005-hybrid-search  
**Module**: `src/wiki-search.mjs`

## Setup

```javascript
import { search, searchKG, searchData, searchSemantic } from './wiki-search.mjs';
```

No additional setup required. The module uses `db.mjs` internally — ensure the database is initialized with `initializeDatabase()` before calling search functions.

---

## Unified Search

Search across all tiers with a single call:

```javascript
// Basic search — returns up to 20 results from all tiers
const results = search('Node.js');

// With options — limit results, select tiers, include scores
const results = search('Node.js', {
  maxResults: 10,
  tiers: [1, 3],        // KG + Semantic only, skip Data
  includeScores: true
});

// Each result:
// {
//   id: 42,
//   name: 'Node.js',
//   snippet: 'A JavaScript runtime built on V8...',
//   tier: 1,
//   source_table: 'entities',
//   score: 1.0,
//   metadata: { entity_type: 'technology', depth: 0, path: '42', relation_type: null }
// }
```

Results are always ordered: KG entities first, then data records, then semantic matches. Duplicates across tiers are removed — the highest-priority tier wins.

---

## Knowledge Graph Search

Find entities and their relations:

```javascript
// Find an entity and its connected entities
const results = searchKG('Acme Corp');

// Direct match (depth 0, score 1.0)
// { id: 10, name: 'Acme Corp', tier: 1, score: 1.0,
//   metadata: { entity_type: 'company', depth: 0, path: '10', relation_type: null } }

// Traversed match (depth 1, score 0.6)
// { id: 5, name: 'Alice', tier: 1, score: 0.6,
//   metadata: { entity_type: 'person', depth: 1, path: '10,5', relation_type: 'works_at' } }
```

Traversal follows outbound relations up to depth 2. Scoring: depth 0 → 1.0, depth 1 → 0.6, depth 2 → 0.3.

---

## Data Records Search

Search structured data records, optionally filtered by type:

```javascript
// All record types
const results = searchData('weight');

// Filtered to a specific record type
const results = searchData('blood pressure', 'health_metric');

// { id: 101, name: 'health_metric', tier: 2, score: 0.78,
//   metadata: {
//     record_type: 'health_metric',
//     recorded_at: '2026-04-10T08:30:00Z',
//     data: { systolic: 120, diastolic: 80 }
//   } }
```

---

## Semantic Search

Combine FTS5 keyword matching with vector similarity:

```javascript
// FTS5 only (no embedding provided)
const results = searchSemantic('artificial intelligence');

// FTS5 + vector similarity
const results = searchSemantic('artificial intelligence', {
  ftsWeight: 0.6,
  vectorWeight: 0.4,
  minScore: 0.3,
  maxResults: 15,
  queryVector: embeddingModel.encode('artificial intelligence') // 768-dim Float32Array
});

// { id: 7, name: 'AI Overview', tier: 3, score: 0.82,
//   metadata: { fts_score: 0.9, vec_score: 0.7, combined_method: 'weighted' } }
```

When `queryVector` is omitted, the function uses FTS5 scores only — no error, no degradation message.

---

## Edge Cases

```javascript
// Empty query — returns []
search('');
search('   ');

// Special characters — sanitized internally, no errors
search('C++ "hello world" OR *wildcard*');

// No matches — returns []
search('xyzzy_nonexistent_term_42');

// Invalid tier numbers — ignored
search('query', { tiers: [1, 5, 99] }); // queries tier 1 only

// Missing embeddings — FTS-only fallback
searchSemantic('query', { queryVector: undefined });
```

---

## Integration with LLM Prompts

Load the priority rules template for LLM context:

```javascript
import { readFileSync } from 'fs';

const priorityRules = readFileSync('templates/priority-rules.md', 'utf-8');
const results = search('user question', { includeScores: true });

const systemPrompt = `
${priorityRules}

Search results:
${JSON.stringify(results, null, 2)}

Answer the user's question using the search results above.
Follow the priority rules when information conflicts across tiers.
`;
```
