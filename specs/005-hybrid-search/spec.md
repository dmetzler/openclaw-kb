# Feature Specification: Hybrid 3-Tier Search System

**Feature Branch**: `005-hybrid-search`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "Hybrid 3-tier search system for the OpenClaw Knowledge Base. Building on the SQLite foundation (spec 001) which already has FTS5 and vec0 set up. This feature adds a unified search function (wiki-search.mjs) that queries all 3 tiers and merges results with deterministic priority rules."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Search Across All Knowledge Tiers (Priority: P1)

A developer querying the OpenClaw Knowledge Base needs a single entry point that searches across all three data tiers — knowledge graph entities, structured data records, and semantic content — and returns a merged, deduplicated, priority-ranked result set. They call `search(query, options)` with a natural-language query string and receive results where verified knowledge graph facts always take precedence, structured data metrics come next, and semantic full-text/vector matches fill in context. The developer does not need to know which tier produced each result, though tier provenance is included in the response for transparency.

**Why this priority**: The unified search function is the core value proposition of this feature. Without it, consumers must manually query three separate data layers, merge results themselves, and implement ad-hoc priority logic — leading to inconsistent answers and duplicated effort across every caller.

**Independent Test**: Can be fully tested by populating all three tiers with overlapping data (an entity named "Alice" in the knowledge graph, a data record about "Alice" in data_records, and a wiki page mentioning "Alice"), then calling `search("Alice")` and verifying: (1) results from all three tiers appear, (2) the knowledge graph result ranks highest, (3) no duplicates exist for the same underlying entity, (4) each result includes its tier of origin.

**Acceptance Scenarios**:

1. **Given** the knowledge base contains an entity "Node.js" in the knowledge graph, a data record with record_type "technology_metric" mentioning "Node.js", and a wiki page about "Node.js", **When** a developer calls `search("Node.js")`, **Then** the results include matches from all three tiers, with the knowledge graph entity ranked first.
2. **Given** the knowledge graph contains entity "Python" and a wiki page also describes "Python", **When** a developer calls `search("Python")`, **Then** the result set contains exactly one entry for "Python" (deduplicated), sourced from the knowledge graph tier (highest priority).
3. **Given** an empty knowledge base, **When** a developer calls `search("anything")`, **Then** the function returns an empty result set without errors.
4. **Given** a query matches only in the semantic tier (wiki pages), **When** a developer calls `search("obscure topic")`, **Then** results from the semantic tier are returned with appropriate relevance scores.
5. **Given** a developer specifies `{ tiers: [1, 3] }` in search options, **When** they call `search("query", { tiers: [1, 3] })`, **Then** only knowledge graph and semantic results are returned — data records are not queried.

---

### User Story 2 - Knowledge Graph Search with Relation Traversal (Priority: P1)

A developer needs to search the knowledge graph tier directly for verified atomic facts. They call `searchKG(query)` and get results by matching entity names and types, plus related entities discovered through graph traversal. For example, searching for "Acme Corp" returns the entity itself plus employees, projects, and other entities connected via relations within a bounded traversal depth.

**Why this priority**: The knowledge graph is the source of verified, curated facts. Direct access to KG search is essential for applications that need authoritative answers without the noise of unverified or contextual content from other tiers.

**Independent Test**: Can be fully tested by creating a small entity graph (e.g., "Alice" → works_at → "Acme Corp" → located_in → "San Francisco"), calling `searchKG("Acme Corp")`, and verifying the direct entity match plus traversed relations appear in results.

**Acceptance Scenarios**:

1. **Given** an entity named "Machine Learning" with type "concept" exists, **When** a developer calls `searchKG("Machine Learning")`, **Then** the entity is returned with its full metadata.
2. **Given** entity "Alice" has a relation "works_at" to entity "Acme Corp", **When** a developer calls `searchKG("Alice")`, **Then** the results include "Alice" as a direct match and "Acme Corp" as a related entity with the relation type.
3. **Given** no entity matches the query, **When** a developer calls `searchKG("nonexistent")`, **Then** an empty result set is returned.
4. **Given** entities form a deep chain (A → B → C → D → E), **When** a developer calls `searchKG("A")`, **Then** traversal returns related entities up to the configured maximum depth, not the entire chain if it exceeds that depth.

---

### User Story 3 - Semantic Search with Weighted FTS5 and Vector Similarity (Priority: P2)

A developer needs to discover relevant content through natural-language queries that go beyond exact keyword matching. They call `searchSemantic(query, options)` which combines FTS5 full-text ranking with vec0 vector similarity scores. The developer can tune the balance — heavier FTS5 weight for keyword-precise searches, heavier vector weight for conceptual/semantic discovery — via configurable weights. Results include a combined relevance score and can be filtered by a minimum score threshold.

**Why this priority**: Semantic search is the "discovery engine" that surfaces relevant wiki content and entity descriptions even when the user's query wording differs from stored text. It is the fallback tier but also the richest for exploratory queries.

**Independent Test**: Can be fully tested by inserting entities with embeddings and wiki-indexed content containing known text, calling `searchSemantic("related concept")` with different weight configurations, and verifying that results change ranking based on weight adjustments and that combined scores are deterministic.

