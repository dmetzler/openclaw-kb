import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  getEntity,
  createDataSource,
  insertRecord,
  queryRecords,
  upsertEmbedding,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';
import { search, searchKG, searchData, searchSemantic } from '../../src/wiki-search.mjs';

function seedKGEntity(name, type, metadata = {}) {
  return createEntity({ name, type, metadata });
}

let dataSource = null;
let dataSourceCounter = 0;

function seedDataRecord(recordType, data, recordedAt) {
  if (!dataSource) {
    dataSourceCounter += 1;
    dataSource = createDataSource({ name: `test-source-${dataSourceCounter}`, type: 'manual' });
  }

  return insertRecord(recordType, {
    ...data,
    source_id: dataSource.id,
    recorded_at: recordedAt ?? '2026-04-14T10:00:00Z',
  });
}

function seedEmbedding(entityId, vector) {
  upsertEmbedding(entityId, vector);
}

function randomVector(dims = EMBEDDING_DIMENSIONS) {
  return Array.from({ length: dims }, () => Math.random());
}

function unitVector(index) {
  const vec = new Array(EMBEDDING_DIMENSIONS).fill(0);
  vec[index] = 1;
  return vec;
}

beforeEach(() => {
  initDatabase(':memory:');
  dataSource = null;
});

afterEach(() => {
  closeDatabase();
});

describe('bm25ToScore', () => {
  it('maps negative ranks from FTS results into bounded scores', async () => {
    seedKGEntity('Hybrid Search Topic', 'concept', { description: 'fts rank test' });

    const results = await searchSemantic('Hybrid');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].score).toBeLessThanOrEqual(1);
  });

  it('handles non-finite ranks without crashing on edge queries', async () => {
    await expect(searchSemantic('""')).resolves.toEqual([]);
  });
});

describe('vecDistanceToSimilarity', () => {
  it('converts distance 0 to similarity 1.0', async () => {
    const entity = seedKGEntity('Vector Zero', 'concept');
    const vector = unitVector(0);
    seedEmbedding(entity.id, vector);

    const [result] = await searchSemantic('vector', {
      queryVector: vector,
      ftsWeight: 0,
      vectorWeight: 1,
    });

    expect(result.metadata.vec_score).toBeCloseTo(1.0, 5);
  });

  it('converts distance 0.5 to similarity 0.5', async () => {
    const entity = seedKGEntity('Vector Half', 'concept');
    const queryVector = unitVector(0);
    const entityVector = new Array(EMBEDDING_DIMENSIONS).fill(0);
    entityVector[0] = 0.5;
    entityVector[1] = Math.sqrt(3) / 2;
    seedEmbedding(entity.id, entityVector);

    const [result] = await searchSemantic('vector', {
      queryVector,
      ftsWeight: 0,
      vectorWeight: 1,
    });

    expect(result.metadata.vec_score).toBeCloseTo(0.5, 1);
  });

  it('converts distance 1.0 to similarity 0.0', async () => {
    const entity = seedKGEntity('Vector Orthogonal', 'concept');
    const queryVector = unitVector(0);
    const entityVector = unitVector(1);
    seedEmbedding(entity.id, entityVector);

    const [result] = await searchSemantic('vector', {
      queryVector,
      ftsWeight: 0,
      vectorWeight: 1,
    });

    expect(result.metadata.vec_score).toBeLessThanOrEqual(0.01);
  });
});

describe('depthToScore', () => {
  it('maps traversal depth to expected scores', () => {
    const entityA = seedKGEntity('Alpha', 'concept');
    const entityB = seedKGEntity('Beta', 'concept');
    const entityC = seedKGEntity('Gamma', 'concept');

    createRelation({ source_id: entityA.id, target_id: entityB.id, type: 'relates_to' });
    createRelation({ source_id: entityB.id, target_id: entityC.id, type: 'relates_to' });

    const results = searchKG('Alpha');
    const byName = Object.fromEntries(results.map((result) => [result.name, result]));

    expect(byName.Alpha.score).toBeCloseTo(1.0, 5);
    expect(byName.Beta.score).toBeCloseTo(0.6, 5);
    expect(byName.Gamma.score).toBeCloseTo(0.3, 5);
  });
});

describe('deduplicateResults', () => {
  it('keeps KG results when entities appear in semantic tier', async () => {
    const entity = seedKGEntity('Sleep', 'topic');
    seedEmbedding(entity.id, randomVector());

    const results = await search('Sleep', { includeScores: true });

    expect(results.filter((result) => result.name === 'Sleep')).toHaveLength(1);
    expect(results[0].tier).toBe(1);
  });

  it('returns data records alongside entities with same name', async () => {
    seedKGEntity('Sleep', 'topic');
    seedDataRecord('sleep', { summary: 'sleep tracking' }, '2026-04-14T12:00:00Z');

    const results = await search('sleep', { includeScores: true });

    const sourceTables = results.map((result) => result.source_table);
    expect(sourceTables).toEqual(expect.arrayContaining(['entities', 'data_records']));
  });
});

