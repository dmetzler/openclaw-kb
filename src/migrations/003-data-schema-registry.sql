-- Migration 003: Data Schema Registry
-- Adds a data_schemas table for storing JSON Schema definitions
-- that describe the expected format for each record_type.

CREATE TABLE IF NOT EXISTS data_schemas (
  record_type TEXT PRIMARY KEY CHECK(length(record_type) > 0),
  label TEXT NOT NULL CHECK(length(label) > 0),
  description TEXT NOT NULL DEFAULT '',
  json_schema TEXT NOT NULL DEFAULT '{}',
  example TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS data_schemas_updated_at
AFTER UPDATE ON data_schemas
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE data_schemas
  SET updated_at = datetime('now')
  WHERE record_type = NEW.record_type;
END;
