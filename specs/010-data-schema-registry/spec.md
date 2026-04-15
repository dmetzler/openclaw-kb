# Feature Specification: Data Schema Registry

**Feature Branch**: `010-data-schema-registry`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "Data Schema Registry for the OpenClaw Knowledge Base data lake. Currently the data lake uses a generic data_records table with record_type + data JSON, but there is no documentation of what fields each record_type expects. An AI agent inserting data does not know the expected schema. This spec adds: a data_schemas table, functions in db.mjs (registerSchema, getSchema, listSchemas, validateRecord), optional validation on insert, pre-registered schemas for known data types, auto-generated wiki pages, a CLI command, and agent-friendly discovery APIs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Agent Discovers Available Data Schemas (Priority: P1)

An AI agent connected to the knowledge base needs to insert structured data (e.g., a health metric reading) but does not know what fields are expected. The agent queries the schema registry to discover all registered data types, retrieves the schema for the desired type, sees the required and optional fields with their types and constraints, reviews a complete example record, and then constructs a valid data object that conforms to the schema before inserting it.

**Why this priority**: This is the core problem statement — AI agents cannot currently know what data format is expected. Without schema discovery, agents guess field names and types, producing inconsistent and invalid data. This story delivers the primary value of the entire feature.

**Independent Test**: Can be fully tested by registering a schema, calling the discovery APIs (listSchemas, getSchema), and verifying that the returned schema contains enough information for a consumer to construct a valid record without prior knowledge of the data format.

**Acceptance Scenarios**:

1. **Given** schemas are registered for multiple record types, **When** a consumer calls `listSchemas()`, **Then** the system returns an array of all registered schemas with their record_type, label, and description — enough to identify the right type.
2. **Given** a schema exists for "health_metric", **When** a consumer calls `getSchema("health_metric")`, **Then** the system returns the full schema object including the JSON Schema definition, a human-readable label, a description of the data type, and a complete example record.
3. **Given** no schema exists for an unknown record type, **When** a consumer calls `getSchema("unknown_type")`, **Then** the system returns null without throwing an error.
4. **Given** a consumer has retrieved a schema, **When** they examine the JSON Schema definition, **Then** it contains property names, types, required fields, optional fields, and format constraints sufficient to construct a valid record.

---

### User Story 2 - Data Validation on Record Insertion (Priority: P1)

A data producer (human or AI agent) inserts a record into the data lake. If a schema is registered for that record type, the system validates the data payload against the schema before storing it. If the data is invalid, the system rejects the insertion with a descriptive error message listing exactly which fields failed validation and why. If no schema exists for the record type, the system allows the insertion but logs a warning that unvalidated data was stored.

**Why this priority**: Validation is the enforcement mechanism that ensures data quality. Without it, schema discovery is informational only — agents could still insert malformed data. This story closes the loop between discovery and enforcement.

**Independent Test**: Can be fully tested by registering a schema, attempting to insert records with valid data (succeeds), invalid data (fails with descriptive errors), and data for an unregistered type (succeeds with warning).

**Acceptance Scenarios**:

1. **Given** a schema is registered for "health_metric" requiring fields metric_type (string), value (number), and unit (string), **When** a producer inserts a record with all required fields present and valid, **Then** the record is stored successfully.
2. **Given** a schema is registered for "health_metric", **When** a producer inserts a record missing the required "unit" field, **Then** the system throws an error with a message indicating which field is missing and what type it should be.
3. **Given** a schema is registered for "health_metric" where "value" must be a number, **When** a producer inserts a record with value="not_a_number", **Then** the system throws an error indicating that "value" must be a number.
4. **Given** no schema is registered for "custom_metric", **When** a producer inserts a record of type "custom_metric", **Then** the record is stored successfully and a warning is logged indicating that no schema validation was performed.
5. **Given** a schema allows optional fields (e.g., "device"), **When** a producer inserts a record without the optional field, **Then** the record is stored successfully without errors.

---

### User Story 3 - Pre-Registered Schemas for Known Data Types (Priority: P1)

When the schema registry is initialized for the first time (via database migration), it comes pre-loaded with schemas for all known data types that have been used in the knowledge base: health_metric, activity, grade, meal, sleep, and finance. Each pre-registered schema includes a descriptive label, a description of the data type, a JSON Schema defining required and optional fields, and a complete example record. This ensures that existing data types are immediately discoverable and validated from day one.

**Why this priority**: The knowledge base already contains records of these types from prior migrations. Pre-registering their schemas ensures backward compatibility and immediate value — agents can start querying schemas without waiting for manual registration.

**Independent Test**: Can be fully tested by initializing a fresh database, calling listSchemas(), and verifying that all six expected schemas are present with complete definitions and examples.

**Acceptance Scenarios**:

