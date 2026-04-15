# Feature Specification: KG Migration Tool

**Feature Branch**: `006-kg-migration`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "KG Migration tool: migrate existing kg-store.json Knowledge Graph to SQLite via a one-shot migration script (kg-migrate.mjs)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Migrate all entities from legacy KG to SQLite (Priority: P1)

A user has an existing `kg-store.json` file from the OpenClaw knowledge-graph-skill and wants to import all entities into the SQLite knowledge graph. They run `node src/kg-migrate.mjs kg-store.json` and every entity from the JSON file is created in the `entities` table via `createEntity()`, with field mappings applied: `label` becomes `name`, `type` is preserved, and remaining fields (`category`, `tags`, `parent`, `wikiPage`, `confidence`, `attrs`) are packed into the `metadata` JSON object.

**Why this priority**: Entities are the foundation of the knowledge graph. Without entities, relations cannot be migrated (they reference entity IDs). This is the minimum viable migration.

**Independent Test**: Can be fully tested by creating a `kg-store.json` with sample entities, running the migration, and verifying each entity exists in SQLite with correct `name`, `type`, and `metadata` fields. Delivers value even without relations.

**Acceptance Scenarios**:

1. **Given** a `kg-store.json` with 5 entities of various types (human, project, concept), **When** the user runs `node src/kg-migrate.mjs kg-store.json`, **Then** the SQLite `entities` table contains 5 new rows with `name` matching each legacy `label` and `type` matching each legacy `type`.
2. **Given** a legacy entity with `label: "Damien"`, `type: "human"`, `category: "personal"`, `tags: ["owner"]`, `parent: "family"`, `confidence: 0.95`, `wikiPage: "people/damien"`, `attrs: { role: "founder" }`, **When** migrated, **Then** the resulting SQLite entity has `name = "Damien"`, `type = "human"`, and `metadata` containing `{ category: "personal", tags: ["owner"], parent: "family", confidence: 0.95, wikiPage: "people/damien", role: "founder" }`.
3. **Given** a legacy entity with empty `attrs: {}` and no `category`, `tags`, `parent`, or `wikiPage`, **When** migrated, **Then** the `metadata` JSON omits those absent fields (contains only fields that had values).
4. **Given** a legacy entity with `type: "credential"` (a valid legacy type), **When** migrated, **Then** the entity is created with `type = "credential"` — all 19 legacy entity types are accepted.

---

### User Story 2 - Migrate all relations from legacy KG to SQLite (Priority: P2)

After entities are migrated, the user expects all relations from `kg-store.json` to appear in the SQLite `relations` table. The migration script maps legacy string-based entity IDs to the new SQLite integer IDs and creates each relation via `createRelation()`.

**Why this priority**: Relations depend on entities existing first (P1). They complete the knowledge graph structure but cannot be migrated independently.

**Independent Test**: Can be tested by migrating entities first, then verifying relations are created with correct `source_id`, `target_id`, `type`, and `metadata`. The legacy string IDs must resolve to the correct SQLite integer IDs.

**Acceptance Scenarios**:

1. **Given** a `kg-store.json` with entities "alice" and "bob" and a relation `{ from: "alice", to: "bob", rel: "knows", attrs: {} }`, **When** migrated, **Then** the SQLite `relations` table contains a row with `source_id` matching Alice's new integer ID, `target_id` matching Bob's new integer ID, `type = "knows"`, and `metadata = {}`.
2. **Given** a relation with `attrs: { since: "2024" }`, **When** migrated, **Then** the relation's `metadata` contains `{ since: "2024" }`.
3. **Given** a relation referencing a `from` or `to` entity ID that doesn't exist in the entities map, **When** migrated, **Then** the relation is skipped (not inserted), the error is logged, and the migration continues.
4. **Given** all 18 legacy relation types (owns, uses, runs_on, etc.), **When** migrated, **Then** all are accepted and stored with their original `rel` value as `type`.

---

### User Story 3 - Dry-run mode validates without writing (Priority: P3)

A user wants to preview the migration before committing changes. They run `node src/kg-migrate.mjs --dry-run kg-store.json` and see a full report of what would be migrated, including counts, any warnings, and any entities/relations that would be skipped — but no data is written to the database.

**Why this priority**: Dry-run is a safety mechanism. It is important for confidence but not strictly required for the migration to function.

