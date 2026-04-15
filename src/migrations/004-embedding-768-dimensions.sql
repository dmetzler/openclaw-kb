-- Migration 004: Update vec_embeddings to 768 dimensions
-- The nomic-embed-text model produces 768-dimensional embeddings,
-- but vec_embeddings was created with float[384]. Drop and recreate
-- with the correct dimensions. No production data to preserve.

DROP TABLE IF EXISTS vec_embeddings;

CREATE VIRTUAL TABLE vec_embeddings USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[768] distance_metric=cosine
);
