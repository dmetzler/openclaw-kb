import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  updateEntity,
  deleteEntity,
  createDataSource,
  insertRecord,
  search,
  upsertEmbedding,
  deleteEmbedding,
  findNearestVectors,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';

function randomVector(dims = EMBEDDING_DIMENSIONS) {
  return Array.from({ length: dims }, () => Math.random());
}

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('Vector Search', () => {
  it('upsertEmbedding + findNearestVectors with k=5 returns results ordered by ascending distance', () => {
    const query = new Array(EMBEDDING_DIMENSIONS).fill(0);
    query[0] = 1;

    const entityA = createEntity({ name: 'Vector A', type: 'node' });
    const entityB = createEntity({ name: 'Vector B', type: 'node' });
    const entityC = createEntity({ name: 'Vector C', type: 'node' });

    const vectorA = new Array(EMBEDDING_DIMENSIONS).fill(0);
    vectorA[0] = 1;

    const vectorB = new Array(EMBEDDING_DIMENSIONS).fill(0);
    vectorB[0] = 0.75;
    vectorB[1] = 0.25;

    const vectorC = new Array(EMBEDDING_DIMENSIONS).fill(0);
    vectorC[1] = 1;

    upsertEmbedding(entityA.id, vectorA);
    upsertEmbedding(entityB.id, vectorB);
    upsertEmbedding(entityC.id, vectorC);

    const results = findNearestVectors(query, 5);

    expect(results).toHaveLength(3);
    expect(results.map((row) => row.entity_id)).toEqual([entityA.id, entityB.id, entityC.id]);
    expect(results[0].distance).toBeLessThanOrEqual(results[1].distance);
    expect(results[1].distance).toBeLessThanOrEqual(results[2].distance);
  });

  it('entity without embedding does not appear in vector results', () => {
    const withEmbedding = createEntity({ name: 'Embedded', type: 'node' });
    createEntity({ name: 'No Embedding', type: 'node' });

    const query = randomVector();
    upsertEmbedding(withEmbedding.id, query);

    const results = findNearestVectors(query, 5);

    expect(results).toHaveLength(1);
    expect(results[0].entity_id).toBe(withEmbedding.id);
  });

  it('update embedding via upsertEmbedding uses the second vector in search', () => {
    const target = createEntity({ name: 'Target', type: 'node' });
    const competitor = createEntity({ name: 'Competitor', type: 'node' });

    const firstVector = new Array(EMBEDDING_DIMENSIONS).fill(0);
    firstVector[0] = 1;

    const secondVector = new Array(EMBEDDING_DIMENSIONS).fill(0);
    secondVector[1] = 1;

    upsertEmbedding(target.id, firstVector);
    upsertEmbedding(target.id, secondVector);
    upsertEmbedding(competitor.id, firstVector);

    const results = findNearestVectors(secondVector, 5);

    expect(results[0].entity_id).toBe(target.id);
  });

  it('deleteEmbedding removes entity from vector results and returns true', () => {
    const entity = createEntity({ name: 'Delete Me', type: 'node' });
    const vector = randomVector();

    upsertEmbedding(entity.id, vector);

    expect(deleteEmbedding(entity.id)).toBe(true);
    expect(findNearestVectors(vector, 5)).toEqual([]);
  });

  it('deleteEmbedding for nonexistent returns false', () => {
    expect(deleteEmbedding(999999)).toBe(false);
  });

  it('rejects vector with wrong dimensions', () => {
    const entity = createEntity({ name: 'Wrong Dimensions', type: 'node' });

    expect(() => upsertEmbedding(entity.id, [1, 2, 3])).toThrow(
      `Vector must have ${EMBEDDING_DIMENSIONS} dimensions, got 3`,
    );
  });

  it('findNearestVectors with wrong query dimensions throws', () => {
    expect(() => findNearestVectors([1, 2, 3], 5)).toThrow(
      `Vector must have ${EMBEDDING_DIMENSIONS} dimensions, got 3`,
    );
  });

  it('upsertEmbedding for nonexistent entity throws', () => {
    expect(() => upsertEmbedding(999999, randomVector())).toThrow('Entity with id 999999 not found');
  });
});

