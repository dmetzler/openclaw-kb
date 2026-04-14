import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  getAllEntities,
  getAllRelations,
} from '../../src/db.mjs';
import { migrateKnowledgeGraph, buildMetadata } from '../../src/kg-migrate.mjs';

let tmpDir;

/**
 * Creates a temporary kg-store.json file and returns its path.
 *
 * @param {Object} data - The kg-store data to write.
 * @returns {string} Path to the temp file.
 */
function createKgStoreFile(data) {
  const filePath = join(tmpDir, 'kg-store.json');
  writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kg-migrate-test-'));
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
  rmSync(tmpDir, { recursive: true, force: true });
});

// ======================================================================
// Phase 3: User Story 1 — Migrate All Entities
// ======================================================================

describe('US1: Migrate all entities', () => {
  it('T010: migrates 5 entities of various types with correct name and type', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
        projectx: { id: 'projectx', label: 'Project X', type: 'project' },
        ai: { id: 'ai', label: 'Artificial Intelligence', type: 'concept' },
        vscode: { id: 'vscode', label: 'VS Code', type: 'tool' },
        github: { id: 'github', label: 'GitHub', type: 'service' },
      },
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.entities.migrated).toBe(5);
    const entities = getAllEntities();
    expect(entities).toHaveLength(5);
    expect(entities.map((e) => e.name).sort()).toEqual(
      ['Alice', 'Artificial Intelligence', 'GitHub', 'Project X', 'VS Code'],
    );
    expect(entities.map((e) => e.type).sort()).toEqual(
      ['concept', 'human', 'project', 'service', 'tool'],
    );
  });

  it('T011: migrates entity with all optional fields and attrs.role merged at top level', () => {
    const data = {
      entities: {
        damien: {
          id: 'damien',
          label: 'Damien',
          type: 'human',
          category: 'personal',
          tags: ['owner'],
          parent: 'family',
          confidence: 0.95,
          wikiPage: 'people/damien',
          attrs: { role: 'founder' },
        },
      },
    };
    const filePath = createKgStoreFile(data);
    migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    const entities = getAllEntities();
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('Damien');
    expect(entities[0].type).toBe('human');
    expect(entities[0].metadata).toEqual({
      category: 'personal',
      tags: ['owner'],
      parent: 'family',
      confidence: 0.95,
      wikiPage: 'people/damien',
      role: 'founder',
    });
  });

  it('T012: migrates entity with empty attrs and no optional fields, metadata omits absent fields', () => {
    const data = {
      entities: {
        minimal: { id: 'minimal', label: 'Minimal Entity', type: 'concept', attrs: {} },
      },
    };
    const filePath = createKgStoreFile(data);
    migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    const entities = getAllEntities();
    expect(entities).toHaveLength(1);
    expect(entities[0].metadata).toEqual({});
  });

  it('T013: migrates entity with type "credential", type preserved as-is', () => {
    const data = {
      entities: {
        cred1: { id: 'cred1', label: 'My API Key', type: 'credential' },
      },
    };
    const filePath = createKgStoreFile(data);
    migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    const entities = getAllEntities();
    expect(entities).toHaveLength(1);
    expect(entities[0].type).toBe('credential');
  });
});

// ======================================================================
// Phase 4: User Story 2 — Migrate All Relations
// ======================================================================

