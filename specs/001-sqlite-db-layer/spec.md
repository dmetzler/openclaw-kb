# Feature Specification: SQLite Unified Schema & Database Abstraction Layer

**Feature Branch**: `001-sqlite-db-layer`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "SQLite unified schema and database abstraction layer for the OpenClaw Knowledge Base. This is the foundation: a single SQLite file (jarvis.db) containing 3 tiers: (1) Knowledge Graph tables (entities + relations with recursive traversal), (2) Data lake tables (health_metrics, activities, grades, meals, data_sources), (3) Search infrastructure (FTS5 full-text index + vec0 vector embeddings table). Plus a db.mjs abstraction module that centralizes all SQL access so we can swap the storage engine later. Node.js with better-sqlite3. ES modules. Include schema.sql and migrations directory."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Store and Retrieve Knowledge Graph Data (Priority: P1)

A developer building the OpenClaw Knowledge Base needs to persist knowledge as a graph of interconnected entities and relationships. They create entities (people, concepts, facts, events) and define typed relationships between them (e.g., "Alice → works_at → Acme Corp"). They then query the graph by traversing relationships recursively — for example, retrieving all entities within 3 hops of a starting node — and receive a complete subgraph of connected knowledge.

**Why this priority**: The knowledge graph is the core data model that all other tiers depend on. Without structured entity-relationship storage and traversal, the knowledge base has no organizational backbone.

**Independent Test**: Can be fully tested by inserting a set of entities and relations, then running a recursive traversal query and verifying the returned subgraph matches expected connections.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** a developer creates an entity with a name, type, and metadata, **Then** the entity is persisted and can be retrieved by its identifier.
2. **Given** two existing entities, **When** a developer creates a typed relationship between them, **Then** the relationship is persisted and both the source and target entities reflect the connection.
3. **Given** a graph with entities connected through multiple relationship hops, **When** a developer queries for all entities reachable within N hops from a starting entity, **Then** the system returns the correct set of connected entities with their relationship paths.
4. **Given** an entity with associated metadata, **When** the developer updates the entity's metadata, **Then** the updated values are persisted and previous values are no longer returned.

---

### User Story 2 - Ingest and Query Structured Life Data (Priority: P2)

A developer ingests structured personal data (health metrics, daily activities, academic grades, meals) from various data sources. Each record includes a timestamp, a source identifier, and domain-specific fields. The developer can query records by time range, data source, or domain-specific filters and receive correctly ordered, complete result sets.

**Why this priority**: The data lake tables provide the raw material that feeds into the knowledge graph and search infrastructure. They must exist for any meaningful data ingestion pipeline.

**Independent Test**: Can be fully tested by inserting sample records across all data tables, then querying by time range and source, verifying correct filtering and ordering.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** a developer inserts a health metric record with a timestamp, source, and measurement values, **Then** the record is persisted and retrievable by its identifier.
2. **Given** multiple records from different data sources, **When** a developer queries for records filtered by a specific source, **Then** only records from that source are returned.
3. **Given** records spanning multiple days, **When** a developer queries for records within a specific time range, **Then** only records within that range are returned, ordered chronologically.
4. **Given** a registered data source, **When** the developer marks it as inactive, **Then** the source metadata reflects the change and existing records from that source remain accessible.

---

### User Story 3 - Full-Text Search Across Knowledge (Priority: P2)

A developer needs to search across entity names, descriptions, and data lake content using natural-language keyword queries. They enter a search term and receive ranked results drawn from multiple tables, with the most relevant matches appearing first. The search index stays in sync with the underlying data automatically — no manual re-indexing required.

**Why this priority**: Search is a primary interaction mode for any knowledge base. Users need to find information without knowing exact identifiers or navigating the graph manually.

**Independent Test**: Can be fully tested by inserting entities and data records with known text content, then running keyword searches and verifying result relevance and completeness.

**Acceptance Scenarios**:

1. **Given** entities with descriptive text in their names and metadata, **When** a developer searches for a keyword that appears in an entity's description, **Then** the matching entity is returned in the results.
2. **Given** a newly inserted entity, **When** a developer immediately searches for a term contained in that entity, **Then** the entity appears in search results without any manual re-index step.
3. **Given** an entity whose description has been updated, **When** a developer searches for a term from the old description, **Then** the entity no longer appears; searching for the new term returns it.
4. **Given** multiple entities matching a search term with varying relevance, **When** a developer searches, **Then** results are returned in relevance-ranked order.

---

### User Story 4 - Semantic Similarity Search via Embeddings (Priority: P3)

A developer stores vector embeddings alongside knowledge entities for semantic search. They provide a query vector and retrieve the closest matching entities ranked by distance. This enables "find similar" functionality beyond keyword matching — discovering conceptually related knowledge even when surface-level terms differ.

**Why this priority**: Semantic search is a differentiating capability but depends on the knowledge graph and data lake being populated first. It extends the search infrastructure with AI-powered discovery.