describe('User Story 1: Unified Search', () => {
  it('returns results from each tier and orders KG first', async () => {
    seedKGEntity('Node.js', 'technology');
    seedDataRecord('activity', { activity_type: 'Node workshop' }, '2026-04-14T10:00:00Z');

    const kgResults = searchKG('Node');
    const dataResults = searchData('Node');
    const semanticResults = await searchSemantic('Node');
    const results = await search('Node', { includeScores: true });

    expect(kgResults.length).toBeGreaterThan(0);
    expect(dataResults.length).toBeGreaterThan(0);
    expect(semanticResults.length).toBeGreaterThan(0);
    expect(results[0].tier).toBe(1);
  });

  it('deduplicates duplicate entities across tiers', async () => {
    seedKGEntity('Python', 'technology');

    const results = await search('Python', { includeScores: true });

    expect(results.filter((result) => result.name === 'Python')).toHaveLength(1);
  });

  it('returns [] when database is empty', async () => {
    await expect(search('anything')).resolves.toEqual([]);
  });

  it('returns semantic-only results when tiers filter to semantic', async () => {
    seedKGEntity('Semantic Only', 'note');

    const results = await search('Semantic', { tiers: [3], includeScores: true });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.tier === 3)).toBe(true);
  });

  it('filters tiers and excludes data records when tiers are [1, 3]', async () => {
    seedKGEntity('Tier Filtering', 'note');
    seedDataRecord('health_metric', { metric_type: 'Unrelated Metric', value: 1 }, '2026-04-14T10:00:00Z');

    const results = await search('Tier', { tiers: [1, 3], includeScores: true });

    expect(results.some((result) => result.source_table === 'data_records')).toBe(false);
  });

  it('includeScores toggles score/tier fields', async () => {
    seedKGEntity('Include Scores', 'note');

    const withScores = await search('Include', { includeScores: true });
    const withoutScores = await search('Include', { includeScores: false });

    expect(withScores[0]).toHaveProperty('score');
    expect(withScores[0]).toHaveProperty('tier');
    expect(withoutScores[0]).not.toHaveProperty('score');
    expect(withoutScores[0]).not.toHaveProperty('tier');
  });

  it('respects maxResults', async () => {
    for (let index = 1; index <= 35; index += 1) {
      seedKGEntity(`Max Results ${index}`, 'note');
    }

    const results = await search('Max', { maxResults: 5 });

    expect(results.length).toBeLessThanOrEqual(5);
  });
});

describe('User Story 2: Knowledge Graph Search', () => {
  it('returns direct match with score 1.0 and depth 0', () => {
    seedKGEntity('Machine Learning', 'concept');

    const [result] = searchKG('Machine Learning');

    expect(result.score).toBeCloseTo(1.0, 5);
    expect(result.metadata.depth).toBe(0);
  });

  it('traverses outbound relations and scores neighbors', () => {
    const alice = seedKGEntity('Alice', 'person');
    const acme = seedKGEntity('Acme Corp', 'company');
    createRelation({ source_id: alice.id, target_id: acme.id, type: 'works_at' });

    const results = searchKG('Alice');
    const names = results.map((result) => result.name);

    expect(names).toEqual(expect.arrayContaining(['Alice', 'Acme Corp']));
    const acmeResult = results.find((result) => result.name === 'Acme Corp');
    expect(acmeResult.score).toBeCloseTo(0.6, 5);
  });

  it('returns [] when no entities match', () => {
    expect(searchKG('nonexistent')).toEqual([]);
  });

  it('limits traversal depth to 2 hops', () => {
    const entityA = seedKGEntity('A', 'node');
    const entityB = seedKGEntity('B', 'node');
    const entityC = seedKGEntity('C', 'node');
    const entityD = seedKGEntity('D', 'node');
    const entityE = seedKGEntity('E', 'node');

    createRelation({ source_id: entityA.id, target_id: entityB.id, type: 'relates_to' });
    createRelation({ source_id: entityB.id, target_id: entityC.id, type: 'relates_to' });
    createRelation({ source_id: entityC.id, target_id: entityD.id, type: 'relates_to' });
    createRelation({ source_id: entityD.id, target_id: entityE.id, type: 'relates_to' });

    const results = searchKG('A');
    const names = results.map((result) => result.name);

    expect(names).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    expect(names).not.toEqual(expect.arrayContaining(['D', 'E']));
  });

  it('includes expected metadata shape', () => {
    seedKGEntity('Metadata Test', 'concept');

    const [result] = searchKG('Metadata');

    expect(result.metadata).toMatchObject({
      entity_type: expect.any(String),
      depth: expect.any(Number),
      path: expect.any(String),
    });
    expect(result.metadata).toHaveProperty('relation_type');
  });
});

