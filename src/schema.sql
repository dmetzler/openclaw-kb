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

CREATE TABLE health_metrics (
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

CREATE INDEX idx_health_metrics_time ON health_metrics(recorded_at);
CREATE INDEX idx_health_metrics_source ON health_metrics(source_id);
CREATE INDEX idx_health_metrics_type ON health_metrics(metric_type);

CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  duration_minutes REAL,
  intensity TEXT,
  metadata TEXT DEFAULT '{}',
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES data_sources(id)
);

CREATE INDEX idx_activities_time ON activities(recorded_at);
CREATE INDEX idx_activities_source ON activities(source_id);
CREATE INDEX idx_activities_type ON activities(activity_type);

CREATE TABLE grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  score REAL NOT NULL,
  scale TEXT,
  metadata TEXT DEFAULT '{}',
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES data_sources(id)
);

CREATE INDEX idx_grades_time ON grades(recorded_at);
CREATE INDEX idx_grades_source ON grades(source_id);
CREATE INDEX idx_grades_subject ON grades(subject);

CREATE TABLE meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  meal_type TEXT NOT NULL,
  items TEXT NOT NULL,
  nutrition TEXT DEFAULT '{}',
  metadata TEXT DEFAULT '{}',
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES data_sources(id)
);

CREATE INDEX idx_meals_time ON meals(recorded_at);
CREATE INDEX idx_meals_source ON meals(source_id);
CREATE INDEX idx_meals_type ON meals(meal_type);

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

CREATE TRIGGER health_metrics_search_index_insert
AFTER INSERT ON health_metrics
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.metric_type, NEW.unit || ' ' || NEW.value, 'health_metrics', NEW.id);
END;

CREATE TRIGGER health_metrics_search_index_update
AFTER UPDATE ON health_metrics
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'health_metrics' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.metric_type, NEW.unit || ' ' || NEW.value, 'health_metrics', NEW.id);
END;

CREATE TRIGGER health_metrics_search_index_delete
AFTER DELETE ON health_metrics
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'health_metrics' AND source_id = OLD.id;
END;

CREATE TRIGGER activities_search_index_insert
AFTER INSERT ON activities
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.activity_type, NEW.metadata, 'activities', NEW.id);
END;

CREATE TRIGGER activities_search_index_update
AFTER UPDATE ON activities
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'activities' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.activity_type, NEW.metadata, 'activities', NEW.id);
END;

CREATE TRIGGER activities_search_index_delete
AFTER DELETE ON activities
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'activities' AND source_id = OLD.id;
END;

CREATE TRIGGER grades_search_index_insert
AFTER INSERT ON grades
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.subject, NEW.score || ' ' || COALESCE(NEW.scale, ''), 'grades', NEW.id);
END;

CREATE TRIGGER grades_search_index_update
AFTER UPDATE ON grades
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'grades' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.subject, NEW.score || ' ' || COALESCE(NEW.scale, ''), 'grades', NEW.id);
END;

CREATE TRIGGER grades_search_index_delete
AFTER DELETE ON grades
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'grades' AND source_id = OLD.id;
END;

CREATE TRIGGER meals_search_index_insert
AFTER INSERT ON meals
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.meal_type, NEW.items, 'meals', NEW.id);
END;

CREATE TRIGGER meals_search_index_update
AFTER UPDATE ON meals
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'meals' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.meal_type, NEW.items, 'meals', NEW.id);
END;

CREATE TRIGGER meals_search_index_delete
AFTER DELETE ON meals
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'meals' AND source_id = OLD.id;
END;

CREATE VIRTUAL TABLE vec_embeddings USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[384] distance_metric=cosine
);

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