1. **Given** a fresh database is initialized, **When** migrations run, **Then** the data_schemas table contains entries for health_metric, activity, grade, meal, sleep, and finance.
2. **Given** the pre-registered health_metric schema, **When** a consumer retrieves it, **Then** it defines metric_type (string, required), value (number, required), unit (string, required), recorded_at (string, required), and device (string, optional).
3. **Given** the pre-registered grade schema, **When** a consumer retrieves it, **Then** it defines student (string, required), subject (string, required), score (number, required), max_score (number, required), coefficient (number, optional), trimester (string, optional), school_year (string, required), and recorded_at (string, required).
4. **Given** pre-registered schemas exist, **When** a producer inserts a record matching a known type, **Then** the data is validated against the pre-registered schema.

---

### User Story 4 - Register New Data Schemas On-the-Fly (Priority: P2)

An AI agent or administrator encounters a new type of data that doesn't have a registered schema. They define the schema programmatically via `registerSchema()` or via the CLI, specifying the record type, a human-readable label, a description, a JSON Schema definition, and an example record. The new schema is stored in the registry and immediately available for discovery and validation. If a schema already exists for that record type, it is updated (replaced) with the new definition.

**Why this priority**: The knowledge base is designed to be extensible — new data types can be added at any time. Without on-the-fly registration, every new data type requires a code change and migration. This story enables self-service schema management.

**Independent Test**: Can be fully tested by calling registerSchema() with a new type, verifying it appears in listSchemas(), retrieving it with getSchema(), and confirming that validation works for the new type.

**Acceptance Scenarios**:

1. **Given** no schema exists for "medication", **When** a consumer calls `registerSchema("medication", "Medication Tracking", "Tracks medication intake...", jsonSchema, example)`, **Then** the schema is stored and immediately discoverable via `listSchemas()` and `getSchema("medication")`.
2. **Given** a schema already exists for "health_metric", **When** a consumer calls `registerSchema("health_metric", ...)` with an updated schema, **Then** the existing schema is replaced with the new definition.
3. **Given** a consumer registers a new schema, **When** a producer subsequently inserts a record of that type, **Then** the data is validated against the newly registered schema.
4. **Given** a consumer provides an invalid JSON Schema definition (malformed JSON), **When** they call `registerSchema()`, **Then** the system throws a descriptive error rejecting the registration.

---

### User Story 5 - Wiki Documentation Auto-Generated for Schemas (Priority: P2)

When a schema is registered or updated, the system automatically generates an Obsidian-compatible Markdown page in the `wiki/schemas/` directory. The page contains the schema's label, description, a human-readable table of all fields (name, type, required/optional, description), and a formatted example record. This provides a browsable, human-readable reference for all data types without requiring manual documentation effort.

**Why this priority**: Auto-generated documentation ensures schemas stay in sync with their definitions. Manual documentation would inevitably drift. Wiki pages also make schemas accessible to non-technical users who don't interact with the API.

**Independent Test**: Can be fully tested by registering a schema, checking that a corresponding Markdown file exists in wiki/schemas/, and verifying its content includes a field table and example.

**Acceptance Scenarios**:

1. **Given** a schema is registered for "health_metric", **When** the registration completes, **Then** a file `wiki/schemas/health-metric.md` exists containing the schema documentation.
2. **Given** the generated wiki page, **When** a user reads it, **Then** it contains: a title with the schema label, a description paragraph, a Markdown table listing each field with its name, type, whether it's required or optional, and a formatted JSON example block.
3. **Given** a schema is updated via `registerSchema()`, **When** the update completes, **Then** the corresponding wiki page is regenerated to reflect the new schema definition.
4. **Given** the wiki page format, **When** viewed in Obsidian, **Then** it renders correctly with proper Markdown formatting and no broken syntax.

---

### User Story 6 - CLI for Schema Management (Priority: P3)

An administrator manages schemas from the command line using `node src/schema-registry.mjs <command>`. Available commands: `list` (show all registered schemas), `get <type>` (show details for one schema), `register <json-file>` (register a schema from a JSON file), `validate <type> <json-file>` (validate a data file against a schema). The CLI provides human-readable output for interactive use and exits with appropriate codes for scripting.

**Why this priority**: The CLI is a convenience interface over the programmatic API. All functionality is already available via db.mjs functions. The CLI adds operational convenience but is not required for core functionality.

**Independent Test**: Can be fully tested by running each CLI command and verifying the output and exit codes match expectations.

**Acceptance Scenarios**:

1. **Given** schemas are registered, **When** the operator runs `node src/schema-registry.mjs list`, **Then** the system outputs a table of all registered schemas with record_type, label, and description, and exits with code 0.
2. **Given** a schema exists for "health_metric", **When** the operator runs `node src/schema-registry.mjs get health_metric`, **Then** the system outputs the full schema details including JSON Schema and example, and exits with code 0.
3. **Given** a JSON file containing a schema definition, **When** the operator runs `node src/schema-registry.mjs register schema.json`, **Then** the schema is registered and the operator sees a confirmation message.
4. **Given** a data JSON file and a registered schema, **When** the operator runs `node src/schema-registry.mjs validate health_metric data.json`, **Then** the system outputs whether the data is valid or lists validation errors, exiting with code 0 for valid data and code 1 for invalid data.
5. **Given** no arguments are provided, **When** the operator runs `node src/schema-registry.mjs`, **Then** the system outputs usage information and exits with code 1.

