import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  getAllEntities,
} from '../../src/db.mjs';
import {
  tokenize,
  parseGlobalFlags,
  dispatch,
  runBatch,
} from '../../src/cli.mjs';

const TEST_WIKI = 'test-wiki-cli';

beforeEach(() => {
  initDatabase(':memory:');
  mkdirSync(TEST_WIKI, { recursive: true });
  for (const sub of ['entities', 'concepts', 'topics', 'comparisons', 'sources']) {
    mkdirSync(join(TEST_WIKI, sub), { recursive: true });
  }
});

afterEach(() => {
  closeDatabase();
  if (existsSync(TEST_WIKI)) {
    rmSync(TEST_WIKI, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  it('splits simple arguments', () => {
    expect(tokenize('add-entity Alice person')).toEqual(['add-entity', 'Alice', 'person']);
  });

  it('handles quoted strings', () => {
    expect(tokenize('add-entity "Damien Metzler" person "Software architect"')).toEqual([
      'add-entity', 'Damien Metzler', 'person', 'Software architect',
    ]);
  });

  it('handles empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('handles multiple spaces', () => {
    expect(tokenize('  search   kubernetes  ')).toEqual(['search', 'kubernetes']);
  });
});

// ---------------------------------------------------------------------------
// parseGlobalFlags
// ---------------------------------------------------------------------------

describe('parseGlobalFlags', () => {
  it('extracts --db flag', () => {
    const { flags, args } = parseGlobalFlags(['--db', 'custom.db', 'list-entities']);
    expect(flags.db).toBe('custom.db');
    expect(args).toEqual(['list-entities']);
  });

  it('extracts --json flag', () => {
    const { flags, args } = parseGlobalFlags(['list-entities', '--json']);
    expect(flags.json).toBe(true);
    expect(args).toEqual(['list-entities']);
  });

  it('extracts --help flag', () => {
    const { flags } = parseGlobalFlags(['--help']);
    expect(flags.help).toBe(true);
  });

  it('extracts --wiki flag', () => {
    const { flags } = parseGlobalFlags(['--wiki', '/tmp/wiki', 'list-entities']);
    expect(flags.wiki).toBe('/tmp/wiki');
  });

  it('passes through unknown args', () => {
    const { args } = parseGlobalFlags(['add-entity', 'Alice', 'person']);
    expect(args).toEqual(['add-entity', 'Alice', 'person']);
  });
});

// ---------------------------------------------------------------------------
// dispatch: add-entity
// ---------------------------------------------------------------------------

describe('add-entity', () => {
  it('creates a new entity', async () => {
    const result = await dispatch('add-entity', ['Alice', 'person', 'Engineer'], { json: false });
    expect(result.name).toBe('Alice');
    expect(result.type).toBe('person');
    expect(result.metadata).toEqual({ description: 'Engineer' });
    expect(result.id).toBeGreaterThan(0);
  });

  it('returns existing entity on duplicate name', async () => {
    createEntity({ name: 'Alice', type: 'person' });
    const result = await dispatch('add-entity', ['Alice', 'person'], { json: false });
    expect(result._note).toBe('already exists');
    expect(result.name).toBe('Alice');
  });

  it('is case-insensitive for duplicate check', async () => {
    createEntity({ name: 'Alice', type: 'person' });
    const result = await dispatch('add-entity', ['alice', 'person'], { json: false });
    expect(result._note).toBe('already exists');
  });

  it('returns error when args missing', async () => {
    const result = await dispatch('add-entity', [], { json: false });
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// dispatch: add-relation
// ---------------------------------------------------------------------------

describe('add-relation', () => {
  it('creates relation by ID', async () => {
    const a = createEntity({ name: 'Alice', type: 'person' });
    const b = createEntity({ name: 'Acme', type: 'org' });
    const result = await dispatch('add-relation', [String(a.id), String(b.id), 'works_at'], { json: false });
    expect(result.source_id).toBe(a.id);
    expect(result.target_id).toBe(b.id);
    expect(result.type).toBe('works_at');
  });

  it('creates relation by name', async () => {
    createEntity({ name: 'Alice', type: 'person' });
    createEntity({ name: 'Acme', type: 'org' });
    const result = await dispatch('add-relation', ['Alice', 'Acme', 'works_at'], { json: false });
    expect(result.type).toBe('works_at');
  });

  it('returns error for unknown entity', async () => {
    const result = await dispatch('add-relation', ['999', '998', 'works_at'], { json: false });
    expect(result.error).toContain('not found');
  });
});

// ---------------------------------------------------------------------------
// dispatch: list-entities
// ---------------------------------------------------------------------------

describe('list-entities', () => {
  it('lists all entities', async () => {
    createEntity({ name: 'Alice', type: 'person' });
    createEntity({ name: 'Bob', type: 'person' });
    const result = await dispatch('list-entities', [], { json: false });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
  });

  it('returns empty array when no entities', async () => {
    const result = await dispatch('list-entities', [], { json: false });
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// dispatch: find-entity
// ---------------------------------------------------------------------------

describe('find-entity', () => {
  it('finds entities by substring', async () => {
    createEntity({ name: 'Damien Metzler', type: 'person' });
    createEntity({ name: 'Alice Smith', type: 'person' });
    const result = await dispatch('find-entity', ['Damien'], { json: false });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Damien Metzler');
  });

  it('is case-insensitive', async () => {
    createEntity({ name: 'Alice', type: 'person' });
    const result = await dispatch('find-entity', ['alice'], { json: false });
    expect(result).toHaveLength(1);
  });

  it('returns error with no query', async () => {
    const result = await dispatch('find-entity', [], { json: false });
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// dispatch: search-kg
// ---------------------------------------------------------------------------

describe('search-kg', () => {
  it('searches knowledge graph entities', async () => {
    createEntity({ name: 'Kubernetes', type: 'tool' });
    const result = await dispatch('search-kg', ['Kubernetes'], { json: false });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].name).toBe('Kubernetes');
  });

  it('returns error with no query', async () => {
    const result = await dispatch('search-kg', [], { json: false });
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// dispatch: create-page
// ---------------------------------------------------------------------------

describe('create-page', () => {
  it('creates wiki page for entity', async () => {
    const e = createEntity({ name: 'TestEntity', type: 'person' });
    const result = await dispatch('create-page', [String(e.id)], { json: false, wiki: TEST_WIKI });
    expect(result.status).toBe('created');
    expect(existsSync(result.path)).toBe(true);
  });

  it('reports exists for already-created page', async () => {
    const e = createEntity({ name: 'TestEntity', type: 'person' });
    await dispatch('create-page', [String(e.id)], { json: false, wiki: TEST_WIKI });
    const result = await dispatch('create-page', [String(e.id)], { json: false, wiki: TEST_WIKI });
    expect(result.status).toBe('exists');
  });

  it('creates all pages with --all', async () => {
    createEntity({ name: 'Alice', type: 'person' });
    createEntity({ name: 'Bob', type: 'person' });
    const result = await dispatch('create-page', ['--all'], { json: false, wiki: TEST_WIKI });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'created')).toBe(true);
  });

  it('returns error for missing entity', async () => {
    const result = await dispatch('create-page', ['999'], { json: false, wiki: TEST_WIKI });
    expect(result.error).toContain('not found');
  });
});

// ---------------------------------------------------------------------------
// dispatch: ingest-raw
// ---------------------------------------------------------------------------

describe('ingest-raw', () => {
  const RAW_DIR = 'raw';

  afterEach(() => {
    // cleanup created raw files would need raw dir check, skip for test brevity
  });

  it('creates a raw file with frontmatter', async () => {
    const result = await dispatch('ingest-raw', ['Test Article', 'https://example.com', 'Some content here'], { json: false });
    expect(result.fileName).toMatch(/\.md$/);
    expect(existsSync(result.filePath)).toBe(true);

    const content = readFileSync(result.filePath, 'utf8');
    expect(content).toContain('title: Test Article');
    expect(content).toContain('https://example.com');
    expect(content).toContain('Some content here');
  });

  it('returns error with missing args', async () => {
    const result = await dispatch('ingest-raw', ['title only'], { json: false });
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// dispatch: regen-index
// ---------------------------------------------------------------------------

describe('regen-index', () => {
  it('regenerates wiki index', async () => {
    const result = await dispatch('regen-index', [], { json: false, wiki: TEST_WIKI });
    expect(result.indexPages).toBeDefined();
    expect(existsSync(join(TEST_WIKI, 'index.md'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dispatch: stats
// ---------------------------------------------------------------------------

describe('stats', () => {
  it('returns record counts', async () => {
    createEntity({ name: 'Alice', type: 'person' });
    const result = await dispatch('stats', [], { json: false });
    expect(result.entities).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// dispatch: unknown command
// ---------------------------------------------------------------------------

describe('unknown command', () => {
  it('returns error for unknown command', async () => {
    const result = await dispatch('nonexistent', [], { json: false });
    expect(result.error).toContain('Unknown command');
  });
});

// ---------------------------------------------------------------------------
// dispatch: help for specific command
// ---------------------------------------------------------------------------

describe('command help', () => {
  it('returns usage info when --help is set', async () => {
    const result = await dispatch('add-entity', [], { json: false, help: true });
    expect(result.usage).toContain('add-entity');
    expect(result.description).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// batch mode (via stdin simulation)
// ---------------------------------------------------------------------------

describe('batch mode', () => {
  it('processes batch input via runBatch', async () => {
    const { Readable } = await import('node:stream');

    const input = [
      'add-entity "Alice" person "Engineer"',
      'add-entity "Acme" org "Tech company"',
      '# This is a comment',
      'add-relation Alice Acme works_at',
      'list-entities',
    ].join('\n');

    // Replace stdin temporarily
    const originalStdin = process.stdin;
    const readable = new Readable();
    readable.push(input);
    readable.push(null);
    Object.defineProperty(process, 'stdin', { value: readable, writable: true });

    try {
      const result = await runBatch({ json: false });
      expect(result.results).toHaveLength(4); // comment skipped
      expect(result.errors).toBe(0);

      // Verify entities were created
      const entities = getAllEntities();
      expect(entities).toHaveLength(2);
    } finally {
      Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    }
  });
});