**Independent Test**: Can be fully tested by inserting entities with known embedding vectors, then querying with a target vector and verifying the K-nearest results match expected distances.

**Acceptance Scenarios**:

1. **Given** entities with associated embedding vectors, **When** a developer queries with a target vector requesting the 5 nearest neighbors, **Then** the system returns exactly 5 results ordered by ascending distance.
2. **Given** no embeddings stored for a particular entity, **When** a developer queries for nearest neighbors, **Then** that entity does not appear in vector search results (but remains accessible via keyword search and direct lookup).
3. **Given** an entity whose embedding has been updated, **When** a developer queries with a vector close to the new embedding, **Then** the entity appears with the correct updated distance.

---

### User Story 5 - Centralized Database Access with Swappable Engine (Priority: P2)

A developer accesses all database operations through a single abstraction module rather than writing raw SQL throughout the application. The module exposes domain-specific functions (e.g., "create entity," "search by keyword," "find nearest vectors") and handles connection management, schema initialization, and migration execution internally. If the storage engine needs to change in the future, only the abstraction module requires modification — all consuming code remains unchanged.

**Why this priority**: The abstraction layer is what makes the architecture maintainable and testable. Without it, SQL leaks throughout the codebase, coupling every module to SQLite-specific syntax and making engine swaps prohibitively expensive.

**Independent Test**: Can be fully tested by importing the module, calling its public functions for CRUD operations across all tiers, and verifying correct data persistence without any direct SQL from the test code.

**Acceptance Scenarios**:

1. **Given** the abstraction module is imported into application code, **When** a developer calls a function to create an entity, **Then** the entity is persisted without the developer writing any SQL.
2. **Given** a fresh database file does not exist, **When** the abstraction module is initialized, **Then** it creates the database, applies the full schema, and runs any pending migrations automatically.
3. **Given** the database is at schema version N, **When** a new migration (version N+1) is available and the module initializes, **Then** the migration is applied automatically and the schema version is updated.
4. **Given** a migration fails partway through, **When** the error is caught, **Then** the database remains at the previous schema version with no partial changes applied.

---

### User Story 6 - Schema Versioning and Migration (Priority: P3)

A developer evolves the database schema over time by adding new migration files to a migrations directory. Each migration has a sequential version number and contains the SQL needed to advance the schema. The system tracks which migrations have been applied, applies only pending ones in order, and never re-applies a migration. Migrations run within transactions so failures are rolled back cleanly.

**Why this priority**: Schema evolution is inevitable as the knowledge base grows. Without a migration system, manual schema changes lead to inconsistencies across environments and data loss risks.

**Independent Test**: Can be fully tested by creating a database at version 0, adding multiple migration files, running the migration system, and verifying each migration was applied exactly once in order.

**Acceptance Scenarios**:

1. **Given** a database with no migration history, **When** migrations 001 through 003 exist, **Then** all three are applied in sequence and the schema version reflects 003.
2. **Given** a database already at version 002, **When** migration 003 is added, **Then** only migration 003 is applied.
3. **Given** a migration that contains invalid SQL, **When** the migration system runs, **Then** the migration is rolled back, the schema version remains unchanged, and a clear error is reported.
4. **Given** migration files exist outside the expected naming pattern, **When** the migration system runs, **Then** those files are ignored without error.

---

### Edge Cases

- What happens when the database file is corrupted or inaccessible at startup?
- How does the system handle concurrent writes from multiple processes to the same database file?
- What happens when a vector embedding with incorrect dimensions is inserted?
- How does the system behave when a recursive graph traversal encounters cycles (entity A → B → C → A)?
- What happens when an FTS5 search query contains special characters or SQLite FTS syntax operators?
- How does the system handle migration files that are reordered or have gaps in numbering?
- What happens when the database file exceeds available disk space during a write operation?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store all data in a single database file (`jarvis.db`) organized into three logical tiers: knowledge graph, data lake, and search infrastructure.
- **FR-002**: System MUST provide a knowledge graph tier with entity storage supporting a name, type, and arbitrary metadata per entity, plus typed directional relationships between entities.
- **FR-003**: System MUST support recursive traversal of the knowledge graph, allowing queries that follow relationship chains to a specified depth and return all reachable entities and their paths.
- **FR-004**: System MUST handle cycles in graph traversal gracefully, terminating recursion at visited nodes without infinite loops or errors.
- **FR-005**: System MUST provide data lake tables for health metrics, activities, grades, and meals — each with timestamped records, source attribution, and domain-specific fields.
- **FR-006**: System MUST provide a `data_sources` registry that tracks the origin, type, and active/inactive status of each data source feeding records into the data lake.
- **FR-007**: System MUST provide a full-text search index covering entity names, entity descriptions/metadata, and relevant fields from data lake tables.
- **FR-008**: System MUST keep the full-text search index synchronized with underlying table data automatically — inserts, updates, and deletes in source tables MUST be reflected in the search index without manual intervention.
- **FR-009**: System MUST provide a vector embeddings table that stores floating-point vectors of a configurable dimension, associated with entity identifiers.
- **FR-010**: System MUST support K-nearest-neighbor queries against the vector embeddings table, returning results ranked by distance from a query vector.
- **FR-011**: System MUST expose all database operations through a single abstraction module (`db.mjs`) using ES module syntax. Application code MUST NOT need to write raw SQL or import the database driver directly.
- **FR-012**: The abstraction module MUST handle database connection lifecycle — opening, closing, and ensuring the connection is properly released on process exit.
- **FR-013**: The abstraction module MUST initialize the database schema from a `schema.sql` file on first run when no tables exist.
- **FR-014**: System MUST support schema migrations via numbered SQL files in a `migrations/` directory, applied in sequential order, tracked in a migrations metadata table, and never re-applied.
- **FR-015**: Each migration MUST execute within a transaction. If a migration fails, all its changes MUST be rolled back and the schema version MUST remain at its previous value.
- **FR-016**: System MUST enable WAL (Write-Ahead Logging) mode and foreign key enforcement on every database connection.
- **FR-017**: System MUST reject vector embeddings whose dimensions do not match the configured dimension for the embeddings table.
- **FR-018**: System MUST provide domain-specific query functions for each data lake table, supporting filtering by time range, data source, and table-specific fields.