describe('User Story 3: Semantic Search', () => {
  it('combines FTS and vector scores into weighted results', async () => {
    const entity = seedKGEntity('Artificial Intelligence', 'concept');
    const queryVector = unitVector(0);
    const entityVector = unitVector(0);
    seedEmbedding(entity.id, entityVector);

    const [result] = await searchSemantic('Artificial Intelligence', {
      queryVector,
      ftsWeight: 0.6,
      vectorWeight: 0.4,
    });

    expect(result.metadata.fts_score).toBeGreaterThan(0);
    expect(result.metadata.vec_score).toBeGreaterThan(0);
    expect(result.metadata.combined_method).toBe('weighted');
  });

  it('adjusts ranking when weights shift between FTS and vector', async () => {
    const highFts = seedKGEntity('Alpha Alpha Alpha', 'concept');
    const highVec = seedKGEntity('Alpha', 'concept');
    const queryVector = unitVector(0);
    const farVector = unitVector(1);
    seedEmbedding(highFts.id, farVector);
    seedEmbedding(highVec.id, queryVector);

    const ftsHeavy = await searchSemantic('Alpha', {
      queryVector,
      ftsWeight: 1,
      vectorWeight: 0,
    });
    const vecHeavy = await searchSemantic('Alpha', {
      queryVector,
      ftsWeight: 0,
      vectorWeight: 1,
    });

    expect(ftsHeavy[0].id).toBe(highFts.id);
    expect(vecHeavy[0].id).toBe(highVec.id);
  });

  it('filters by minScore', async () => {
    seedKGEntity('Filtering Score', 'note');

    const results = await searchSemantic('Filtering', { minScore: 1.1 });

    expect(results).toEqual([]);
  });

  it('falls back to FTS-only when queryVector is missing', async () => {
    seedKGEntity('Fts Only', 'note');

    const [result] = await searchSemantic('Fts');

    expect(result.metadata.combined_method).toBe('fts_only');
  });

  it('returns deterministic scores for repeated queries', async () => {
    seedKGEntity('Deterministic', 'note');

    const first = await searchSemantic('Deterministic');
    const second = await searchSemantic('Deterministic');

    expect(second).toEqual(first);
  });

  it('falls back to FTS-only when vector dimensions are wrong', async () => {
    seedKGEntity('Wrong Vector', 'note');

    const results = await searchSemantic('Wrong', { queryVector: [1, 2, 3] });

    expect(results[0].metadata.combined_method).toBe('fts_only');
  });
});

describe('User Story 4: Data Records Search', () => {
  it('filters by record type', () => {
    seedDataRecord('health_metric', { metric_type: 'heart_rate', value: 72 }, '2026-04-14T10:00:00Z');
    seedDataRecord('activity', { activity_type: 'running' }, '2026-04-14T11:00:00Z');

    const results = searchData('running', 'activity');

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.metadata.record_type === 'activity')).toBe(true);
  });

  it('orders results by descending score', () => {
    seedDataRecord('health_metric', { metric_type: 'weight', value: 80 }, '2026-04-14T10:00:00Z');
    seedDataRecord('health_metric', { metric_type: 'weight weight', value: 82 }, '2026-04-14T11:00:00Z');

    const results = searchData('weight', 'health_metric');

    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it('returns [] when no records match', () => {
    expect(searchData('nonexistent', 'health_metric')).toEqual([]);
  });

  it('returns matching records across all types when recordType omitted', () => {
    seedDataRecord('health_metric', { metric_type: 'weight', value: 80 }, '2026-04-14T10:00:00Z');
    seedDataRecord('activity', { activity_type: 'weight lifting' }, '2026-04-14T11:00:00Z');

    const results = searchData('weight');

    const recordTypes = new Set(results.map((result) => result.metadata.record_type));
    expect(recordTypes).toEqual(new Set(['health_metric', 'activity']));
  });

  it('includes record metadata shape', () => {
    seedDataRecord('health_metric', { metric_type: 'weight', value: 80 }, '2026-04-14T10:00:00Z');

    const [result] = searchData('weight', 'health_metric');

    expect(result.metadata).toEqual(
      expect.objectContaining({
        record_type: 'health_metric',
        recorded_at: expect.any(String),
        data: expect.any(Object),
      }),
    );
  });
});

