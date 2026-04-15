-- Migration 001: Generic Data Records
-- Replaces 4 legacy tables (health_metrics, activities, grades, meals)
-- with a single generic data_records table.

-- Step 1: Create the new data_records table
CREATE TABLE IF NOT EXISTS data_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  record_type TEXT NOT NULL CHECK(length(record_type) > 0),
  data TEXT NOT NULL DEFAULT '{}',
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES data_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_data_records_type_time ON data_records(record_type, recorded_at);

-- Step 2: Migrate data from legacy tables
-- On fresh databases these tables won't exist; the migration runner
-- strips these INSERTs when legacy tables are absent.

INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'health_metric',
  json_object('metric_type', metric_type, 'value', value, 'unit', unit, 'metadata', json(metadata)),
  recorded_at, created_at
FROM health_metrics;

INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'activity',
  json_object('activity_type', activity_type, 'duration_minutes', duration_minutes, 'intensity', intensity, 'metadata', json(metadata)),
  recorded_at, created_at
FROM activities;

INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'grade',
  json_object('subject', subject, 'score', score, 'scale', scale, 'metadata', json(metadata)),
  recorded_at, created_at
FROM grades;

INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'meal',
  json_object('meal_type', meal_type, 'items', json(items), 'nutrition', json(nutrition), 'metadata', json(metadata)),
  recorded_at, created_at
FROM meals;

-- Step 3: Drop legacy FTS5 triggers
DROP TRIGGER IF EXISTS health_metrics_search_index_insert;
DROP TRIGGER IF EXISTS health_metrics_search_index_update;
DROP TRIGGER IF EXISTS health_metrics_search_index_delete;
DROP TRIGGER IF EXISTS activities_search_index_insert;
DROP TRIGGER IF EXISTS activities_search_index_update;
DROP TRIGGER IF EXISTS activities_search_index_delete;
DROP TRIGGER IF EXISTS grades_search_index_insert;
DROP TRIGGER IF EXISTS grades_search_index_update;
DROP TRIGGER IF EXISTS grades_search_index_delete;
DROP TRIGGER IF EXISTS meals_search_index_insert;
DROP TRIGGER IF EXISTS meals_search_index_update;
DROP TRIGGER IF EXISTS meals_search_index_delete;

-- Step 4: Drop legacy tables
DROP TABLE IF EXISTS health_metrics;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS meals;

-- Step 5: Create new FTS5 triggers for data_records
CREATE TRIGGER IF NOT EXISTS data_records_search_index_insert
AFTER INSERT ON data_records
FOR EACH ROW
BEGIN
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.record_type, NEW.data, 'data_records', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS data_records_search_index_update
AFTER UPDATE ON data_records
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'data_records' AND source_id = OLD.id;
  INSERT INTO search_index(name, content_text, source_table, source_id)
  VALUES (NEW.record_type, NEW.data, 'data_records', NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS data_records_search_index_delete
AFTER DELETE ON data_records
FOR EACH ROW
BEGIN
  DELETE FROM search_index WHERE source_table = 'data_records' AND source_id = OLD.id;
END;
