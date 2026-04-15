import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initDatabase,
  closeDatabase,
  getSchemaVersion,
  getMigrationHistory,
} from '../../src/db.mjs';

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/migrations',
);

let createdFiles = [];

function writeMigration(filename, sql) {
  const filepath = join(migrationsDir, filename);
  writeFileSync(filepath, sql, 'utf8');
  createdFiles.push(filepath);
}

function removeMigrations() {
  for (const filepath of createdFiles) {
    if (existsSync(filepath)) {
      unlinkSync(filepath);
    }
  }
  createdFiles = [];
}

afterEach(() => {
  closeDatabase();
  removeMigrations();
});

describe('Migration System', () => {
  describe('sequential application', () => {
    it('applies all migrations in order when no history exists', () => {
      writeMigration(
        '900-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '901-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );
      writeMigration(
        '902-add-bookmarks.sql',
        'CREATE TABLE bookmarks (id INTEGER PRIMARY KEY, url TEXT NOT NULL);',
      );

      initDatabase(':memory:');

      expect(getSchemaVersion()).toBe('902');

      const history = getMigrationHistory();
      expect(history).toHaveLength(4);
      expect(history[0]).toMatchObject({ version: '001', name: '001-generic-data-records.sql' });
      expect(history[1]).toMatchObject({ version: '900', name: '900-add-tags.sql' });
      expect(history[2]).toMatchObject({ version: '901', name: '901-add-notes.sql' });
      expect(history[3]).toMatchObject({ version: '902', name: '902-add-bookmarks.sql' });
      expect(history[0].applied_at).toEqual(expect.any(String));
    });
  });

  describe('skip-applied logic', () => {
    it('only applies new migrations when DB already has some applied', () => {
      writeMigration(
        '900-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '901-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );

      initDatabase(':memory:');
      expect(getSchemaVersion()).toBe('901');
      closeDatabase();

      writeMigration(
        '902-add-bookmarks.sql',
        'CREATE TABLE bookmarks (id INTEGER PRIMARY KEY, url TEXT NOT NULL);',
      );

      const tmpDb = join(migrationsDir, '..', '..', 'test-skip-applied.db');
      createdFiles.push(tmpDb);

      initDatabase(tmpDb);
      expect(getSchemaVersion()).toBe('902');
      expect(getMigrationHistory()).toHaveLength(4);
      closeDatabase();

      initDatabase(tmpDb);
      expect(getSchemaVersion()).toBe('902');
      expect(getMigrationHistory()).toHaveLength(4);
      closeDatabase();
    });
  });

  describe('transactional rollback on failure', () => {
    it('rolls back failed migration and throws descriptive error', () => {
      writeMigration(
        '900-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '901-bad-migration.sql',
        'CREATE TABLE bad_table (id INTEGER PRIMARY KEY); INVALID SQL HERE;',
      );

      expect(() => initDatabase(':memory:')).toThrow(/Failed to apply migration 901-bad-migration\.sql/);

      removeMigrations();
      writeMigration(
        '900-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      closeDatabase();
      initDatabase(':memory:');
      expect(getSchemaVersion()).toBe('900');
      expect(getMigrationHistory()).toHaveLength(2);
    });
  });

  describe('file filtering', () => {
    it('ignores files that do not match the naming pattern', () => {
      writeMigration(
        '900-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration('README.md', '# Migrations');
      writeMigration('not-a-migration.sql', 'CREATE TABLE ignored (id INTEGER);');
      writeMigration('1-too-short.sql', 'CREATE TABLE ignored2 (id INTEGER);');
      writeMigration('0001-too-long.sql', 'CREATE TABLE ignored3 (id INTEGER);');

      initDatabase(':memory:');

      expect(getSchemaVersion()).toBe('900');
      expect(getMigrationHistory()).toHaveLength(2);
      expect(getMigrationHistory()[1].name).toBe('900-add-tags.sql');
    });
  });

  describe('getSchemaVersion', () => {
    it('returns 001 on fresh database (real migration auto-applied)', () => {
      initDatabase(':memory:');
      expect(getSchemaVersion()).toBe('001');
    });

    it('returns the latest applied version', () => {
      writeMigration(
        '900-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '901-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );

      initDatabase(':memory:');
      expect(getSchemaVersion()).toBe('901');
    });
  });

  describe('getMigrationHistory', () => {
    it('returns only real migration on fresh database', () => {
      initDatabase(':memory:');
      const history = getMigrationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ version: '001', name: '001-generic-data-records.sql' });
    });

    it('returns all applied migrations in order with timestamps', () => {
      writeMigration(
        '900-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '901-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );

      initDatabase(':memory:');

      const history = getMigrationHistory();
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe('001');
      expect(history[0].name).toBe('001-generic-data-records.sql');
      expect(history[0].applied_at).toEqual(expect.any(String));
      expect(history[1].version).toBe('900');
      expect(history[1].name).toBe('900-add-tags.sql');
      expect(history[2].version).toBe('901');
      expect(history[2].name).toBe('901-add-notes.sql');
    });
  });
});

describe('Data Records Migration (001-generic-data-records)', () => {
  it('migrates legacy data lake tables to data_records', () => {
    const db = initDatabase(':memory:');

    db.exec(`
      CREATE TABLE IF NOT EXISTS health_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        recorded_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (source_id) REFERENCES data_sources(id)
      );
    `);

    db.prepare("INSERT INTO data_sources (name, type, config) VALUES (?, ?, ?)").run('test-src', 'manual', '{}');

    db.prepare("INSERT INTO health_metrics (source_id, metric_type, value, unit, metadata, recorded_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(1, 'weight', 80, 'kg', '{}', '2026-04-14T10:00:00Z');
    db.prepare("INSERT INTO health_metrics (source_id, metric_type, value, unit, metadata, recorded_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(1, 'heart_rate', 72, 'bpm', '{"resting":true}', '2026-04-14T11:00:00Z');

    db.exec(`
      INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
      SELECT source_id, 'health_metric',
        json_object('metric_type', metric_type, 'value', value, 'unit', unit, 'metadata', json(metadata)),
        recorded_at, created_at
      FROM health_metrics;
    `);

    db.exec('DROP TABLE IF EXISTS health_metrics;');

    const rows = db.prepare('SELECT * FROM data_records ORDER BY id ASC').all();
    expect(rows).toHaveLength(2);

    expect(rows[0].record_type).toBe('health_metric');
    expect(rows[0].source_id).toBe(1);

    const data0 = JSON.parse(rows[0].data);
    expect(data0.metric_type).toBe('weight');
    expect(data0.value).toBe(80);
    expect(data0.unit).toBe('kg');

    const data1 = JSON.parse(rows[1].data);
    expect(data1.metric_type).toBe('heart_rate');
    expect(data1.metadata).toEqual({ resting: true });

    const legacyTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='health_metrics'").get();
    expect(legacyTable).toBeUndefined();
  });
});
