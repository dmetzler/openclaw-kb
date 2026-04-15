CREATE TABLE entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(name) > 0),
  type TEXT NOT NULL CHECK(length(type) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_name ON entities(name);

CREATE TRIGGER entities_updated_at
AFTER UPDATE ON entities
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE entities
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE TABLE relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  target_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(length(type) > 0),
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES entities(id) ON DELETE CASCADE,
  CHECK(source_id != target_id),
  UNIQUE(source_id, target_id, type)
);

CREATE INDEX idx_relations_source ON relations(source_id);
CREATE INDEX idx_relations_target ON relations(target_id);
CREATE INDEX idx_relations_type ON relations(type);

CREATE TABLE data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  config TEXT DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER data_sources_updated_at
AFTER UPDATE ON data_sources
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE data_sources
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

CREATE INDEX idx_data_sources_active ON data_sources(is_active);

CREATE TABLE data_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  record_type TEXT NOT NULL CHECK(length(record_type) > 0),
  data TEXT NOT NULL DEFAULT '{}',
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES data_sources(id)
);

CREATE INDEX idx_data_records_type_time ON data_records(record_type, recorded_at);

CREATE VIRTUAL TABLE search_index USING fts5(
  name,
  content_text,
  source_table,
  source_id UNINDEXED,
  prefix='2 3'
);

CREATE TRIGGER entities_search_index_insert
AFTER INSERT ON entities
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.name, NEW.metadata, 'entities', NEW.id);
END;

CREATE TRIGGER entities_search_index_update
AFTER UPDATE ON entities
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'entities' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.name, NEW.metadata, 'entities', NEW.id);
END;

CREATE TRIGGER entities_search_index_delete
AFTER DELETE ON entities
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'entities' AND source_id = OLD.id;
END;

CREATE TRIGGER data_records_search_index_insert
AFTER INSERT ON data_records
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.record_type, NEW.data, 'data_records', NEW.id);
END;

CREATE TRIGGER data_records_search_index_update
AFTER UPDATE ON data_records
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'data_records' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.record_type, NEW.data, 'data_records', NEW.id);
END;

CREATE TRIGGER data_records_search_index_delete
AFTER DELETE ON data_records
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'data_records' AND source_id = OLD.id;
END;

CREATE VIRTUAL TABLE vec_embeddings USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[768] distance_metric=cosine
);

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
