import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createDataSource,
  updateDataSource,
  insertRecord,
  queryRecords,
} from '../../src/db.mjs';

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('Generic Data Records', () => {
  it('insertRecord returns inserted record with id, record_type, data, recorded_at, created_at', () => {
    const src = createDataSource({ name: 'test-source', type: 'manual' });

    const record = insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });

    expect(record).toMatchObject({
      id: expect.any(Number),
      source_id: src.id,
      record_type: 'health_metric',
      data: {
        source_id: src.id,
        recorded_at: '2026-04-14T10:00:00Z',
        metric_type: 'weight',
        value: 80,
        unit: 'kg',
      },
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(record.created_at).toEqual(expect.any(String));
  });

  it('queryRecords filters by source_id', () => {
    const srcA = createDataSource({ name: 'source-a', type: 'manual' });
    const srcB = createDataSource({ name: 'source-b', type: 'manual' });

    insertRecord('health_metric', {
      source_id: srcA.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: srcB.id,
      recorded_at: '2026-04-14T11:00:00Z',
      metric_type: 'weight',
      value: 81,
      unit: 'kg',
    });

    const results = queryRecords('health_metric', { source_id: srcA.id });

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(srcA.id);
  });

  it('queryRecords filters by jsonFilters', () => {
    const src = createDataSource({ name: 'filter-source', type: 'manual' });

    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      metric_type: 'heart_rate',
      value: 72,
      unit: 'bpm',
    });

    const results = queryRecords('health_metric', {
      jsonFilters: { metric_type: 'weight' },
    });

    expect(results).toHaveLength(1);
    expect(results[0].data.metric_type).toBe('weight');
  });

  it('queryRecords filters by time range', () => {
    const src = createDataSource({ name: 'range-source', type: 'manual' });

    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T09:00:00Z',
      metric_type: 'weight',
      value: 79,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      metric_type: 'weight',
      value: 81,
      unit: 'kg',
    });

    const results = queryRecords('health_metric', {
      from: '2026-04-14T09:30:00Z',
      to: '2026-04-14T10:30:00Z',
    });

    expect(results).toHaveLength(1);
    expect(results[0].recorded_at).toBe('2026-04-14T10:00:00Z');
  });

  it('queryRecords returns results ordered by recorded_at DESC', () => {
    const src = createDataSource({ name: 'order-source', type: 'manual' });

    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T12:00:00Z',
      metric_type: 'weight',
      value: 82,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      metric_type: 'weight',
      value: 81,
      unit: 'kg',
    });

    const results = queryRecords('health_metric', {});

    expect(results.map((record) => record.recorded_at)).toEqual([
      '2026-04-14T12:00:00Z',
      '2026-04-14T11:00:00Z',
      '2026-04-14T10:00:00Z',
    ]);
  });

  it('queryRecords supports limit and offset pagination', () => {
    const src = createDataSource({ name: 'pagination-source', type: 'manual' });

    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      metric_type: 'weight',
      value: 81,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T12:00:00Z',
      metric_type: 'weight',
      value: 82,
      unit: 'kg',
    });

    const results = queryRecords('health_metric', { limit: 1, offset: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].recorded_at).toBe('2026-04-14T11:00:00Z');
  });

  it('records from deactivated source remain accessible', () => {
    const src = createDataSource({ name: 'inactive-source', type: 'manual' });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    updateDataSource(src.id, { is_active: 0 });

    const results = queryRecords('health_metric', { source_id: src.id });

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(src.id);
  });

  it('works with different record types', () => {
    const src = createDataSource({ name: 'multi-type-source', type: 'manual' });

    const healthMetric = insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });

    const activity = insertRecord('activity', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      activity_type: 'run',
      duration_minutes: 45,
      intensity: 'high',
    });

    const grade = insertRecord('grade', {
      source_id: src.id,
      recorded_at: '2026-04-14T12:00:00Z',
      subject: 'math',
      score: 95,
      scale: 'percent',
    });

    const meal = insertRecord('meal', {
      source_id: src.id,
      recorded_at: '2026-04-14T13:00:00Z',
      meal_type: 'breakfast',
      items: ['oats', 'banana'],
    });

    const healthResults = queryRecords('health_metric', { source_id: src.id });
    const activityResults = queryRecords('activity', { source_id: src.id });
    const gradeResults = queryRecords('grade', { source_id: src.id });
    const mealResults = queryRecords('meal', { source_id: src.id });

    expect(healthResults).toHaveLength(1);
    expect(healthResults[0].record_type).toBe('health_metric');

    expect(activityResults).toHaveLength(1);
    expect(activityResults[0].record_type).toBe('activity');

    expect(gradeResults).toHaveLength(1);
    expect(gradeResults[0].record_type).toBe('grade');

    expect(mealResults).toHaveLength(1);
    expect(mealResults[0].record_type).toBe('meal');
  });
});