**Acceptance Scenarios**:

1. **Given** entities with embeddings and FTS5-indexed content exist, **When** a developer calls `searchSemantic("artificial intelligence")`, **Then** results include both FTS5 keyword matches and vector similarity matches, each with individual and combined scores.
2. **Given** a developer specifies `{ ftsWeight: 0.8, vectorWeight: 0.2 }`, **When** they search for a term that has strong keyword matches but weak vector similarity, **Then** keyword-matched results rank higher than they would with equal weights.
3. **Given** a developer specifies `{ minScore: 0.5 }`, **When** results include entries scoring below 0.5, **Then** those low-scoring entries are excluded from the returned set.
4. **Given** no embeddings exist but FTS5 content does, **When** a developer calls `searchSemantic("query")`, **Then** results are returned based on FTS5 scores alone — the absence of embeddings does not cause errors.

---

### User Story 4 - Data Records Filtered Search (Priority: P2)

A developer needs to search structured data records by record type and optional filters. They call `searchData(query, recordType)` to find data records matching a text query within a specific record type (e.g., "health_metric", "activity"), using both the FTS5 index and structured field filters. This provides fast access to the structured metrics and stats stored in the data lake tier.

**Why this priority**: The data lake tier contains quantitative, structured information that complements the knowledge graph's qualitative facts. Direct access enables dashboards, trend analysis, and data-driven queries.

**Independent Test**: Can be fully tested by inserting data records of multiple types (health_metric, activity, grade), calling `searchData("weight", "health_metric")`, and verifying only health_metric records matching "weight" are returned.

**Acceptance Scenarios**:

1. **Given** data records of types "health_metric" and "activity" exist, **When** a developer calls `searchData("running", "activity")`, **Then** only activity records matching "running" are returned.
2. **Given** multiple health_metric records with varying dates, **When** a developer calls `searchData("blood pressure", "health_metric")`, **Then** matching records are returned ordered by relevance.
3. **Given** no records match the query for the specified type, **When** a developer calls `searchData("nonexistent", "health_metric")`, **Then** an empty result set is returned without errors.
4. **Given** records exist for type "health_metric", **When** a developer calls `searchData("weight")` without specifying a record type, **Then** all matching records across all types are returned.

---

### User Story 5 - Priority Resolution Rules Template for LLM Integration (Priority: P3)

A developer building an LLM-powered question-answering system on top of the knowledge base needs a machine-readable template that defines how to resolve conflicts between tiers. The template, stored at `templates/priority-rules.md`, can be injected into LLM system prompts so that the language model follows the same deterministic priority hierarchy (KG > Data Lake > Semantic) when synthesizing answers from multi-tier search results.

**Why this priority**: While the search module enforces priority ranking internally, LLM integrations often receive raw results and need explicit instructions on how to weigh conflicting information. This template ensures consistency between programmatic search and LLM-assisted answers.

**Independent Test**: Can be fully tested by loading the template file, verifying it contains structured rules for all three tiers with explicit precedence instructions, and confirming it can be interpolated into a prompt string.

**Acceptance Scenarios**:

1. **Given** the template file exists at `templates/priority-rules.md`, **When** a developer reads it, **Then** it contains explicit rules stating that Tier 1 (Knowledge Graph) facts override Tier 2 (Data Lake) data, and both override Tier 3 (Semantic) content.
2. **Given** the template is injected into an LLM system prompt, **When** the prompt includes conflicting information from multiple tiers, **Then** the rules instruct the LLM to prefer higher-tier information and flag the conflict.
3. **Given** a developer reads the template, **When** they review its contents, **Then** each tier's characteristics, strengths, and limitations are clearly described to guide the LLM's reasoning.

---

### Edge Cases