**Independent Test**: Can be tested by running with `--dry-run`, then verifying the database is unchanged (entity and relation counts remain the same as before the run) while the console output shows the expected migration summary.

**Acceptance Scenarios**:

1. **Given** a valid `kg-store.json` with 10 entities and 5 relations, **When** the user runs `node src/kg-migrate.mjs --dry-run kg-store.json`, **Then** the output shows "Dry run: 10 entities would be migrated, 5 relations would be migrated" and the SQLite database has no new rows.
2. **Given** `--dry-run` mode, **When** the script encounters an entity that already exists (by name+type), **Then** the output reports it as "would be skipped" and counts it in the skipped total.
3. **Given** `--dry-run` mode, **When** the script encounters a relation with a missing entity reference, **Then** the output reports it as "would fail" with the reason and counts it in the errors total.

---

### User Story 4 - Idempotent re-runs skip existing entities (Priority: P4)

A user runs the migration a second time (intentionally or accidentally). Entities that already exist in SQLite (matched by `name` + `type`) are skipped without error. New entities not yet in the database are added. This makes the migration safe to re-run.

**Why this priority**: Idempotency is important for operational safety but is secondary to the core migration flow.

**Independent Test**: Can be tested by running migration once, then running again with the same file plus a few new entities, verifying only the new ones are added and the skipped count matches the previously-migrated entities.

**Acceptance Scenarios**:

1. **Given** the migration was already run and 10 entities exist in SQLite, **When** the user runs the migration again with the same `kg-store.json`, **Then** 0 new entities are created, 10 are reported as "skipped (already exists)", and no errors occur.
2. **Given** the first migration imported 10 entities, and the `kg-store.json` now has 12 entities (2 new), **When** the user re-runs migration, **Then** 2 new entities are created, 10 are skipped, and the stats reflect this.
3. **Given** an entity was previously migrated, **When** re-running, **Then** the existing entity's data is NOT overwritten (the migration does not update existing records).

---

### User Story 5 - Migration reports stats at completion (Priority: P5)

At the end of the migration (both normal and dry-run), the script prints a summary report showing entities migrated, entities skipped, relations migrated, relations skipped, and errors encountered.

**Why this priority**: Reporting is a usability feature that helps users verify the migration succeeded, but the migration functions without it.

**Independent Test**: Can be tested by running migration and verifying the stdout output contains the expected counts matching the actual database state changes.

**Acceptance Scenarios**:

1. **Given** a `kg-store.json` with 20 entities and 15 relations where all are new, **When** migration completes, **Then** the output includes: "Entities: 20 migrated, 0 skipped, 0 errors" and "Relations: 15 migrated, 0 skipped, 0 errors".
2. **Given** 5 entities already exist and 2 relations reference missing entities, **When** migration completes, **Then** the output includes: "Entities: 15 migrated, 5 skipped, 0 errors" and "Relations: 13 migrated, 0 skipped, 2 errors".
3. **Given** the `kg-store.json` file does not exist at the given path, **When** the user runs the migration, **Then** the script exits with an error message "File not found: <path>" and exit code 1.

---

### Edge Cases