### Key Entities

- **Entity**: A node in the knowledge graph representing a person, concept, fact, event, or any classifiable piece of knowledge. Has a unique identifier, name, type classification, and extensible metadata.
- **Relation**: A directed, typed edge connecting two entities in the knowledge graph. Captures the nature of the connection (e.g., "works_at", "related_to", "caused_by") with optional metadata and timestamps.
- **Health Metric**: A timestamped measurement of a health indicator (weight, heart rate, blood pressure, sleep duration, etc.) attributed to a data source.
- **Activity**: A timestamped record of a physical or tracked activity (exercise, steps, workout) with duration, type, and intensity metadata.
- **Grade**: An academic or evaluation score with subject, date, score value, and optional scale/context metadata.
- **Meal**: A food consumption record with timestamp, meal type (breakfast/lunch/dinner/snack), items, and optional nutritional metadata.
- **Data Source**: A registry entry identifying where data originates — its name, type (API, manual, import), configuration, and active/inactive status.
- **Search Index Entry**: A derived, automatically-maintained full-text search record that mirrors searchable content from entities and data lake records.
- **Vector Embedding**: A floating-point vector associated with an entity identifier, enabling semantic similarity search across the knowledge base.
- **Migration Record**: A metadata entry tracking which schema migrations have been applied, when, and their status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can create, read, update, and delete entities and relations in the knowledge graph through the abstraction module within a single function call each.
- **SC-002**: Recursive graph traversal queries return correct results for graphs with 1,000+ entities and 5,000+ relations within 500 milliseconds on commodity hardware.
- **SC-003**: Full-text search returns relevant results within 100 milliseconds for a database containing 10,000+ indexed records.
- **SC-004**: Vector similarity search returns the K-nearest neighbors within 200 milliseconds for a table containing 10,000+ embeddings.
- **SC-005**: The full-text search index reflects data changes (inserts, updates, deletes) immediately — no manual rebuild or re-index step required.
- **SC-006**: Schema migrations apply in under 5 seconds per migration on a database with 100,000 rows, with automatic rollback on failure leaving zero partial changes.
- **SC-007**: The abstraction module exposes a public API that allows all CRUD and search operations without any consuming code importing the database driver or writing SQL.
- **SC-008**: A new developer can initialize a working database from scratch (schema + migrations) with a single module import and function call.
- **SC-009**: All data lake queries support filtering by time range and data source, returning correctly ordered results.

## Assumptions

- The target runtime is Node.js (v18+) with ES module support enabled.
- `better-sqlite3` is the chosen SQLite driver for its synchronous API and native performance. This is an intentional choice — the synchronous nature is a feature for this use case, not a limitation.
- The `sqlite-vec` extension (npm package `sqlite-vec`) provides the `vec0` virtual table for vector storage and KNN search. It is loaded as a runtime extension via the driver's extension loading API.
- FTS5 is available as a built-in SQLite feature in the `better-sqlite3` distribution — no additional extensions are needed for full-text search.
- Vector embedding dimensions will be configured at table creation time (not dynamically per-row). A single dimension size is used across all embeddings in a given table.
- The database file (`jarvis.db`) is accessed by a single Node.js process at a time. WAL mode provides read concurrency but the system does not need to handle multi-process write contention.
- The `schema.sql` file defines the complete initial schema. Migrations only handle incremental changes after the initial schema is applied.
- Migration files follow a sequential numeric naming convention (e.g., `001-add-tags-column.sql`, `002-add-index.sql`).
- The abstraction module (`db.mjs`) is the sole entry point for all SQL operations. No other module in the application directly imports `better-sqlite3` or executes raw SQL.
- The project uses no ORM — the abstraction module works with plain SQL internally and exposes JavaScript functions with plain object inputs/outputs.
