import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'node:fs';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  getEntity,
  updateEntity,
  deleteEntity,
  createRelation,
  getRelationsFrom,
  getRelationsTo,
  deleteRelation,
  traverseGraph,
  createDataSource,
  getDataSource,
  updateDataSource,
  insertRecord,
  queryRecords,
  getAllDataRecords,
  importDataRecord,
  search,
  upsertEmbedding,
  deleteEmbedding,
  findNearestVectors,
  getSchemaVersion,
  getMigrationHistory,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';

afterEach(() => {
  closeDatabase();
});

describe('Schema Initialization', () => {
  it('initDatabase with :memory: creates DB, applies schema, and returns handle', () => {
    const handle = initDatabase(':memory:');

    expect(handle).toBeDefined();
    expect(handle.open).toBe(true);
  });

  it('sets WAL journal mode', () => {
    const handle = initDatabase(':memory:');
    const journalMode = handle.pragma('journal_mode', { simple: true });

    // :memory: databases may report 'memory' instead of 'wal'
    expect(['wal', 'memory']).toContain(journalMode);
  });

  it('enables foreign key enforcement', () => {
    const handle = initDatabase(':memory:');
    const fk = handle.pragma('foreign_keys', { simple: true });

    expect(fk).toBe(1);
  });

  it('does not re-apply schema on second init with same DB', () => {
    const handle = initDatabase(':memory:');

    // Insert data to prove schema exists
    createEntity({ name: 'Persistent', type: 'test' });

    // Re-init should not drop existing data
    const handle2 = initDatabase(':memory:');

    // Same handle — singleton pattern
    expect(handle2).toBe(handle);
    const entity = getEntity(1);
    expect(entity).not.toBeNull();
    expect(entity.name).toBe('Persistent');
  });

  it('closeDatabase is idempotent', () => {
    initDatabase(':memory:');

    expect(() => closeDatabase()).not.toThrow();
    expect(() => closeDatabase()).not.toThrow();
    expect(() => closeDatabase()).not.toThrow();
  });

  it('creates database file at custom path', () => {
    const testPath = '/tmp/test-openclaw-schema-init.db';

    // Clean up from previous runs
    for (const suffix of ['', '-wal', '-shm']) {
      const path = testPath + suffix;
      if (existsSync(path)) unlinkSync(path);
    }

    try {
      const handle = initDatabase(testPath);
      expect(handle.open).toBe(true);
      expect(existsSync(testPath)).toBe(true);
    } finally {
      closeDatabase();
      for (const suffix of ['', '-wal', '-shm']) {
        const path = testPath + suffix;
        if (existsSync(path)) unlinkSync(path);
      }
    }
  });
});

describe('Public API Exports', () => {
  it('all public exports exist and are functions', () => {
    const expectedFunctions = [
      initDatabase,
      closeDatabase,
      createEntity,
      getEntity,
      updateEntity,
      deleteEntity,
      createRelation,
      getRelationsFrom,
      getRelationsTo,
      deleteRelation,
      traverseGraph,
      createDataSource,
      getDataSource,
      updateDataSource,
      insertRecord,
      queryRecords,
      getAllDataRecords,
      importDataRecord,
      search,
      upsertEmbedding,
      deleteEmbedding,
      findNearestVectors,
      getSchemaVersion,
      getMigrationHistory,
    ];

    for (const fn of expectedFunctions) {
      expect(typeof fn).toBe('function');
    }
  });

  it('EMBEDDING_DIMENSIONS is exported as a number', () => {
    expect(typeof EMBEDDING_DIMENSIONS).toBe('number');
    expect(EMBEDDING_DIMENSIONS).toBe(384);
  });
});