describe('User Story 5: Priority Rules Template', () => {
  it('loads the priority rules template and includes tier hierarchy', () => {
    const template = readFileSync('templates/priority-rules.md', 'utf-8');

    expect(template).toContain('Tier 1 — Knowledge Graph');
    expect(template).toContain('Tier 2 — Data Lake');
    expect(template).toContain('Tier 3 — Semantic Index');
  });

  it('keeps template character count under 8000', () => {
    const template = readFileSync('templates/priority-rules.md', 'utf-8');

    expect(template.length).toBeLessThan(8000);
  });

  it('can be concatenated into a prompt with search results', async () => {
    const template = readFileSync('templates/priority-rules.md', 'utf-8');
    seedKGEntity('Prompt Test', 'note');
    const results = await search('Prompt', { includeScores: true });

    const prompt = `${template}\n\nSearch results:\n${JSON.stringify(results, null, 2)}`;

    expect(prompt).toContain('Search results:');
    expect(prompt).toContain('Prompt Test');
  });
});

describe('Edge Cases', () => {
  it('returns [] for empty or whitespace queries', async () => {
    await expect(search('')).resolves.toEqual([]);
    await expect(search('   ')).resolves.toEqual([]);
    expect(searchKG('')).toEqual([]);
    expect(searchData('   ')).toEqual([]);
    await expect(searchSemantic('')).resolves.toEqual([]);
  });

  it('handles FTS5 special characters without throwing', async () => {
    seedKGEntity('C++ Guide', 'note');

    expect(() => search('C++ "hello world" OR *wildcard*')).not.toThrow();
    await expect(searchSemantic('C++ "hello world" OR *wildcard*')).resolves.toBeDefined();
  });

  it('defaults invalid maxResults gracefully', async () => {
    for (let index = 1; index <= 25; index += 1) {
      seedKGEntity(`Default Limit ${index}`, 'note');
    }

    const results = await search('Default', { maxResults: -5 });

    expect(results).toHaveLength(20);
  });

  it('ignores invalid tier numbers', async () => {
    seedKGEntity('Tier Clamp', 'note');

    const results = await search('Tier', { tiers: [5, 99], includeScores: true });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tier).toBe(1);
  });

  it('falls back to FTS-only on wrong vector dimensions', async () => {
    seedKGEntity('Vector Fallback', 'note');

    const results = await searchSemantic('Vector', { queryVector: [1, 2, 3] });

    expect(results[0].metadata.combined_method).toBe('fts_only');
  });

  it('deduplicates within-tier traversal results', () => {
    const seedOne = seedKGEntity('Seed One', 'note');
    const seedTwo = seedKGEntity('Seed Two', 'note');
    const shared = seedKGEntity('Shared Target', 'note');
    createRelation({ source_id: seedOne.id, target_id: shared.id, type: 'relates_to' });
    createRelation({ source_id: seedTwo.id, target_id: shared.id, type: 'relates_to' });

    const results = searchKG('Seed');
    const sharedResults = results.filter((result) => result.name === 'Shared Target');

    expect(sharedResults).toHaveLength(1);
  });
});

describe('Performance', () => {
  it('searches across large datasets under 200ms', async () => {
    for (let index = 1; index <= 1000; index += 1) {
      seedKGEntity(`Perf Entity ${index}`, 'note');
    }

    for (let index = 1; index <= 5000; index += 1) {
      seedDataRecord('health_metric', { metric_type: `metric ${index}`, value: index }, '2026-04-14T10:00:00Z');
    }

    for (let index = 1; index <= 500; index += 1) {
      const entity = seedKGEntity(`Vector Entity ${index}`, 'note');
      seedEmbedding(entity.id, randomVector());
    }

    const start = performance.now();
    const results = await search('Perf', { includeScores: true });
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });

  it('searchData runs under 200ms with large record counts', () => {
    for (let index = 1; index <= 5000; index += 1) {
      seedDataRecord('activity', { activity_type: `running ${index}` }, '2026-04-14T10:00:00Z');
    }

    const start = performance.now();
    const results = searchData('running', 'activity');
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });
});

describe('Polish', () => {
  it('executes quickstart.md examples without errors', async () => {
    seedKGEntity('Node.js', 'technology');
    seedDataRecord('health_metric', { metric_type: 'blood pressure', value: 120 }, '2026-04-14T08:30:00Z');

    await expect(search('Node.js')).resolves.toBeDefined();
    await expect(search('Node.js', { maxResults: 10, tiers: [1, 3], includeScores: true })).resolves.toBeDefined();
    expect(() => searchKG('Node.js')).not.toThrow();
    expect(() => searchData('blood pressure', 'health_metric')).not.toThrow();
    await expect(searchSemantic('artificial intelligence')).resolves.toBeDefined();
  });

  it('documents exports with @param/@returns/@example blocks', () => {
    const content = readFileSync('src/wiki-search.mjs', 'utf-8');

    expect(content).toContain('@param');
    expect(content).toContain('@returns');
    expect(content).toContain('@example');
  });
});