describe('US2: Migrate all relations', () => {
  it('T018: migrates relation with correct source_id, target_id, and type', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
        bob: { id: 'bob', label: 'Bob', type: 'human' },
      },
      relations: [{ from: 'alice', to: 'bob', rel: 'knows', attrs: {} }],
    };
    const filePath = createKgStoreFile(data);
    migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    const relations = getAllRelations();
    expect(relations).toHaveLength(1);
    expect(relations[0].type).toBe('knows');

    const entities = getAllEntities();
    const alice = entities.find((e) => e.name === 'Alice');
    const bob = entities.find((e) => e.name === 'Bob');
    expect(relations[0].source_id).toBe(alice.id);
    expect(relations[0].target_id).toBe(bob.id);
  });

  it('T019: migrates relation with attrs metadata', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
        bob: { id: 'bob', label: 'Bob', type: 'human' },
      },
      relations: [{ from: 'alice', to: 'bob', rel: 'knows', attrs: { since: '2024' } }],
    };
    const filePath = createKgStoreFile(data);
    migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    const relations = getAllRelations();
    expect(relations).toHaveLength(1);
    expect(relations[0].metadata).toEqual({ since: '2024' });
  });

  it('T020: relation referencing non-existent entity is skipped with error', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
      },
      relations: [{ from: 'alice', to: 'unknown', rel: 'knows', attrs: {} }],
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.relations.errors).toBe(1);
    expect(stats.relations.migrated).toBe(0);
    expect(getAllRelations()).toHaveLength(0);
  });

  it('T021: self-referential relation is skipped and counted as error', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
      },
      relations: [{ from: 'alice', to: 'alice', rel: 'self_ref', attrs: {} }],
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.relations.errors).toBe(1);
    expect(stats.relations.migrated).toBe(0);
    expect(getAllRelations()).toHaveLength(0);
  });
});

// ======================================================================
// Phase 5: User Story 3 — Dry-Run Mode
// ======================================================================

describe('US3: Dry-run mode', () => {
  it('T025: dry-run reports counts but writes nothing to database', () => {
    const entities = {};
    for (let i = 0; i < 10; i++) {
      entities[`e${i}`] = { id: `e${i}`, label: `Entity ${i}`, type: 'concept' };
    }
    const relations = [];
    for (let i = 0; i < 5; i++) {
      relations.push({ from: `e${i}`, to: `e${i + 5}`, rel: 'related_to', attrs: {} });
    }
    const data = { entities, relations };
    const filePath = createKgStoreFile(data);

    const stats = migrateKnowledgeGraph(filePath, ':memory:', { dryRun: true, silent: true });

    expect(stats.entities.migrated).toBe(10);
    expect(stats.relations.migrated).toBe(5);
    // Database should be empty
    expect(getAllEntities()).toHaveLength(0);
    expect(getAllRelations()).toHaveLength(0);
  });

  it('T026: dry-run with existing duplicate entity reports would be skipped', () => {
    // Pre-create an entity
    createEntity({ name: 'Entity 0', type: 'concept' });

    const data = {
      entities: {
        e0: { id: 'e0', label: 'Entity 0', type: 'concept' },
        e1: { id: 'e1', label: 'Entity 1', type: 'concept' },
      },
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { dryRun: true, silent: true });

    expect(stats.entities.skipped).toBe(1);
    expect(stats.entities.migrated).toBe(1);
  });

  it('T027: dry-run with relation referencing missing entity reports error', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
      },
      relations: [{ from: 'alice', to: 'missing', rel: 'knows', attrs: {} }],
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { dryRun: true, silent: true });

    expect(stats.relations.errors).toBe(1);
  });
});

// ======================================================================
// Phase 6: User Story 4 — Idempotent Re-Runs
// ======================================================================

