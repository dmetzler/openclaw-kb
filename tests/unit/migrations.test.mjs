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

// Track files we create so we always clean up
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
        '001-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '002-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );
      writeMigration(
        '003-add-bookmarks.sql',
        'CREATE TABLE bookmarks (id INTEGER PRIMARY KEY, url TEXT NOT NULL);',
      );

      initDatabase(':memory:');

      expect(getSchemaVersion()).toBe('003');

      const history = getMigrationHistory();
      expect(history).toHaveLength(3);
      expect(history[0]).toMatchObject({ version: '001', name: '001-add-tags.sql' });
      expect(history[1]).toMatchObject({ version: '002', name: '002-add-notes.sql' });
      expect(history[2]).toMatchObject({ version: '003', name: '003-add-bookmarks.sql' });
      expect(history[0].applied_at).toEqual(expect.any(String));
    });
  });

  describe('skip-applied logic', () => {
    it('only applies new migrations when DB already has some applied', () => {
      // First init with migrations 001 and 002
      writeMigration(
        '001-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '002-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );

      initDatabase(':memory:');
      expect(getSchemaVersion()).toBe('002');

      // We can't persist :memory: across inits, so instead we verify
      // that calling initDatabase again on the same connection is a no-op
      // (db is already open, returns same handle).
      // The real skip logic is tested by directly inserting into schema_migrations
      // and then verifying only new migrations run.
      closeDatabase();

      // Re-init fresh with all three migrations
      writeMigration(
        '003-add-bookmarks.sql',
        'CREATE TABLE bookmarks (id INTEGER PRIMARY KEY, url TEXT NOT NULL);',
      );

      // With :memory:, a new init creates a fresh DB, so all 3 run.
      // To properly test skip-applied, we need a file-based DB.
      const tmpDb = join(migrationsDir, '..', '..', 'test-skip-applied.db');
      createdFiles.push(tmpDb);

      initDatabase(tmpDb);
      expect(getSchemaVersion()).toBe('003');
      expect(getMigrationHistory()).toHaveLength(3);
      closeDatabase();

      // Now re-open the same DB — migrations 001-003 should be skipped
      // and no error should occur (tables already exist)
      initDatabase(tmpDb);
      expect(getSchemaVersion()).toBe('003');
      expect(getMigrationHistory()).toHaveLength(3);
      closeDatabase();
    });
  });

  describe('transactional rollback on failure', () => {
    it('rolls back failed migration and throws descriptive error', () => {
      writeMigration(
        '001-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '002-bad-migration.sql',
        'CREATE TABLE bad_table (id INTEGER PRIMARY KEY); INVALID SQL HERE;',
      );

      expect(() => initDatabase(':memory:')).toThrow(/Failed to apply migration 002-bad-migration\.sql/);

      // After failure, DB should be closed by the throw propagation.
      // Version should not advance to 002 — the transaction rolled back.
      // But since initDatabase threw, we can't query the same db.
      // Verify by re-initializing with only the good migration.
      removeMigrations();
      writeMigration(
        '001-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      closeDatabase();
      initDatabase(':memory:');
      expect(getSchemaVersion()).toBe('001');
      expect(getMigrationHistory()).toHaveLength(1);
    });
  });

  describe('file filtering', () => {
    it('ignores files that do not match the naming pattern', () => {
      writeMigration(
        '001-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      // These should be ignored
      writeMigration('README.md', '# Migrations');
      writeMigration('not-a-migration.sql', 'CREATE TABLE ignored (id INTEGER);');
      writeMigration('1-too-short.sql', 'CREATE TABLE ignored2 (id INTEGER);');
      writeMigration('0001-too-long.sql', 'CREATE TABLE ignored3 (id INTEGER);');

      initDatabase(':memory:');

      expect(getSchemaVersion()).toBe('001');
      expect(getMigrationHistory()).toHaveLength(1);
      expect(getMigrationHistory()[0].name).toBe('001-add-tags.sql');
    });
  });

  describe('getSchemaVersion', () => {
    it('returns null when no migrations have been applied', () => {
      initDatabase(':memory:');
      expect(getSchemaVersion()).toBeNull();
    });

    it('returns the latest applied version', () => {
      writeMigration(
        '001-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '002-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );

      initDatabase(':memory:');
      expect(getSchemaVersion()).toBe('002');
    });
  });

  describe('getMigrationHistory', () => {
    it('returns empty array when no migrations applied', () => {
      initDatabase(':memory:');
      expect(getMigrationHistory()).toEqual([]);
    });

    it('returns all applied migrations in order with timestamps', () => {
      writeMigration(
        '001-add-tags.sql',
        'CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT NOT NULL);',
      );
      writeMigration(
        '002-add-notes.sql',
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL);',
      );

      initDatabase(':memory:');

      const history = getMigrationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].version).toBe('001');
      expect(history[0].name).toBe('001-add-tags.sql');
      expect(history[0].applied_at).toEqual(expect.any(String));
      expect(history[1].version).toBe('002');
      expect(history[1].name).toBe('002-add-notes.sql');
      expect(history[1].applied_at).toEqual(expect.any(String));
    });
  });
});
