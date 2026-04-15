/**
 * Hybrid 3-Tier Search Module
 *
 * Queries all three knowledge tiers — knowledge graph entities (Tier 1),
 * structured data records (Tier 2), and semantic content via FTS5 + vec0
 * vector similarity (Tier 3) — and returns merged, deduplicated,
 * priority-ranked results.
 *
 * All database access flows through db.mjs. This module is stateless
 * and read-only.
 *
 * @module wiki-search
 */

import {
  search as dbSearch,
  findNearestVectors,
  findNearestChunks,
  traverseGraph,
  getEntity,
  getChunkWithEntity,
  queryRecords,
  EMBEDDING_DIMENSIONS,
} from './db.mjs';
import { embed } from './embedder.mjs';

// ---------------------------------------------------------------------------
// Internal helper functions
// ---------------------------------------------------------------------------

/**
 * Converts an FTS5 negative BM25 rank to a 0–1 relevance score using
 * hyperbolic saturation: relevance / (1 + relevance).
 *
 * FTS5 ranks are negative (more negative = better match). The formula
 * maps them to a stable 0–1 range without requiring batch context:
 *   rank -1  → 0.500
 *   rank -5  → 0.833
 *   rank -15 → 0.938
 *   rank -50 → 0.980
 *
 * @param {number} rank - FTS5 BM25 rank (typically negative).
 * @returns {number} Normalized score in [0, 1].
 */
function bm25ToScore(rank) {
  if (!Number.isFinite(rank)) return 0.001;
  if (rank < 0) {
    const relevance = -rank;
    return relevance / (1 + relevance);
  }
  return 1 / (1 + rank);
}

/**
 * Converts a vec0 cosine distance to a 0–1 similarity score.
 *
 * vec0 cosine distance ranges [0, 2] where 0 = identical vectors.
 * For text embeddings the practical range is [0, 1], so the conversion
 * is simply max(0, 1 - distance).
 *
 * @param {number} distance - Cosine distance from vec0 (0–2).
 * @returns {number} Similarity score in [0, 1].
 */
function vecDistanceToSimilarity(distance) {
  return Math.max(0, 1 - distance);
}

/**
 * Distance-decay scoring for knowledge graph traversal depth.
 *
 * Depth 0 (direct match) → 1.0, depth 1 (immediate neighbor) → 0.6,
 * depth 2+ (distant) → 0.3.
 *
 * @param {number} depth - Graph traversal depth (0-based).
 * @returns {number} Score in [0, 1].
 */
function depthToScore(depth) {
  if (depth === 0) return 1.0;
  if (depth === 1) return 0.6;
  return 0.3;
}

/**
 * Cross-tier deduplication. Results from higher-priority tiers win when
 * the same entity (identified by source_table:source_id) appears in
 * multiple tiers.
 *
 * Processes tiers in priority order: 1 (KG) → 2 (Data) → 3 (Semantic).
 * When a result's composite key already exists, the lower-priority tier's
 * result is discarded.
 *
 * @param {Map<number, SearchResult[]>} resultsByTier - Map of tier number to results.
 * @returns {SearchResult[]} Deduplicated results in tier-priority order.
 */