describe('US4: Idempotent re-runs', () => {
  it('T030: second run with same data has 0 migrated and N skipped', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
        bob: { id: 'bob', label: 'Bob', type: 'human' },
        charlie: { id: 'charlie', label: 'Charlie', type: 'human' },
      },
      relations: [{ from: 'alice', to: 'bob', rel: 'knows', attrs: {} }],
    };
    const filePath = createKgStoreFile(data);

    // First run
    const stats1 = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });
    expect(stats1.entities.migrated).toBe(3);

    // Second run
    const stats2 = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });
    expect(stats2.entities.migrated).toBe(0);
    expect(stats2.entities.skipped).toBe(3);
    expect(stats2.relations.skipped).toBe(1);
    expect(stats2.relations.errors).toBe(0);
  });

  it('T031: re-run with 2 new entities creates only the new ones', () => {
    const data1 = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
        bob: { id: 'bob', label: 'Bob', type: 'human' },
      },
    };
    const filePath1 = createKgStoreFile(data1);
    migrateKnowledgeGraph(filePath1, ':memory:', { silent: true });

    const data2 = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
        bob: { id: 'bob', label: 'Bob', type: 'human' },
        charlie: { id: 'charlie', label: 'Charlie', type: 'human' },
        dave: { id: 'dave', label: 'Dave', type: 'human' },
      },
    };
    const filePath2 = join(tmpDir, 'kg-store2.json');
    writeFileSync(filePath2, JSON.stringify(data2));
    const stats2 = migrateKnowledgeGraph(filePath2, ':memory:', { silent: true });

    expect(stats2.entities.migrated).toBe(2);
    expect(stats2.entities.skipped).toBe(2);
    expect(getAllEntities()).toHaveLength(4);
  });

  it('T032: re-run does NOT update existing entity metadata', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human', attrs: { role: 'v1' } },
      },
    };
    const filePath = createKgStoreFile(data);
    migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    const entitiesBefore = getAllEntities();
    expect(entitiesBefore[0].metadata).toEqual({ role: 'v1' });

    // Second run with different attrs
    const data2 = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human', attrs: { role: 'v2' } },
      },
    };
    const filePath2 = join(tmpDir, 'kg-store-v2.json');
    writeFileSync(filePath2, JSON.stringify(data2));
    migrateKnowledgeGraph(filePath2, ':memory:', { silent: true });

    const entitiesAfter = getAllEntities();
    expect(entitiesAfter[0].metadata).toEqual({ role: 'v1' });
  });
});

// ======================================================================
// Phase 7: User Story 5 — Migration Summary Report
// ======================================================================

describe('US5: Migration summary report', () => {
  it('T035: reports correct counts for all-new migration', () => {
    const entities = {};
    for (let i = 0; i < 20; i++) {
      entities[`e${i}`] = { id: `e${i}`, label: `Entity ${i}`, type: 'concept' };
    }
    const relations = [];
    for (let i = 0; i < 15; i++) {
      relations.push({ from: `e${i}`, to: `e${i + 1}`, rel: 'related_to', attrs: {} });
    }
    const data = { entities, relations };
    const filePath = createKgStoreFile(data);

    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });
    expect(stats.entities.migrated).toBe(20);
    expect(stats.entities.skipped).toBe(0);
    expect(stats.entities.errors).toBe(0);
    expect(stats.relations.migrated).toBe(15);
    expect(stats.relations.skipped).toBe(0);
    expect(stats.relations.errors).toBe(0);
  });

  it('T036: reports correct skipped and error counts', () => {
    // Pre-create 5 entities that will be skipped
    for (let i = 0; i < 5; i++) {
      createEntity({ name: `Entity ${i}`, type: 'concept' });
    }

    const entities = {};
    for (let i = 0; i < 20; i++) {
      entities[`e${i}`] = { id: `e${i}`, label: `Entity ${i}`, type: 'concept' };
    }
    const relations = [
      { from: 'e5', to: 'e6', rel: 'related_to', attrs: {} },
      { from: 'e7', to: 'missing1', rel: 'related_to', attrs: {} },
      { from: 'missing2', to: 'e8', rel: 'related_to', attrs: {} },
    ];
    const data = { entities, relations };
    const filePath = createKgStoreFile(data);

    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });
    expect(stats.entities.migrated).toBe(15);
    expect(stats.entities.skipped).toBe(5);
    expect(stats.relations.migrated).toBe(1);
    expect(stats.relations.errors).toBe(2);
  });

  it('T037: file not found produces error', () => {
    expect(() => {
      migrateKnowledgeGraph('nonexistent.json', ':memory:', { silent: true });
    }).toThrow(/File not found/);
  });
});

// ======================================================================
// Phase 8: Polish — Edge Cases
// ======================================================================

