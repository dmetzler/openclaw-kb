import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  traverseGraph,
  search,
  upsertEmbedding,
  findNearestVectors,
  createDataSource,
  insertRecord,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';

/*
 * Performance benchmark tests — verify non-functional requirements:
 *   SC-002: Recursive traversal <500ms for 1,000+ entities / 5,000+ relations
 *   SC-003: Full-text search <100ms for 10,000+ indexed records
 *   SC-004: Vector KNN search <200ms for 10,000+ embeddings
 *
 * These tests seed large datasets and measure query execution time.
 * Data seeding happens once in beforeAll to keep test runtime reasonable.
 */

describe('Performance Benchmarks', () => {
  beforeAll(() => {
    initDatabase(':memory:');
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('SC-002: Graph traversal', () => {
    it('traverses 1,000+ entities / 5,000+ relations in <500ms', () => {
      // Seed 1,000 entities
      const entityIds = [];
      for (let i = 0; i < 1000; i++) {
        const entity = createEntity({
          name: `node-${i}`,
          type: 'benchmark',
          metadata: { index: i },
        });
        entityIds.push(entity.id);
      }

      // Seed 5,000 relations (each entity connects to ~5 others)
      let relationCount = 0;
      for (let i = 0; i < entityIds.length && relationCount < 5000; i++) {
        for (let j = 1; j <= 5 && relationCount < 5000; j++) {
          const targetIdx = (i + j) % entityIds.length;
          if (targetIdx !== i) {
            try {
              createRelation({
                source_id: entityIds[i],
                target_id: entityIds[targetIdx],
                type: 'bench_link',
              });
              relationCount++;
            } catch {
              // Skip duplicates
            }
          }
        }
      }

      expect(entityIds.length).toBeGreaterThanOrEqual(1000);
      expect(relationCount).toBeGreaterThanOrEqual(5000);

      // Measure traversal time
      const start = performance.now();
      const result = traverseGraph(entityIds[0], 3);
      const elapsed = performance.now() - start;

      expect(result.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('SC-003: Full-text search', () => {
    it('searches 10,000+ indexed records in <100ms', () => {
      // Create a data source for health metrics
      const source = createDataSource({
        name: 'bench-source',
        type: 'import',
      });

       // Seed 10,000 health metric records (these get FTS-indexed via triggers)
       for (let i = 0; i < 10000; i++) {
         insertRecord('health_metric', {
           source_id: source.id,
           recorded_at: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T12:00:00Z`,
           metric_type: `metric_${i % 50}`,
           value: Math.random() * 100,
           unit: 'units',
           metadata: { batch: Math.floor(i / 100) },
         });
       }

      // Also count entities from the graph traversal test above
      // Total indexed records should be 1000 entities + 10000 health metrics

      // Measure search time
      const start = performance.now();
      const results = search('metric_25', { limit: 50 });
      const elapsed = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('SC-004: Vector KNN search', () => {
    it('finds nearest vectors among 10,000+ embeddings in <200ms', () => {
      // We already have 1000 entities from the graph test.
      // Create additional entities for vector embeddings to reach 10,000+.
      const vectorEntityIds = [];

      // Use existing 1000 entities + create 9000 more
      for (let i = 0; i < 9000; i++) {
        const entity = createEntity({
          name: `vec-entity-${i}`,
          type: 'vector-bench',
        });
        vectorEntityIds.push(entity.id);
      }

      // Upsert embeddings for all 10,000 entities
      // First, collect all entity IDs (1000 from graph + 9000 new)
      const allVecIds = [];
      // Get the first 1000 entity IDs (from graph test)
      for (let id = 1; id <= 1000; id++) {
        allVecIds.push(id);
      }
      allVecIds.push(...vectorEntityIds);

      for (const entityId of allVecIds) {
        const vec = new Float32Array(EMBEDDING_DIMENSIONS);
        for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
          vec[d] = Math.random() * 2 - 1;
        }
        upsertEmbedding(entityId, vec);
      }

      expect(allVecIds.length).toBeGreaterThanOrEqual(10000);

      // Query vector
      const queryVec = new Float32Array(EMBEDDING_DIMENSIONS);
      for (let d = 0; d < EMBEDDING_DIMENSIONS; d++) {
        queryVec[d] = Math.random() * 2 - 1;
      }

      // Measure KNN search time
      const start = performance.now();
      const results = findNearestVectors(queryVec, 10);
      const elapsed = performance.now() - start;

      expect(results.length).toBe(10);
      expect(results[0]).toHaveProperty('entity_id');
      expect(results[0]).toHaveProperty('distance');
      expect(elapsed).toBeLessThan(200);
    });
  });
});
