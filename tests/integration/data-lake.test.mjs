import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createDataSource,
  updateDataSource,
  insertHealthMetric,
  queryHealthMetrics,
  insertActivity,
  queryActivities,
  insertGrade,
  queryGrades,
  insertMeal,
  queryMeals,
} from '../../src/db.mjs';

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('Health Metrics', () => {
  it('insertHealthMetric returns inserted record with id and created_at', () => {
    const src = createDataSource({ name: 'health-insert-source', type: 'manual' });

    const record = insertHealthMetric({
      source_id: src.id,
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
      recorded_at: '2026-04-14T10:00:00Z',
    });

    expect(record).toMatchObject({
      id: expect.any(Number),
      source_id: src.id,
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
      metadata: {},
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(record.created_at).toEqual(expect.any(String));
  });

  it('queryHealthMetrics filters by source_id', () => {
    const srcA = createDataSource({ name: 'health-source-a', type: 'manual' });
    const srcB = createDataSource({ name: 'health-source-b', type: 'manual' });

    insertHealthMetric({ source_id: srcA.id, metric_type: 'weight', value: 80, unit: 'kg', recorded_at: '2026-04-14T10:00:00Z' });
    insertHealthMetric({ source_id: srcB.id, metric_type: 'weight', value: 81, unit: 'kg', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryHealthMetrics({ source_id: srcA.id });

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(srcA.id);
  });

  it('queryHealthMetrics filters by metric_type', () => {
    const src = createDataSource({ name: 'health-type-source', type: 'manual' });

    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 80, unit: 'kg', recorded_at: '2026-04-14T10:00:00Z' });
    insertHealthMetric({ source_id: src.id, metric_type: 'heart_rate', value: 60, unit: 'bpm', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryHealthMetrics({ metric_type: 'weight' });

    expect(results).toHaveLength(1);
    expect(results[0].metric_type).toBe('weight');
  });

  it('queryHealthMetrics filters by time range', () => {
    const src = createDataSource({ name: 'health-range-source', type: 'manual' });

    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 79, unit: 'kg', recorded_at: '2026-04-14T09:00:00Z' });
    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 80, unit: 'kg', recorded_at: '2026-04-14T10:00:00Z' });
    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 81, unit: 'kg', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryHealthMetrics({
      from: '2026-04-14T09:30:00Z',
      to: '2026-04-14T10:30:00Z',
    });

    expect(results).toHaveLength(1);
    expect(results[0].recorded_at).toBe('2026-04-14T10:00:00Z');
  });

  it('queryHealthMetrics returns results ordered by recorded_at ascending', () => {
    const src = createDataSource({ name: 'health-order-source', type: 'manual' });

    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 82, unit: 'kg', recorded_at: '2026-04-14T12:00:00Z' });
    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 80, unit: 'kg', recorded_at: '2026-04-14T10:00:00Z' });
    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 81, unit: 'kg', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryHealthMetrics({});

    expect(results.map((record) => record.recorded_at)).toEqual([
      '2026-04-14T10:00:00Z',
      '2026-04-14T11:00:00Z',
      '2026-04-14T12:00:00Z',
    ]);
  });

  it('queryHealthMetrics supports limit and offset pagination', () => {
    const src = createDataSource({ name: 'health-pagination-source', type: 'manual' });

    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 80, unit: 'kg', recorded_at: '2026-04-14T10:00:00Z' });
    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 81, unit: 'kg', recorded_at: '2026-04-14T11:00:00Z' });
    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 82, unit: 'kg', recorded_at: '2026-04-14T12:00:00Z' });

    const results = queryHealthMetrics({ limit: 1, offset: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(81);
  });

  it('records from deactivated source remain accessible', () => {
    const src = createDataSource({ name: 'health-inactive-source', type: 'manual' });
    insertHealthMetric({ source_id: src.id, metric_type: 'weight', value: 80, unit: 'kg', recorded_at: '2026-04-14T10:00:00Z' });
    updateDataSource(src.id, { is_active: 0 });

    const results = queryHealthMetrics({ source_id: src.id });

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(src.id);
  });
});