describe('Full-Text Search', () => {
  it('searches for keyword in entity name', () => {
    const entity = createEntity({ name: 'Alice Johnson', type: 'person' });

    const results = search('Alice');

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_table: 'entities',
          source_id: entity.id,
          name: 'Alice Johnson',
        }),
      ]),
    );
  });

  it('finds inserted entity immediately without reindex', () => {
    const entity = createEntity({ name: 'Trigger Ready Entity', type: 'note' });

    const results = search('Trigger');

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source_table: 'entities', source_id: entity.id }),
      ]),
    );
  });

  it('updates search results after entity rename', () => {
    const entity = createEntity({ name: 'Legacy Search Term', type: 'note' });

    updateEntity(entity.id, { name: 'Modern Search Term' });

    expect(search('Legacy')).toEqual([]);
    expect(search('Modern')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_table: 'entities',
          source_id: entity.id,
          name: 'Modern Search Term',
        }),
      ]),
    );
  });

  it('removes deleted entities from search results', () => {
    const entity = createEntity({ name: 'Disposable Search Entry', type: 'note' });

    deleteEntity(entity.id);

    expect(search('Disposable')).toEqual([]);
  });

  it('returns multiple matches with rank field', () => {
    createEntity({ name: 'Shared Search Topic One', type: 'note' });
    createEntity({ name: 'Shared Search Topic Two', type: 'note' });

    const results = search('Shared');

    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0]).toMatchObject({ rank: expect.any(Number) });
  });

  it('filters by source_table', () => {
    createEntity({ name: 'Filtered Search Term', type: 'note' });
    const source = createDataSource({ name: 'search-filter-source', type: 'manual' });
    insertRecord('health_metric', {
      source_id: source.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'Filtered Search Metric',
      value: 72,
      unit: 'bpm',
    });

    const results = search('Filtered', { source_table: 'entities' });

    expect(results).not.toHaveLength(0);
    expect(results.every((result) => result.source_table === 'entities')).toBe(true);
  });

  it('searches health metrics', () => {
    const source = createDataSource({ name: 'health-search-source', type: 'manual' });
    const record = insertRecord('health_metric', {
      source_id: source.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'heart_rate',
      value: 60,
      unit: 'bpm',
    });

    const results = search('heart_rate');

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_table: 'data_records',
          source_id: record.id,
          name: 'health_metric',
        }),
      ]),
    );
  });

  it('searches activities', () => {
    const source = createDataSource({ name: 'activity-search-source', type: 'manual' });
    const record = insertRecord('activity', {
      source_id: source.id,
      recorded_at: '2026-04-14T10:00:00Z',
      activity_type: 'morning_run',
      duration_minutes: 30,
      distance_km: 4.5,
      calories: 280,
    });

    const results = search('morning_run');

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_table: 'data_records',
          source_id: record.id,
          name: 'activity',
        }),
      ]),
    );
  });

  it('searches grades', () => {
    const source = createDataSource({ name: 'grade-search-source', type: 'manual' });
    const record = insertRecord('grade', {
      source_id: source.id,
      recorded_at: '2026-04-14T10:00:00Z',
      student: 'Jamie Lee',
      subject: 'Mathematics',
      score: 98,
      max_score: 100,
      school_year: '2025-2026',
    });

    const results = search('Mathematics');

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_table: 'data_records',
          source_id: record.id,
          name: 'grade',
        }),
      ]),
    );
  });

  it('searches meals', () => {
    const source = createDataSource({ name: 'meal-search-source', type: 'manual' });
    const record = insertRecord('meal', {
      source_id: source.id,
      recorded_at: '2026-04-14T10:00:00Z',
      meal_type: 'breakfast',
      items: ['oats', 'berries'],
    });

    const results = search('breakfast');

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_table: 'data_records',
          source_id: record.id,
          name: 'meal',
        }),
      ]),
    );
  });

  it('throws for empty query', () => {
    expect(() => search('')).toThrow('Search query must be a non-empty string');
    expect(() => search('   ')).toThrow('Search query must be a non-empty string');
  });

  it('returns expected result fields', () => {
    createEntity({ name: 'Field Coverage Entity', type: 'note', metadata: { description: 'snippet test' } });

    const [result] = search('Field');

    expect(result).toMatchObject({
      source_table: 'entities',
      source_id: expect.any(Number),
      name: 'Field Coverage Entity',
      snippet: expect.any(String),
      rank: expect.any(Number),
    });
  });

  it('uses a default limit of 20', () => {
    for (let index = 1; index <= 25; index += 1) {
      createEntity({ name: `Default Limit Search ${index}`, type: 'note' });
    }

    const results = search('Default');

    expect(results).toHaveLength(20);
  });
});