describe('Edge cases', () => {
  it('T040a: empty kg-store.json succeeds with 0 counts', () => {
    const filePath = createKgStoreFile({});
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.entities.migrated).toBe(0);
    expect(stats.relations.migrated).toBe(0);
  });

  it('T040b: entities-only (no relations key) succeeds', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human' },
      },
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.entities.migrated).toBe(1);
    expect(stats.relations.migrated).toBe(0);
  });

  it('T040c: entity with attrs: null treated as empty', () => {
    const data = {
      entities: {
        alice: { id: 'alice', label: 'Alice', type: 'human', attrs: null },
      },
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.entities.migrated).toBe(1);
    const entities = getAllEntities();
    expect(entities[0].metadata).toEqual({});
  });

  it('T040d: malformed JSON produces parse error', () => {
    const filePath = join(tmpDir, 'bad.json');
    writeFileSync(filePath, '{ invalid json }}}');

    expect(() => {
      migrateKnowledgeGraph(filePath, ':memory:', { silent: true });
    }).toThrow(/Failed to parse/);
  });

  it('entity with missing label is skipped with error', () => {
    const data = {
      entities: {
        nolabel: { id: 'nolabel', type: 'concept' },
      },
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.entities.errors).toBe(1);
    expect(stats.entities.migrated).toBe(0);
    expect(getAllEntities()).toHaveLength(0);
  });

  it('entity with missing type is skipped with error', () => {
    const data = {
      entities: {
        notype: { id: 'notype', label: 'No Type' },
      },
    };
    const filePath = createKgStoreFile(data);
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });

    expect(stats.entities.errors).toBe(1);
    expect(stats.entities.migrated).toBe(0);
    expect(getAllEntities()).toHaveLength(0);
  });
});

// ======================================================================
// buildMetadata unit tests
// ======================================================================

describe('buildMetadata', () => {
  it('includes category, tags, parent, confidence, wikiPage when present', () => {
    const result = buildMetadata({
      category: 'personal',
      tags: ['owner'],
      parent: 'family',
      confidence: 0.95,
      wikiPage: 'people/damien',
    });
    expect(result).toEqual({
      category: 'personal',
      tags: ['owner'],
      parent: 'family',
      confidence: 0.95,
      wikiPage: 'people/damien',
    });
  });

  it('omits null/empty/absent fields', () => {
    const result = buildMetadata({
      category: null,
      tags: [],
      parent: '',
      attrs: null,
    });
    expect(result).toEqual({});
  });

  it('flattens attrs at top level', () => {
    const result = buildMetadata({
      attrs: { role: 'founder', team: 'engineering' },
    });
    expect(result).toEqual({ role: 'founder', team: 'engineering' });
  });

  it('skips empty values in attrs', () => {
    const result = buildMetadata({
      attrs: { role: 'founder', empty: '', nullVal: null, emptyArr: [], emptyObj: {} },
    });
    expect(result).toEqual({ role: 'founder' });
  });
});

// ======================================================================
// T044: Performance test
// ======================================================================

describe('Performance', () => {
  it('T044: migrates 1,000 entities and 5,000 relations within 10 seconds', () => {
    const entities = {};
    for (let i = 0; i < 1000; i++) {
      entities[`e${i}`] = {
        id: `e${i}`,
        label: `Entity ${i}`,
        type: i % 2 === 0 ? 'concept' : 'human',
        attrs: { index: i },
      };
    }

    const relations = [];
    for (let i = 0; i < 5000; i++) {
      const from = `e${i % 1000}`;
      const to = `e${(i + 1) % 1000}`;
      if (from !== to) {
        relations.push({ from, to, rel: `rel_${i % 10}`, attrs: { idx: i } });
      }
    }

    const data = { entities, relations };
    const filePath = createKgStoreFile(data);

    const start = performance.now();
    const stats = migrateKnowledgeGraph(filePath, ':memory:', { silent: true });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10_000);
    expect(stats.entities.migrated).toBe(1000);
    expect(stats.relations.migrated + stats.relations.skipped).toBeGreaterThan(0);
  }, 30_000);
});