- What happens when `kg-store.json` is empty (`{}`)? The script should complete successfully with "0 entities migrated, 0 relations migrated".
- What happens when `kg-store.json` has `entities` but no `relations` key? The script should migrate entities and report 0 relations (treat missing `relations` as an empty array).
- What happens when a legacy entity has no `label` field? The script should skip that entity and count it as an error, since `name` is required by `createEntity`.
- What happens when a legacy entity has no `type` field? The script should skip that entity and count it as an error.
- What happens when a relation has `from === to` (self-referential)? The script should skip it since `createRelation` rejects `source_id === target_id`, and count it as an error.
- What happens when `kg-store.json` contains malformed JSON? The script should exit with a clear parse error message.
- What happens when the database file doesn't exist? The script should initialize it via `initDatabase()` before migration.
- What happens when a legacy entity's `attrs` is `null` instead of `{}`? The script should treat it as empty and continue.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `kg-migrate.mjs` CLI script in the `src/` directory that reads a `kg-store.json` file and imports its contents into the SQLite database.
- **FR-002**: The script MUST accept a file path as a positional CLI argument; if omitted, it MUST default to `kg-store.json` in the current working directory.
- **FR-003**: The script MUST accept a `--dry-run` flag that validates and reports what would happen without writing to the database.
- **FR-004**: The script MUST map legacy entity fields: `label` to `name`, `type` preserved as-is, and `attrs`, `category`, `tags`, `parent`, `wikiPage`, `confidence` packed into the `metadata` JSON object.
- **FR-005**: When packing `attrs` into `metadata`, the script MUST merge `attrs` fields at the top level of `metadata` (not nest them under an "attrs" key), so `attrs: { role: "founder" }` becomes `metadata.role = "founder"`.
- **FR-006**: The script MUST skip `metadata` fields that are absent, `null`, or empty (empty string, empty array, empty object) in the legacy entity.
- **FR-007**: The script MUST maintain an in-memory ID mapping (legacy string ID to SQLite integer ID) built during entity migration and used during relation migration.
- **FR-008**: The script MUST map legacy relation fields: `from` to `source_id` (via ID mapping), `to` to `target_id` (via ID mapping), `rel` to `type`, `attrs` to `metadata`.
- **FR-009**: The script MUST use `createEntity()` and `createRelation()` from `db.mjs` to insert data.
- **FR-010**: The script MUST detect duplicate entities by querying for existing entities with the same `name` AND `type` before insertion, and skip them if found.
- **FR-011**: The script MUST NOT update existing entities when duplicates are detected (insert-or-skip, never update).
- **FR-012**: The script MUST continue processing when individual entities or relations fail, logging the error and incrementing the error counter.
- **FR-013**: The script MUST print a summary report to stdout on completion showing: entities migrated, entities skipped, relations migrated, relations skipped, and errors.
- **FR-014**: The script MUST exit with code 0 on success (even if some items were skipped) and code 1 on fatal errors (file not found, parse error, database init failure).
- **FR-015**: The script MUST use ES module syntax (`import`/`export`) consistent with the project.
- **FR-016**: The script MUST initialize the database via `initDatabase()` before performing any operations.

### Key Entities

- **Legacy Entity** (in `kg-store.json`): Identified by a string ID, has `label`, `type`, `parent`, `category`, `tags`, `attrs`, `confidence`, `wikiPage`, `created`, `updated`. Represents a node in the legacy knowledge graph.
- **Legacy Relation** (in `kg-store.json`): A directed edge with `from` (source entity string ID), `to` (target entity string ID), `rel` (relationship type string), and `attrs` (metadata object).
- **SQLite Entity** (in `jarvis.db`): Auto-increment integer `id`, `name`, `type`, `metadata` (JSON), `created_at`, `updated_at`. The target format for migrated entities.
- **SQLite Relation** (in `jarvis.db`): Auto-increment integer `id`, `source_id`, `target_id`, `type`, `metadata` (JSON), `created_at`. The target format for migrated relations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of legacy entities with valid `label` and `type` fields are migrated to SQLite — verified by comparing entity counts before and after migration.
- **SC-002**: 100% of legacy relations where both `from` and `to` entities exist are migrated to SQLite — verified by comparing relation counts.
- **SC-003**: Dry-run mode produces identical counts to a real migration but leaves the database unchanged — verified by running dry-run, checking database state, then running actual migration and comparing stats.
- **SC-004**: Re-running the migration on an already-migrated database produces 0 new entities and 0 errors — verified by running migration twice and checking the second run's stats.
- **SC-005**: Migration completes within 10 seconds for a knowledge graph containing up to 1,000 entities and 5,000 relations.
- **SC-006**: All migrated entity metadata faithfully preserves every non-empty field from the legacy format — verified by spot-checking 5 entities with various field combinations.

## Assumptions

- The `kg-store.json` file fits in memory (typical knowledge graphs for personal use are under 10 MB).
- The SQLite database (`jarvis.db`) is already initialized with the correct schema (entities, relations tables exist) or `initDatabase()` will create it.
- The `createEntity` and `createRelation` functions in `db.mjs` handle FTS5 indexing and any triggers automatically; the migration script does not need to manage search indexing.
- Legacy entity `created` and `updated` timestamps are not migrated to SQLite columns (SQLite auto-generates `created_at` and `updated_at`). They can optionally be stored in `metadata` if present.
- The legacy `id` field values are not preserved in SQLite (SQLite uses auto-increment integers); the migration script only uses legacy IDs for relation mapping.
- Duplicate detection uses exact `name` + `type` match (case-sensitive).
- The migration script is a one-shot tool, not a continuous sync mechanism.
- Entity types from the legacy system (19 types) are not validated against a whitelist — any string type is accepted.