- What happens when the same entity appears in both FTS5 and vector results within the semantic tier? (Deduplication within a tier, not just across tiers.)
- How does the system handle a search query that is an empty string or contains only whitespace?
- What happens when the vec0 extension is not loaded but a semantic search is requested? (Graceful degradation to FTS5-only.)
- How does the system behave when the search_index FTS5 table contains stale entries that reference deleted entities?
- What happens when vector dimensions of a query do not match the stored embedding dimensions (384)?
- How does priority resolution work when a knowledge graph entity and a data record refer to different aspects of the same concept (e.g., entity "sleep" vs. data record tracking sleep hours)?
- What happens when `maxResults` is set to 0 or a negative number?
- How does the system handle FTS5 queries with special characters (quotes, asterisks, boolean operators)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a unified search module (`wiki-search.mjs`) that exports functions for querying all three data tiers — knowledge graph, data records, and semantic content — through a single import.
- **FR-002**: The `search(query, options)` function MUST query all three tiers by default, merge results, deduplicate entries that refer to the same underlying entity or concept, and return results ranked by tier priority (Tier 1 > Tier 2 > Tier 3).
- **FR-003**: The `search()` function MUST accept an `options` parameter supporting: `maxResults` (integer, default 20), `tiers` (array of tier numbers to query, default all), and `includeScores` (boolean, default false).
- **FR-004**: When `includeScores` is true, each result MUST include a `score` field and a `tier` field indicating which tier produced the result and its relevance score within that tier.
- **FR-005**: The `searchKG(query)` function MUST search the knowledge graph by matching entity names and types via exact and partial text matching, then traverse relations from matched entities to discover related entities up to a bounded depth.
- **FR-006**: The `searchKG(query)` function MUST return direct entity matches with higher rank than relation-traversed matches, and MUST include the relation type and path for traversed results.
- **FR-007**: The `searchData(query, recordType)` function MUST search the `data_records` table using the FTS5 search index, filtered by `record_type` when specified.
- **FR-008**: The `searchData()` function MUST return results that include the record type, recorded timestamp, and the data payload for each matching record.
- **FR-009**: The `searchSemantic(query, options)` function MUST combine FTS5 full-text search scores with vec0 vector similarity scores using configurable weights: `ftsWeight` (default 0.7) and `vectorWeight` (default 0.3).
- **FR-010**: The `searchSemantic()` function MUST accept a `minScore` option (default 0.0) that filters out results below the specified combined score threshold.
- **FR-011**: When vector embeddings are unavailable for a query (no embedding provided or vec0 not loaded), the semantic search MUST fall back to FTS5-only results without errors.
- **FR-012**: The unified `search()` function MUST deduplicate results across tiers using entity identifiers — when the same entity appears in multiple tiers, the highest-priority tier's result is kept and lower-tier duplicates are removed.
- **FR-013**: System MUST provide a priority resolution rules template at `templates/priority-rules.md` that describes the three-tier priority hierarchy in a format suitable for inclusion in LLM system prompts.
- **FR-014**: The search module MUST use the existing `db.mjs` abstraction layer for all database access — it MUST NOT import `better-sqlite3` directly or execute raw SQL outside of `db.mjs`.
- **FR-015**: All search functions MUST handle empty queries, whitespace-only queries, and queries containing FTS5 special characters gracefully — returning empty results or sanitized queries without throwing errors.
- **FR-016**: The search module MUST be implemented as a Node.js ES module with named exports for each public function.

### Key Entities

- **Search Result**: A unified result object returned by all search functions, containing: identifier, name/title, content snippet, source tier (1/2/3), source table, relevance score, and optional metadata.
- **Tier Priority Rule**: A precedence rule defining that Tier 1 (Knowledge Graph) results always override Tier 2 (Data Lake) and Tier 3 (Semantic) results when referring to the same entity or concept; Tier 2 overrides Tier 3.
- **Semantic Score**: A composite relevance metric calculated as the weighted combination of FTS5 rank and vector cosine distance, normalized to a 0–1 scale.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can search across all three knowledge tiers with a single function call and receive merged, deduplicated, priority-ranked results.
- **SC-002**: When the same entity appears in both the knowledge graph and a wiki page, the unified search returns exactly one result for that entity, sourced from the knowledge graph tier.
- **SC-003**: Searches return results within 200 milliseconds for a knowledge base containing 1,000+ entities, 5,000+ data records, and 500+ wiki page index entries.
- **SC-004**: The semantic search function produces deterministic combined scores — the same query against the same data always returns the same scores and ranking order.
- **SC-005**: A developer can adjust FTS5 vs. vector weight ratios and observe measurably different result rankings for the same query.
- **SC-006**: The priority resolution template can be loaded and injected into an LLM prompt, and the resulting prompt is under 2,000 tokens (suitable for system prompt inclusion without consuming excessive context).
- **SC-007**: All four exported search functions handle edge cases (empty queries, missing embeddings, special characters) without throwing unhandled errors.
- **SC-008**: A developer can selectively query a single tier via the tier-specific functions (`searchKG`, `searchData`, `searchSemantic`) without invoking the other tiers.

## Assumptions

- The existing `db.mjs` abstraction layer (spec 001) and its exported functions (`search()`, `findNearestVectors()`, `traverseGraph()`, `getEntity()`, `queryRecords()`) are stable and available for use by this module.
- The FTS5 `search_index` table already auto-indexes entities and data records via triggers defined in `schema.sql`. No new triggers are needed for those tables.
- Vector embeddings are pre-computed and stored via `upsertEmbedding()` before search time. The search module does not generate embeddings — it queries existing ones.
- The `wiki-search.mjs` module is a pure query-time module. It does not modify any data — all writes (entity creation, record insertion, embedding storage) happen through other modules.
- Wiki page content that should be searchable is already indexed in the `search_index` FTS5 table via the existing entity/data_record triggers, since wiki pages correspond to knowledge graph entities created during ingestion (spec 002).
- The `templates/` directory for the priority-rules template is at the project root (`templates/priority-rules.md`), consistent with the existing project structure.
- Consumers of the priority-rules template are responsible for generating query embeddings when they want vector similarity results. The search module accepts a pre-computed query vector, not raw text for embedding.
- The `sqlite-vec` extension may not be available in all environments. The module degrades gracefully to FTS5-only semantic search when vec0 is unavailable.
