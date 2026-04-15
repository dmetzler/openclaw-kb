-- Migration 002: Chunks and Chunk-Level Embeddings
-- Adds chunk storage, 768-dim vector embeddings, and FTS5 indexing
-- for semantic chunking and chunk-level search.

-- Step 1: Create chunks table
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL CHECK(length(content) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_entity ON chunks(entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chunks_entity_index ON chunks(entity_id, chunk_index);

-- Step 2: Create vec_chunks virtual table (768-dim, cosine distance)
CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
  chunk_id INTEGER PRIMARY KEY,
  embedding float[768] distance_metric=cosine
);

-- Step 3: Create FTS5 triggers for chunks
CREATE TRIGGER IF NOT EXISTS chunks_search_index_insert
AFTER INSERT ON chunks
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (
    json_extract(NEW.metadata, '$.section[0]'),
    NEW.content,
    'chunks',
    NEW.id
  );
END;

CREATE TRIGGER IF NOT EXISTS chunks_search_index_update
AFTER UPDATE ON chunks
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'chunks' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (
    json_extract(NEW.metadata, '$.section[0]'),
    NEW.content,
    'chunks',
    NEW.id
  );
END;

CREATE TRIGGER IF NOT EXISTS chunks_search_index_delete
AFTER DELETE ON chunks
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'chunks' AND source_id = OLD.id;
END;