---

### Edge Cases

- What happens when `registerSchema()` is called with a record_type that contains special characters or spaces? The system should reject it with an error requiring alphanumeric characters, underscores, and hyphens only.
- How does the system handle a schema that references JSON Schema features not supported by the validation library (e.g., `$ref` to external schemas)? The system validates using standard JSON Schema draft-07 features only; unsupported features are silently ignored during validation.
- What happens when `insertRecord()` is called concurrently with `registerSchema()` for the same type? The system uses the schema that exists at the time of validation — no locking is required since SQLite serializes writes.
- What happens when a pre-registered schema conflicts with existing data in the database? Pre-registered schemas are designed to match the existing data format. No retroactive validation of historical data is performed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store schema definitions in a `data_schemas` table with record_type as primary key, along with label, description, JSON Schema definition, example record, and creation timestamp.
- **FR-002**: System MUST provide a `registerSchema(recordType, label, description, jsonSchema, example)` function that stores or replaces a schema definition and generates a corresponding wiki page.
- **FR-003**: System MUST provide a `getSchema(recordType)` function that returns the full schema definition or null if not found.
- **FR-004**: System MUST provide a `listSchemas()` function that returns all registered schemas with their record_type, label, and description.
- **FR-005**: System MUST provide a `validateRecord(recordType, data)` function that validates a data object against the registered JSON Schema for that type, returning a result indicating success or listing specific validation errors.
- **FR-006**: System MUST validate data against the registered schema (if one exists) when `insertRecord()` is called. Validation failure MUST throw a descriptive error. Missing schema MUST allow insertion with a logged warning.
- **FR-007**: System MUST pre-register schemas for health_metric, activity, grade, meal, sleep, and finance record types during database migration, with complete JSON Schema definitions and example records.
- **FR-008**: System MUST auto-generate Obsidian-compatible Markdown wiki pages in `wiki/schemas/` for each registered schema, containing a human-readable field table and example.
- **FR-009**: System MUST provide a CLI (`node src/schema-registry.mjs`) supporting list, get, register, and validate commands with appropriate exit codes.
- **FR-010**: System MUST reject schema registration when the record_type contains characters other than alphanumeric, underscores, or hyphens.
- **FR-011**: System MUST reject schema registration when the JSON Schema definition is not a valid JSON object.

### Key Entities

- **DataSchema**: Represents the contract for a data record type. Attributes: record_type (unique identifier), label (human-readable name), description (purpose of this data type), schema (JSON Schema defining valid data structure), example (complete example record), created_at (registration timestamp).
- **DataRecord**: The existing generic record in the data lake. Attributes: id, source_id, record_type, data (JSON payload validated against DataSchema if registered), recorded_at, created_at. Relationship: record_type references DataSchema.record_type (soft reference — no foreign key constraint since unregistered types are allowed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An AI agent with no prior knowledge of the data model can discover all available data types and their expected formats through the schema registry APIs alone.
- **SC-002**: 100% of records inserted for registered data types are validated against their schema before storage — no invalid data is silently accepted.
- **SC-003**: All six pre-registered data types (health_metric, activity, grade, meal, sleep, finance) have complete, accurate schemas available immediately after database initialization.
- **SC-004**: Every registered schema has a corresponding up-to-date wiki page that accurately reflects the current schema definition.
- **SC-005**: Validation error messages identify the specific field(s) that failed and the reason for failure, enabling the producer to correct the data without guessing.
- **SC-006**: New data types can be registered and immediately used (discovered, validated, documented) without any code changes or application restart.

## Assumptions

- The project already uses `zod` for validation in extractor.mjs, but JSON Schema (via `ajv`) is more appropriate here because schemas must be serializable as JSON for storage in SQLite and for sharing with AI agents in a language-agnostic format.
- The `ajv` and `ajv-formats` npm packages will be added as production dependencies. These are lightweight (32 KB gzipped) and widely used.
- JSON Schema draft-07 is sufficient for all data validation needs. Advanced features like `$ref` to external schemas are not required.
- The `wiki/schemas/` directory is a new subdirectory that does not conflict with existing wiki structure (entities, concepts, topics, comparisons).
- Pre-registered schemas are designed to match the data format established by the existing migration (001-generic-data-records.sql). No retroactive validation of historical data is performed.
- The CLI follows the same patterns as existing CLIs (kb-export.mjs, kb-import.mjs, kg-migrate.mjs): manual argument parsing, exit codes, separation of programmatic API from CLI wrapper.
- The `insertRecord()` function in db.mjs is the single point of data insertion. No other code paths bypass it for data_records insertion (import functions are excluded from validation since they handle pre-validated data).
