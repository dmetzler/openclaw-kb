# Research: KG Migration Tool

**Feature**: 006-kg-migration | **Date**: 2026-04-14

## Research Tasks

### R1: Duplicate Detection Strategy

**Question**: How should the migration script detect entities that already exist in SQLite (for idempotent re-runs)?

**Decision**: Pre-load all existing entities via `getAllEntities()` into an in-memory Map keyed by `"${name}\0${type}"`, then check this Map before each insert.

**Rationale**: 
- `db.mjs` has no built-in "find by name+type" function.
- `search()` uses FTS5 which does fuzzy text matching, not exact name+type equality — wrong semantics for duplicate detection.
- `getAllEntities()` returns all entities with deserialized metadata. For the target scale (<1,000 entities), loading all into memory is trivial (<1 MB).
- A Map lookup is O(1) per entity vs. O(N) for array `.find()`.

**Alternatives considered**:
- *Raw SQL query per entity*: Would require exposing the db handle or adding a new `db.mjs` export. Violates the principle of using the existing API surface. Also creates N+1 query pattern.
- *Using `search()` with FTS5*: Returns fuzzy matches with snippets and ranking — not suitable for exact equality checks. Would produce false positives/negatives.
- *Adding a new `findEntityByNameType()` to db.mjs*: Clean but out-of-scope for a migration script. Could be added later if needed elsewhere.

### R2: Relation Duplicate Handling

**Question**: How should the migration handle duplicate relations (same source_id + target_id + type)?

**Decision**: Use try/catch around `createRelation()`. The UNIQUE constraint on `(source_id, target_id, type)` will throw "Duplicate relation" error, which we catch, log as "skipped", and continue.

**Rationale**:
- `createRelation()` already validates and throws on duplicates with a clear error message.
- The UNIQUE constraint in the schema makes this check atomic and race-condition-free.
- For idempotent re-runs, this is the correct behavior — skip existing relations without error.

**Alternatives considered**:
- *Pre-loading all relations and checking in memory*: Unnecessary complexity. Relations have 3-field composite keys; the DB constraint handles this perfectly.
- *Using `importRelation()` instead*: This bypasses all validation (FK checks, self-loop check, duplicate check). The migration script should use the validated `createRelation()` to ensure data integrity.

### R3: Transaction Strategy

**Question**: Should the entire migration run in a single transaction, or should entities and relations be committed separately?

**Decision**: Wrap the entire migration (entities + relations) in a single `runTransaction()` call. On any fatal error, the entire migration rolls back.

**Rationale**:
- Atomicity: either the full migration succeeds or nothing changes. This prevents half-migrated states.
- Performance: SQLite is significantly faster with bulk inserts inside a single transaction (avoids per-statement fsync).
- The spec requires continuing on individual entity/relation errors (FR-012), so errors within the transaction are caught per-item and counted, not propagated.
- `runTransaction()` is the established pattern in the project (used by `kb-import.mjs`).

**Alternatives considered**:
- *No transaction*: Risk of partial migration on crash. Also slower due to implicit per-statement transactions.
- *Separate entity/relation transactions*: Entities could commit while relations fail. Leaves orphaned entities with no relations. Harder to reason about.

### R4: Dry-Run Implementation

**Question**: How should `--dry-run` mode work without writing to the database?

**Decision**: Run the full parsing and validation logic but skip all `createEntity()`/`createRelation()` calls. Build the ID mapping optimistically (assign fake sequential IDs) to validate relation references. Report counts as "would be migrated."

**Rationale**:
- The spec requires dry-run to produce identical counts to a real migration (SC-003).
- Optimistic ID mapping allows validating that relation `from`/`to` references resolve correctly.
- No database writes means no transaction needed, no rollback complexity.
- The entity duplicate check still works: load existing entities from DB, check against them.

**Alternatives considered**:
- *Run in a transaction and rollback*: Would produce correct results but is wasteful — writes data only to discard it. Also risks subtle side effects if schema triggers fire.
- *Parse-only without ID mapping*: Cannot validate relation references. Would miss errors that only appear during relation migration.

### R5: Field Flattening — attrs Merge Strategy

**Question**: How should legacy `attrs` be merged with other metadata fields?

**Decision**: Build metadata object with optional fields first (`category`, `tags`, `parent`, `confidence`, `wikiPage`), then spread `attrs` on top. Skip any field that is `null`, `undefined`, empty string `""`, empty array `[]`, or empty object `{}`.

**Rationale**:
- FR-005 requires `attrs` to merge at top level (not nested under an "attrs" key).
- FR-006 requires omitting absent/empty fields.
- Spreading `attrs` last means `attrs` fields take precedence if there's a naming conflict with other metadata fields. This is a reasonable default since `attrs` was the explicit user-defined metadata in the legacy system.

**Alternatives considered**:
- *Nesting attrs under metadata.attrs*: Explicitly forbidden by FR-005.
- *Merging other fields on top of attrs*: Would let `category` or `tags` override `attrs.category` or `attrs.tags`. Unlikely in practice but less principled than prioritizing explicit user data.

### R6: CLI Pattern and Exit Codes

**Question**: What CLI conventions should the migration script follow?

**Decision**: Follow the exact pattern from `kb-import.mjs`:
- Manual `process.argv` parsing (no library)
- `isMainModule` guard for CLI entry point
- Export a programmatic function (`migrateKnowledgeGraph()`) for test use
- `--dry-run` flag, `--db <path>` option, positional file argument
- Exit codes: 0 (success), 1 (missing arg), 2 (file not found), 3 (JSON parse error)
- stdout for progress/results, stderr for errors

**Rationale**:
- Consistency with `kb-import.mjs` and `kb-export.mjs` patterns (Constitution III: UX Consistency).
- No argument-parsing library needed — the project uses manual parsing everywhere.
- Programmatic export enables integration testing without spawning child processes.

**Alternatives considered**:
- *Using a CLI framework (yargs, commander)*: The project has zero CLI dependencies. Adding one for a 3-argument script violates the "justify new dependencies" principle.

### R7: Self-Referential Relations

**Question**: How should the script handle relations where `from === to`?

**Decision**: Skip the relation and count it as an error. Log a warning with the entity ID.

**Rationale**:
- `createRelation()` already throws when `source_id === target_id` (CHECK constraint in schema).
- The spec explicitly lists this as an edge case that should be skipped and counted as an error.
- Even if the `from` and `to` string IDs are different but map to the same SQLite ID (theoretically impossible since each legacy entity has a unique string ID), the DB constraint catches it.

**Alternatives considered**:
- *Allow self-referential relations*: Blocked by schema CHECK constraint. Would require schema change.
- *Silently skip without counting*: Spec requires counting as an error.