function deduplicateResults(resultsByTier) {
  const seen = new Map();
  const output = [];

  // Process tiers in priority order (1, 2, 3)
  for (const tier of [1, 2, 3]) {
    const results = resultsByTier.get(tier);
    if (!results) continue;

    for (const result of results) {
      const key = `${result.source_table}:${result.id}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        output.push(result);
      }
    }
  }

  return output;
}

/**
 * Validates and normalises search input. Returns the trimmed query string,
 * or null when the caller should return [].
 *
 * Also clamps maxResults (≤0 → 20), filters tier arrays to valid values
 * [1, 2, 3], and clamps weight values to [0, 1].
 *
 * @param {string} query - Raw query string.
 * @returns {string|null} Trimmed query or null if empty.
 */
function validateQuery(query) {
  if (!query || typeof query !== 'string') return null;
  const trimmed = query.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Clamps a number to the [0, 1] range.
 *
 * @param {number} value
 * @returns {number}
 */
function clamp01(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Normalises maxResults: returns the provided value if it's a positive
 * integer, otherwise defaults to 20.
 *
 * @param {number} [maxResults]
 * @returns {number}
 */
function normaliseMaxResults(maxResults) {
  if (typeof maxResults === 'number' && Number.isFinite(maxResults) && maxResults > 0) {
    return Math.floor(maxResults);
  }
  return 20;
}

/**
 * Filters a tiers array to only valid tier numbers (1, 2, 3).
 *
 * @param {number[]} [tiers]
 * @returns {number[]}
 */
function normaliseTiers(tiers) {
  if (!Array.isArray(tiers)) return [1, 2, 3];
  const valid = tiers.filter((t) => t === 1 || t === 2 || t === 3);
  return valid.length > 0 ? valid : [1, 2, 3];
}

// ---------------------------------------------------------------------------
// Tier-specific search functions
// ---------------------------------------------------------------------------

/**
 * Searches the knowledge graph (Tier 1) by entity name/metadata via FTS5,
 * then traverses outbound relations from each seed entity up to depth 2.
 *
 * Direct matches score 1.0, depth-1 neighbours score 0.6, depth-2+ score 0.3.
 * Results are deduplicated across seeds by entity id (smallest depth wins).
 *
 * @param {string} query - Search query for entity name/metadata matching.
 * @returns {SearchResult[]} Results with tier 1 and source_table 'entities'.
 *
 * @example
 * const results = searchKG('Acme Corp');
 * // [
 * //   { id: 10, name: 'Acme Corp', snippet: '...', tier: 1, score: 1.0,
 * //     source_table: 'entities', metadata: { entity_type: 'company', depth: 0, ... } },
 * //   { id: 5, name: 'Alice', snippet: '...', tier: 1, score: 0.6,
 * //     source_table: 'entities', metadata: { entity_type: 'person', depth: 1, ... } }
 * // ]
 */
export function searchKG(query) {
  const trimmed = validateQuery(query);
  if (!trimmed) return [];

  try {
    // Step 1: Find seed entities via FTS5 (filtered to entities table)
    const ftsResults = dbSearch(trimmed, { source_table: 'entities' });

    if (ftsResults.length === 0) return [];

    // Step 2: Traverse graph from each seed, collecting all reachable entities
    // Deduplicate across seeds by entity id — keep the smallest depth
    const entityMap = new Map();

    for (const seed of ftsResults) {
      try {
        const traversed = traverseGraph(seed.source_id, 2);
        for (const node of traversed) {
          const existing = entityMap.get(node.id);
          if (!existing || node.depth < existing.depth) {
            entityMap.set(node.id, node);
          }
        }
      } catch {
        // Entity may have been deleted between FTS index and lookup — skip
      }
    }

    // Step 3: Build SearchResult objects with full entity metadata
    const results = [];
    for (const node of entityMap.values()) {
      const entity = getEntity(node.id);
      if (!entity) continue; // Stale FTS entry — skip

      // Determine relation type for traversed results
      let relationType = null;
      if (node.depth > 0) {
        // The path contains comma-separated entity ids; the relation type
        // isn't directly available from traverseGraph, so we leave it
        // as the generic indicator that this was a traversal result.
        relationType = 'related';
      }

      results.push({
        id: node.id,
        name: entity.name,
        snippet: JSON.stringify(entity.metadata),
        tier: 1,
        source_table: 'entities',
        score: depthToScore(node.depth),
        metadata: {
          entity_type: entity.type,
          depth: node.depth,
          path: node.path,
          relation_type: relationType,
        },
      });
    }

    // Sort by score descending, then by id ascending for tie-breaking
    results.sort((a, b) => b.score - a.score || a.id - b.id);

    return results;
  } catch (error) {
    console.warn('searchKG error:', error?.message ?? error);
    return [];
  }
}

/**
 * Searches structured data records (Tier 2) via FTS5, optionally filtered
 * by record type. Results are scored using BM25 normalisation and enriched
 * with full record metadata.
 *
 * @param {string} query - Search query text.
 * @param {string} [recordType] - Filter to a specific record type (e.g. 'health_metric').
 * @returns {SearchResult[]} Results with tier 2 and source_table 'data_records'.
 *
 * @example
 * const results = searchData('blood pressure', 'health_metric');
 * // [{ id: 101, name: 'health_metric', tier: 2, score: 0.78,
 * //    source_table: 'data_records',
 * //    metadata: { record_type: 'health_metric', recorded_at: '...', data: {...} } }]
 */
export function searchData(query, recordType) {
  const trimmed = validateQuery(query);
  if (!trimmed) return [];

  try {
    // FTS5 search filtered to data_records
    const ftsResults = dbSearch(trimmed, { source_table: 'data_records' });

    // Filter by recordType if provided — the FTS5 index stores record_type
    // in the `name` column for data_records
    let filtered = ftsResults;
    if (recordType && typeof recordType === 'string') {
      filtered = ftsResults.filter((r) => r.name === recordType);
    }

    // Build SearchResult objects with full record metadata
    const results = [];
    for (const hit of filtered) {
      const score = bm25ToScore(hit.rank);

      // Look up the underlying data record for metadata
      let recordMeta = { record_type: hit.name, recorded_at: null, data: {} };
      try {
        const records = queryRecords(hit.name, { limit: 1000 });
        const match = records.find((r) => r.id === hit.source_id);
        if (match) {
          recordMeta = {
            record_type: match.record_type,
            recorded_at: match.recorded_at,
            data: match.data,
          };
        }
      } catch {
        // Proceed with minimal metadata if lookup fails
      }

      results.push({
        id: hit.source_id,
        name: hit.name,
        snippet: hit.snippet,
        tier: 2,
        source_table: 'data_records',
        score,
        metadata: recordMeta,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  } catch (error) {
    console.warn('searchData error:', error?.message ?? error);
    return [];
  }
}

/**
 * Combined FTS5 full-text and vec0 vector similarity search with
 * configurable weights (Tier 3).
 *
 * When `queryVector` is absent, uses FTS5 scores only (no error, no
 * degradation message). When vec0 operations fail, falls back to
 * FTS-only results gracefully.
 *
 * @param {string} query - Search query text.
 * @param {SemanticSearchOptions} [options={}] - Semantic search configuration.
 * @returns {Promise<SearchResult[]>} Results with tier 3, ordered by combined score.
 *
 * @example
 * // FTS5 + vector combined
 * const results = searchSemantic('artificial intelligence', {
 *   ftsWeight: 0.6,
 *   vectorWeight: 0.4,
 *   minScore: 0.3,
  *   queryVector: new Float32Array(768).fill(0.1)
 * });
 *
 * @example
 * // FTS5 only (no vector)
 * const results = searchSemantic('exact keyword match');
 */
export async function searchSemantic(query, options = {}) {
  const trimmed = validateQuery(query);
  if (!trimmed) return [];

  const maxResults = normaliseMaxResults(options.maxResults);
  const ftsWeight = clamp01(options.ftsWeight ?? 0.7);
  const vectorWeight = clamp01(options.vectorWeight ?? 0.3);
  const minScore = typeof options.minScore === 'number' && Number.isFinite(options.minScore) && options.minScore >= 0
    ? options.minScore
    : 0.0;
  const queryVector = options.queryVector;
  let autoEmbedding = null;
  if (!queryVector) {
    try {
      autoEmbedding = await embed(trimmed);
    } catch (error) {
      console.warn('searchSemantic embed error:', error?.message ?? error);
      autoEmbedding = null;
    }
  }

  try {
    // Step 1: FTS5 search — build a map keyed by source_table:source_id
    const combinedMap = new Map();
    let ftsResults = [];
    try {
      ftsResults = dbSearch(trimmed, { limit: maxResults });
    } catch {
      // db.search throws on empty query after sanitisation — return []
      ftsResults = [];
    }

    for (const hit of ftsResults) {
      const key = `${hit.source_table}:${hit.source_id}`;
      const ftsScore = bm25ToScore(hit.rank);
      combinedMap.set(key, {
        id: hit.source_id,
        name: hit.name,
        snippet: hit.snippet,
        source_table: hit.source_table,
        ftsScore,
        vecScore: null,
      });
    }

    // Step 2: Vector search (if queryVector provided and valid)
    let hasVec = false;
    if (queryVector && (Array.isArray(queryVector) || queryVector instanceof Float32Array)) {
      const arr = queryVector instanceof Float32Array ? queryVector : Array.from(queryVector);
      if (arr.length === EMBEDDING_DIMENSIONS) {
        try {
          const vecResults = findNearestVectors(queryVector, maxResults);
          hasVec = vecResults.length > 0;
          for (const vecHit of vecResults) {
            const vecScore = vecDistanceToSimilarity(vecHit.distance);
            // Vector results are always from entities table
            const key = `entities:${vecHit.entity_id}`;
            const existing = combinedMap.get(key);
            if (existing) {
              existing.vecScore = vecScore;
            } else {
              // Lookup entity for name/snippet
              const entity = getEntity(vecHit.entity_id);
              combinedMap.set(key, {
                id: vecHit.entity_id,
                name: entity?.name ?? `Entity ${vecHit.entity_id}`,
                type: entity?.type ?? null,
                snippet: entity ? JSON.stringify(entity.metadata) : '',
                source_table: 'entities',
                ftsScore: null,
                vecScore,
                chunk: null,
              });
            }
          }
        } catch (vecError) {
          // Graceful fallback: vec0 failure → FTS-only
          console.warn('searchSemantic vec0 error:', vecError?.message ?? vecError);
        }
      }
    } else if (autoEmbedding) {
      try {
        const vecResults = findNearestChunks(autoEmbedding, maxResults);
        hasVec = vecResults.length > 0;
        for (const vecHit of vecResults) {
          const vecScore = vecDistanceToSimilarity(vecHit.distance);
          const chunkWithEntity = getChunkWithEntity(vecHit.chunk_id);
          if (!chunkWithEntity) continue;
          const { chunk, entity } = chunkWithEntity;
          const key = `chunks:${chunk.id}`;
          const existing = combinedMap.get(key);
          if (existing) {
            existing.vecScore = vecScore;
          } else {
            combinedMap.set(key, {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              snippet: chunk.content.slice(0, 200),
              source_table: 'entities',
              ftsScore: null,
              vecScore,
              chunk: {
                id: chunk.id,
                text: chunk.content,
                section: chunk.metadata?.section ?? [],
                chunkIndex: chunk.chunk_index,
              },
            });
          }
        }
      } catch (vecError) {
        console.warn('searchSemantic vec_chunks error:', vecError?.message ?? vecError);
      }
    }

    // Step 3: Compute combined scores with weight redistribution
    // When no vector results exist, redistribute vector weight to FTS
    const effectiveFtsWeight = hasVec ? ftsWeight : 1.0;
    const effectiveVecWeight = hasVec ? vectorWeight : 0;

    const results = [];
    for (const entry of combinedMap.values()) {
      let combinedScore = 0;
      let method = 'fts_only';

      if (entry.ftsScore !== null && entry.vecScore !== null) {
        combinedScore = effectiveFtsWeight * entry.ftsScore + effectiveVecWeight * entry.vecScore;
        method = 'weighted';
      } else if (entry.ftsScore !== null) {
        combinedScore = effectiveFtsWeight * entry.ftsScore;
        method = 'fts_only';
      } else if (entry.vecScore !== null) {
        combinedScore = effectiveVecWeight * entry.vecScore;
        method = 'vec_only';
      }

      // Filter by minScore
      if (combinedScore < minScore) continue;

      const source = entry.vecScore !== null && entry.ftsScore !== null
        ? 'combined'
        : entry.vecScore !== null
          ? 'vec_chunks'
          : 'fts5';
      results.push({
        id: entry.id,
        name: entry.name,
        type: entry.type ?? null,
        snippet: entry.snippet,
        tier: 3,
        source,
        source_table: entry.source_table,
        score: combinedScore,
        chunk: entry.chunk ?? null,
        metadata: {
          fts_score: entry.ftsScore,
          vec_score: entry.vecScore,
          combined_method: method,
        },
      });
    }

    // Sort by combined score descending, truncate to maxResults
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  } catch (error) {
    console.warn('searchSemantic error:', error?.message ?? error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Unified search
// ---------------------------------------------------------------------------

/**
 * Unified cross-tier search. Queries all specified tiers, merges results
 * with deduplication, and ranks by tier priority (KG > Data > Semantic).
 *
 * Results are ordered by tier priority (ascending tier number), then by
 * score within each tier (descending). Duplicates across tiers are removed —
 * the highest-priority tier wins.
 *
 * Never throws. Returns [] for invalid inputs. Logs warnings via
 * console.warn for unexpected internal errors.
 *
 * @param {string} query - Search query text.
 * @param {SearchOptions} [options={}] - Search configuration.
 * @returns {Promise<SearchResult[]>} Deduplicated results, length ≤ maxResults.
 *
 * @example
 * const results = search('Node.js', {
 *   maxResults: 10,
 *   tiers: [1, 3],
 *   includeScores: true
 * });
 */
export async function search(query, options = {}) {
  const trimmed = validateQuery(query);
  if (!trimmed) return [];

  const maxResults = normaliseMaxResults(options.maxResults);
  const tiers = normaliseTiers(options.tiers);
  const includeScores = options.includeScores === true;

  const resultsByTier = new Map();

  // Query each requested tier sequentially (KG → Data → Semantic)
  if (tiers.includes(1)) {
    try {
      const kgResults = searchKG(trimmed);
      if (kgResults.length > 0) {
        resultsByTier.set(1, kgResults);
      }
    } catch (error) {
      console.warn('search: KG tier error:', error?.message ?? error);
    }
  }

  if (tiers.includes(2)) {
    try {
      const dataResults = searchData(trimmed);
      if (dataResults.length > 0) {
        resultsByTier.set(2, dataResults);
      }
    } catch (error) {
      console.warn('search: Data tier error:', error?.message ?? error);
    }
  }

  if (tiers.includes(3)) {
    try {
      const semanticResults = await searchSemantic(trimmed);
      if (semanticResults.length > 0) {
        resultsByTier.set(3, semanticResults);
      }
    } catch (error) {
      console.warn('search: Semantic tier error:', error?.message ?? error);
    }
  }

  // Merge and deduplicate across tiers
  let merged = deduplicateResults(resultsByTier);

  // Truncate to maxResults
  merged = merged.slice(0, maxResults);

  // Strip score/tier fields if includeScores is false
  if (!includeScores) {
    merged = merged.map(({ score, tier, ...rest }) => rest);
  }

  return merged;
}
