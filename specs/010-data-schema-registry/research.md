# Research: Data Schema Registry

**Feature**: 010-data-schema-registry  
**Date**: 2026-04-15

## R1: JSON Schema Validation Library

**Decision**: Use `ajv` (v8) with `ajv-formats` for JSON Schema validation.

**Rationale**:
- JSON Schema draft-07 is a widely adopted standard, making schemas portable and language-agnostic — critical for AI agent consumption.
- `ajv` is the most popular JSON Schema validator in the npm ecosystem (~80M weekly downloads), well-maintained, and supports ESM.
- `ajv-formats` adds format validators (date-time, email, uri, etc.) needed for structured data fields.
- Schemas stored as plain JSON in SQLite are serializable and queryable, unlike Zod schemas which are JavaScript-only runtime objects.
- The project already uses Zod in `extractor.mjs`, but Zod schemas cannot be serialized to JSON for storage or shared with non-JS consumers.

**Alternatives considered**:
- **Zod**: Already a project dependency. Rejected because Zod schemas are not serializable — they can't be stored in SQLite or sent to AI agents as portable data contracts.
- **JSON Schema validation via `jsonschema` (npm)**: Rejected — lower performance, less active maintenance, incomplete format support.
- **Custom validation**: Rejected — reinventing a standard with worse coverage and maintainability.

**Installation**: `npm install ajv ajv-formats`

**Usage pattern** (ESM):
```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(data);
if (!valid) {
  const errors = validate.errors; // array of error objects
  const message = ajv.errorsText(validate.errors, { separator: '; ' });
}
```

## R2: Schema Storage Strategy

**Decision**: Store schemas in a dedicated `data_schemas` SQLite table with `record_type` as primary key.

**Rationale**:
- Schemas need to be queryable (list, get by type) and persisted across restarts.
- SQLite is the project's single data store — adding another storage mechanism would violate simplicity.
- `record_type` as PK provides O(1) lookup during `insertRecord()` validation with no additional index needed.
- JSON Schema definition and example stored as TEXT columns (JSON serialized).

**Alternatives considered**:
- **JSON file on disk**: Rejected — no transactional consistency with data_records, requires separate file management.
- **In-memory Map**: Rejected — lost on restart, no persistence.
- **Embedded in code**: Rejected — not extensible at runtime (FR-006 requires on-the-fly registration).

## R3: Validation Integration Point

**Decision**: Validate inside `insertRecord()` in `db.mjs`, after existing parameter checks and before the SQL INSERT.

**Rationale**:
- `insertRecord()` is the single entry point for data_records insertion (confirmed by codebase analysis).
- Validating here guarantees 100% coverage (SC-002) without requiring callers to remember to validate.
- Schema lookup is a single indexed PK query — negligible overhead.
- When no schema exists, a warning is logged but insertion proceeds (FR-006).

**Alternatives considered**:
- **Separate middleware/wrapper**: Rejected — callers could bypass it, violating SC-002.
- **Database trigger**: Rejected — SQLite triggers can't run JavaScript validation logic.
- **Caller-side validation**: Rejected — distributed responsibility, easy to miss.

## R4: Wiki Generation Approach

**Decision**: Generate Markdown pages in `wiki/schemas/` using the same patterns as `wiki.mjs` (slugify, frontmatter, file I/O).

**Rationale**:
- Existing wiki generation in `wiki.mjs` uses `slugify()`, `gray-matter` for frontmatter, `writeFileSync` for output.
- New `wiki/schemas/` subdirectory avoids conflict with existing wiki types (entities, concepts, topics, comparisons).
- Wiki pages generated as a side effect of `registerSchema()` — keeps docs always in sync (SC-004).
- Obsidian-compatible Markdown format (frontmatter + standard Markdown tables and code blocks).

## R5: Migration Strategy

**Decision**: Use migration `003-data-schema-registry.sql` for table creation only. Pre-register schemas via JavaScript in `db.mjs` (called after migrations).

**Rationale**:
- The `data_schemas` table DDL belongs in a SQL migration (consistent with 001, 002 patterns).
- Pre-registering schemas via SQL INSERT would require embedding large JSON blobs in SQL strings — fragile, unreadable, and hard to validate.
- Using `registerSchema()` from JavaScript after migration allows: (a) schema validation of the schemas themselves, (b) automatic wiki page generation, (c) cleaner code.
- A dedicated `_seedSchemas()` function in `db.mjs` runs after migrations, idempotently inserting schemas only if missing.

**Alternatives considered**:
- **SQL INSERT in migration**: Rejected — JSON Schema objects are complex nested JSON; embedding in SQL is error-prone and unreadable.
- **Separate seed script**: Rejected — adds operational complexity; seeding should be automatic on init.

## R6: Performance Considerations

**Performance targets** (per Constitution IV):
- Schema lookup (getSchema): < 1ms (single PK query on small table)
- Schema validation (validateRecord): < 5ms for typical records (< 20 fields)
- insertRecord() overhead from validation: < 10ms additional latency
- listSchemas(): < 5ms (full table scan on ~10-20 rows max)

**Rationale**: The `data_schemas` table will have at most tens of rows (one per record type). All operations are O(1) or O(n) where n is trivially small. Ajv compiles schemas to optimized validator functions on first use, with subsequent validations being essentially free. No caching layer needed.

## R7: CLI Pattern

**Decision**: Follow existing CLI pattern from `kb-export.mjs` / `kb-import.mjs` — manual `process.argv` parsing, `isMainModule` check, separate programmatic API.

**Rationale**:
- Existing CLIs use manual argv parsing (no commander/yargs dependency).
- Pattern: check `import.meta.url === pathToFileURL(process.argv[1]).href`, parse args, call programmatic functions, use exit codes 0/1/2.
- Consistent with Constitution III (User Experience Consistency).