describe('Activities', () => {
  it('insertActivity returns inserted record with id and created_at', () => {
    const src = createDataSource({ name: 'activity-insert-source', type: 'manual' });

    const record = insertActivity({
      source_id: src.id,
      activity_type: 'run',
      duration_minutes: 45,
      intensity: 'high',
      recorded_at: '2026-04-14T10:00:00Z',
    });

    expect(record).toMatchObject({
      id: expect.any(Number),
      source_id: src.id,
      activity_type: 'run',
      duration_minutes: 45,
      intensity: 'high',
      metadata: {},
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(record.created_at).toEqual(expect.any(String));
  });

  it('queryActivities filters by source_id', () => {
    const srcA = createDataSource({ name: 'activity-source-a', type: 'manual' });
    const srcB = createDataSource({ name: 'activity-source-b', type: 'manual' });

    insertActivity({ source_id: srcA.id, activity_type: 'walk', duration_minutes: 30, intensity: 'low', recorded_at: '2026-04-14T10:00:00Z' });
    insertActivity({ source_id: srcB.id, activity_type: 'run', duration_minutes: 45, intensity: 'high', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryActivities({ source_id: srcA.id });

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(srcA.id);
  });

  it('queryActivities filters by activity_type', () => {
    const src = createDataSource({ name: 'activity-type-source', type: 'manual' });

    insertActivity({ source_id: src.id, activity_type: 'walk', duration_minutes: 30, intensity: 'low', recorded_at: '2026-04-14T10:00:00Z' });
    insertActivity({ source_id: src.id, activity_type: 'run', duration_minutes: 45, intensity: 'high', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryActivities({ activity_type: 'run' });

    expect(results).toHaveLength(1);
    expect(results[0].activity_type).toBe('run');
  });

  it('queryActivities filters by time range', () => {
    const src = createDataSource({ name: 'activity-range-source', type: 'manual' });

    insertActivity({ source_id: src.id, activity_type: 'walk', duration_minutes: 20, intensity: 'low', recorded_at: '2026-04-14T09:00:00Z' });
    insertActivity({ source_id: src.id, activity_type: 'run', duration_minutes: 40, intensity: 'high', recorded_at: '2026-04-14T10:00:00Z' });
    insertActivity({ source_id: src.id, activity_type: 'bike', duration_minutes: 60, intensity: 'medium', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryActivities({
      from: '2026-04-14T09:30:00Z',
      to: '2026-04-14T10:30:00Z',
    });

    expect(results).toHaveLength(1);
    expect(results[0].activity_type).toBe('run');
  });

  it('queryActivities supports limit and offset pagination', () => {
    const src = createDataSource({ name: 'activity-pagination-source', type: 'manual' });

    insertActivity({ source_id: src.id, activity_type: 'walk', duration_minutes: 20, intensity: 'low', recorded_at: '2026-04-14T10:00:00Z' });
    insertActivity({ source_id: src.id, activity_type: 'run', duration_minutes: 40, intensity: 'high', recorded_at: '2026-04-14T11:00:00Z' });
    insertActivity({ source_id: src.id, activity_type: 'bike', duration_minutes: 60, intensity: 'medium', recorded_at: '2026-04-14T12:00:00Z' });

    const results = queryActivities({ limit: 1, offset: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].activity_type).toBe('run');
  });
});

describe('Grades', () => {
  it('insertGrade returns inserted record with id and created_at', () => {
    const src = createDataSource({ name: 'grade-insert-source', type: 'manual' });

    const record = insertGrade({
      source_id: src.id,
      subject: 'math',
      score: 95,
      scale: 'percent',
      recorded_at: '2026-04-14T10:00:00Z',
    });

    expect(record).toMatchObject({
      id: expect.any(Number),
      source_id: src.id,
      subject: 'math',
      score: 95,
      scale: 'percent',
      metadata: {},
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(record.created_at).toEqual(expect.any(String));
  });

  it('queryGrades filters by source_id', () => {
    const srcA = createDataSource({ name: 'grade-source-a', type: 'manual' });
    const srcB = createDataSource({ name: 'grade-source-b', type: 'manual' });

    insertGrade({ source_id: srcA.id, subject: 'math', score: 95, scale: 'percent', recorded_at: '2026-04-14T10:00:00Z' });
    insertGrade({ source_id: srcB.id, subject: 'science', score: 88, scale: 'percent', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryGrades({ source_id: srcA.id });

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(srcA.id);
  });

  it('queryGrades filters by subject', () => {
    const src = createDataSource({ name: 'grade-subject-source', type: 'manual' });

    insertGrade({ source_id: src.id, subject: 'math', score: 95, scale: 'percent', recorded_at: '2026-04-14T10:00:00Z' });
    insertGrade({ source_id: src.id, subject: 'science', score: 88, scale: 'percent', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryGrades({ subject: 'math' });

    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('math');
  });

  it('queryGrades filters by time range', () => {
    const src = createDataSource({ name: 'grade-range-source', type: 'manual' });

    insertGrade({ source_id: src.id, subject: 'math', score: 80, scale: 'percent', recorded_at: '2026-04-14T09:00:00Z' });
    insertGrade({ source_id: src.id, subject: 'science', score: 90, scale: 'percent', recorded_at: '2026-04-14T10:00:00Z' });
    insertGrade({ source_id: src.id, subject: 'history', score: 85, scale: 'percent', recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryGrades({
      from: '2026-04-14T09:30:00Z',
      to: '2026-04-14T10:30:00Z',
    });

    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('science');
  });

  it('queryGrades supports limit and offset pagination', () => {
    const src = createDataSource({ name: 'grade-pagination-source', type: 'manual' });

    insertGrade({ source_id: src.id, subject: 'math', score: 80, scale: 'percent', recorded_at: '2026-04-14T10:00:00Z' });
    insertGrade({ source_id: src.id, subject: 'science', score: 90, scale: 'percent', recorded_at: '2026-04-14T11:00:00Z' });
    insertGrade({ source_id: src.id, subject: 'history', score: 85, scale: 'percent', recorded_at: '2026-04-14T12:00:00Z' });

    const results = queryGrades({ limit: 1, offset: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('science');
  });
});

describe('Meals', () => {
  it('insertMeal returns inserted record with parsed items array', () => {
    const src = createDataSource({ name: 'meal-insert-source', type: 'manual' });

    const record = insertMeal({
      source_id: src.id,
      meal_type: 'breakfast',
      items: ['oats', 'banana'],
      nutrition: { calories: 350 },
      recorded_at: '2026-04-14T10:00:00Z',
    });

    expect(record).toMatchObject({
      id: expect.any(Number),
      source_id: src.id,
      meal_type: 'breakfast',
      items: ['oats', 'banana'],
      nutrition: { calories: 350 },
      metadata: {},
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(record.created_at).toEqual(expect.any(String));
  });

  it('queryMeals filters by source_id', () => {
    const srcA = createDataSource({ name: 'meal-source-a', type: 'manual' });
    const srcB = createDataSource({ name: 'meal-source-b', type: 'manual' });

    insertMeal({ source_id: srcA.id, meal_type: 'breakfast', items: ['eggs'], recorded_at: '2026-04-14T10:00:00Z' });
    insertMeal({ source_id: srcB.id, meal_type: 'lunch', items: ['salad'], recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryMeals({ source_id: srcA.id });

    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(srcA.id);
  });

  it('queryMeals filters by meal_type', () => {
    const src = createDataSource({ name: 'meal-type-source', type: 'manual' });

    insertMeal({ source_id: src.id, meal_type: 'breakfast', items: ['eggs'], recorded_at: '2026-04-14T10:00:00Z' });
    insertMeal({ source_id: src.id, meal_type: 'dinner', items: ['pasta'], recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryMeals({ meal_type: 'breakfast' });

    expect(results).toHaveLength(1);
    expect(results[0].meal_type).toBe('breakfast');
  });

  it('queryMeals filters by time range', () => {
    const src = createDataSource({ name: 'meal-range-source', type: 'manual' });

    insertMeal({ source_id: src.id, meal_type: 'breakfast', items: ['toast'], recorded_at: '2026-04-14T09:00:00Z' });
    insertMeal({ source_id: src.id, meal_type: 'lunch', items: ['salad'], recorded_at: '2026-04-14T10:00:00Z' });
    insertMeal({ source_id: src.id, meal_type: 'dinner', items: ['rice'], recorded_at: '2026-04-14T11:00:00Z' });

    const results = queryMeals({
      from: '2026-04-14T09:30:00Z',
      to: '2026-04-14T10:30:00Z',
    });

    expect(results).toHaveLength(1);
    expect(results[0].meal_type).toBe('lunch');
  });

  it('queryMeals supports limit and offset pagination', () => {
    const src = createDataSource({ name: 'meal-pagination-source', type: 'manual' });

    insertMeal({ source_id: src.id, meal_type: 'breakfast', items: ['toast'], recorded_at: '2026-04-14T10:00:00Z' });
    insertMeal({ source_id: src.id, meal_type: 'lunch', items: ['salad'], recorded_at: '2026-04-14T11:00:00Z' });
    insertMeal({ source_id: src.id, meal_type: 'dinner', items: ['rice'], recorded_at: '2026-04-14T12:00:00Z' });

    const results = queryMeals({ limit: 1, offset: 1 });

    expect(results).toHaveLength(1);
    expect(results[0].meal_type).toBe('lunch');
  });
});
