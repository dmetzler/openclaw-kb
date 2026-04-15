import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  createDataSource,
  insertRecord,
  upsertEmbedding,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';
import { exportDatabase } from '../../src/kb-export.mjs';
import { importDatabase } from '../../src/kb-import.mjs';

let tmpDir;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kb-roundtrip-test-'));
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
  rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Seeds the database with complex data across all tables.
 * Exercises edge cases: nested metadata, special characters, multiple records,
 * float precision in embeddings, and JSON arrays/objects.
 */
function seedComplexData() {
  const ds1 = createDataSource({
    name: 'fitbit-api',
    type: 'api',
    config: { api_key: 'abc123', endpoint: 'https://api.fitbit.com', nested: { deep: true } },
  });
  const ds2 = createDataSource({
    name: 'manual-entry',
    type: 'manual',
    config: {},
  });

  const e1 = createEntity({
    name: 'John "Johnny" Doe',
    type: 'person',
    metadata: { age: 30, tags: ['engineer', 'parent'], notes: 'Has a comma, and "quotes"' },
  });
  const e2 = createEntity({
    name: 'Acme Corp',
    type: 'organization',
    metadata: { industry: 'tech', employees: 500 },
  });
  const e3 = createEntity({
    name: 'Project\nNewline',
    type: 'project',
    metadata: { special: 'tab\there', unicode: '日本語' },
  });

  createRelation({
    source_id: e1.id,
    target_id: e2.id,
    type: 'works_at',
    metadata: { since: '2020', role: 'Senior Engineer' },
  });
  createRelation({
    source_id: e1.id,
    target_id: e3.id,
    type: 'contributes_to',
    metadata: {},
  });

  insertRecord('health_metric', {
    source_id: ds1.id,
    metric_type: 'heart_rate',
    value: 72,
    unit: 'bpm',
    recorded_at: '2026-04-10T08:00:00',
    device: 'Fitbit Sense',
  });
  insertRecord('health_metric', {
    source_id: ds1.id,
    metric_type: 'weight',
    value: 75.5,
    unit: 'kg',
    recorded_at: '2026-04-10T08:00:00',
    device: 'Withings Scale',
  });

  insertRecord('activity', {
    source_id: ds1.id,
    activity_type: 'running',
    duration_minutes: 30,
    distance_km: 5.2,
    calories: 320,
    recorded_at: '2026-04-10T07:00:00',
  });
  insertRecord('activity', {
    source_id: ds2.id,
    activity_type: 'yoga',
    duration_minutes: 60,
    distance_km: 0,
    calories: 180,
    recorded_at: '2026-04-11T07:00:00',
  });

  insertRecord('grade', {
    source_id: ds2.id,
    student: 'John "Johnny" Doe',
    subject: 'Mathematics',
    score: 95,
    max_score: 100,
    school_year: '2025-2026',
    recorded_at: '2026-04-10T09:00:00',
  });

  insertRecord('meal', {
    source_id: ds1.id,
    meal_type: 'breakfast',
    items: ['oatmeal', 'coffee', 'banana'],
    calories_est: 450,
    recorded_at: '2026-04-10T07:00:00',
  });
  insertRecord('meal', {
    source_id: ds2.id,
    meal_type: 'lunch',
    items: ['salad', 'sandwich'],
    calories_est: 600,
    recorded_at: '2026-04-10T12:00:00',
  });

  const vec1 = new Float32Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) vec1[i] = (i - 192) / 100;
  upsertEmbedding(e1.id, vec1);

  const vec2 = new Float32Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) vec2[i] = Math.sin(i * 0.1);
  upsertEmbedding(e2.id, vec2);
}

describe('Round-trip: export → import → re-export', () => {
  it('produces byte-identical files on re-export', () => {
    const exportDirA = join(tmpDir, 'export-a');
    const exportDirB = join(tmpDir, 'export-b');
    const importDbPath = join(tmpDir, 'imported.db');

    // Step 1: Seed and export
    seedComplexData();
    exportDatabase(exportDirA, { silent: true });
    closeDatabase();

    // Step 2: Import into fresh DB
    importDatabase(exportDirA, importDbPath, { silent: true });
    closeDatabase();

    // Step 3: Re-open imported DB and re-export
    initDatabase(importDbPath);
    exportDatabase(exportDirB, { silent: true });
    closeDatabase();

    // Step 4: Compare every file byte-for-byte
    const filesA = readdirSync(exportDirA).sort();
    const filesB = readdirSync(exportDirB).sort();

    expect(filesA).toEqual(filesB);

    for (const file of filesA) {
      // Skip metadata.json — exported_at timestamp will differ
      if (file === 'metadata.json') {
        // For metadata, compare everything except exported_at
        const metaA = JSON.parse(readFileSync(join(exportDirA, file), 'utf8'));
        const metaB = JSON.parse(readFileSync(join(exportDirB, file), 'utf8'));
        expect(metaB.schema_version).toBe(metaA.schema_version);
        expect(metaB.record_counts).toEqual(metaA.record_counts);
        continue;
      }

      const contentA = readFileSync(join(exportDirA, file));
      const contentB = readFileSync(join(exportDirB, file));
      expect(contentB.equals(contentA)).toBe(true);
    }
  });

  it('handles empty tables in round-trip', () => {
    const exportDirA = join(tmpDir, 'empty-export-a');
    const exportDirB = join(tmpDir, 'empty-export-b');
    const importDbPath = join(tmpDir, 'empty-imported.db');

    // Export empty database
    exportDatabase(exportDirA, { silent: true });
    closeDatabase();

    // Import into fresh DB
    importDatabase(exportDirA, importDbPath, { silent: true });
    closeDatabase();

    // Re-export
    initDatabase(importDbPath);
    exportDatabase(exportDirB, { silent: true });
    closeDatabase();

    // Compare
    const filesA = readdirSync(exportDirA).sort();
    const filesB = readdirSync(exportDirB).sort();
    expect(filesA).toEqual(filesB);

    for (const file of filesA) {
      if (file === 'metadata.json') {
        const metaA = JSON.parse(readFileSync(join(exportDirA, file), 'utf8'));
        const metaB = JSON.parse(readFileSync(join(exportDirB, file), 'utf8'));
        expect(metaB.schema_version).toBe(metaA.schema_version);
        expect(metaB.record_counts).toEqual(metaA.record_counts);
        continue;
      }

      const contentA = readFileSync(join(exportDirA, file));
      const contentB = readFileSync(join(exportDirB, file));
      expect(contentB.equals(contentA)).toBe(true);
    }
  });
});
