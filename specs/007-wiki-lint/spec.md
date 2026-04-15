# Feature Specification: Wiki Lint & Health-Check System

**Feature Branch**: `007-wiki-lint`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "Wiki lint and health-check system for the OpenClaw Knowledge Base. Building on the wiki structure (spec 002) and SQLite foundation (spec 001). This is a wiki-lint.mjs script that validates the integrity and quality of the wiki. Features: broken wikilinks detection, orphan detection, index.md sync, confidence decay, KG-Wiki consistency, duplicate file names, frontmatter validation, report generation, auto-fix mode."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Full Wiki Lint and Get a Report (Priority: P1)

A knowledge base operator runs `node wiki-lint.mjs` from the project root to validate the entire wiki. The tool scans all wiki pages across all subdirectories, runs every check (broken wikilinks, orphans, index sync, confidence decay, KG-Wiki consistency, duplicate filenames, frontmatter validation), and outputs a structured report. The report shows total issues found grouped by check category, with each issue listing the affected file, line number (where applicable), and a human-readable description. The process exits with code 0 if no issues are found, or code 1 if any issues exist.

**Why this priority**: The core value is running all checks together and getting actionable output. Without the report, individual checks have no delivery mechanism.

**Independent Test**: Can be fully tested by creating a wiki directory with a mix of valid pages and known issues (a broken wikilink, a page with missing frontmatter fields, an orphan page), running `node wiki-lint.mjs`, and verifying the report lists all planted issues and exits with code 1.

**Acceptance Scenarios**:

1. **Given** a wiki with no issues, **When** the operator runs `node wiki-lint.mjs`, **Then** the tool outputs a clean report summary and exits with code 0.
2. **Given** a wiki with 3 broken wikilinks, 1 orphan page, and 2 pages with missing frontmatter fields, **When** the operator runs `node wiki-lint.mjs`, **Then** the report lists all 6 issues grouped by category with file paths and descriptions, and exits with code 1.
3. **Given** the operator wants machine-readable output, **When** they run `node wiki-lint.mjs --json`, **Then** the tool outputs a JSON report to stdout with the same issue data structured as an object with arrays per check category.
4. **Given** the operator wants only a specific check, **When** they run `node wiki-lint.mjs --check broken-links`, **Then** only the broken wikilinks check runs, and other checks are skipped.

---

### User Story 2 - Detect Broken Wikilinks (Priority: P1)

The operator needs to find all `[[wikilinks]]` in wiki pages that point to files that do not exist anywhere in the wiki. The tool scans every `.md` file in `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, and `wiki/comparisons/`, extracts all `[[target]]` and `[[target|display]]` references, and checks whether a file named `target.md` exists in any wiki subdirectory. Each broken link is reported with the source file path and the line number where the link appears.

**Why this priority**: Broken links are the most common wiki integrity issue and the easiest to detect. They directly degrade the Obsidian browsing experience described in spec 002.

**Independent Test**: Can be fully tested by creating a page containing `[[nonexistent-page]]` and verifying the lint report includes it as a broken link with the correct source file and line number.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/alice.md` contains `[[bob]]` on line 5, and `bob.md` does not exist in any wiki subdirectory, **When** the lint runs, **Then** the report includes a broken-link issue for `wiki/entities/alice.md:5` referencing `bob`.
2. **Given** `wiki/entities/alice.md` contains `[[bob|Bob Smith]]`, and `wiki/entities/bob.md` exists, **When** the lint runs, **Then** no broken-link issue is reported for that reference.
3. **Given** a page contains `[[concepts-page]]` and the file exists at `wiki/concepts/concepts-page.md`, **When** the lint runs, **Then** the link is resolved correctly across subdirectories (Obsidian shortest-path resolution).
4. **Given** a page contains zero wikilinks, **When** the lint runs, **Then** no broken-link issues are reported for that page.

---

### User Story 3 - Detect Orphan Pages (Priority: P2)

The operator wants to find wiki pages that are not referenced by any other wiki page via wikilinks and are also not listed in `wiki/index.md`. A page that is in the index but not referenced by any content page is NOT an orphan (the index counts as a reference). A page that is referenced by at least one other page but not in the index is NOT an orphan. Only pages with zero inbound wikilinks AND absent from the index are orphans.

**Why this priority**: Orphan pages indicate content that was created but never integrated into the knowledge graph. They represent potential knowledge gaps or cleanup needs.

**Independent Test**: Can be fully tested by creating a page that is not referenced by any other page and not in the index, running lint, and verifying it appears as an orphan.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/lonely.md` exists but no other page contains `[[lonely]]` and `lonely` is not in `wiki/index.md`, **When** the lint runs, **Then** the report includes an orphan issue for `wiki/entities/lonely.md`.
2. **Given** `wiki/entities/indexed.md` is listed in `wiki/index.md` but no content page links to it, **When** the lint runs, **Then** `indexed.md` is NOT reported as an orphan (index counts as a reference).
3. **Given** `wiki/entities/linked.md` is referenced by `[[linked]]` in another page but is not in the index, **When** the lint runs, **Then** `linked.md` is NOT reported as an orphan.
4. **Given** `wiki/index.md` and `wiki/log.md` exist, **When** the lint runs, **Then** neither index.md nor log.md are evaluated for orphan status (they are infrastructure files, not content pages).

---

### User Story 4 - Validate and Sync index.md (Priority: P2)

The operator wants to verify that `wiki/index.md` is up to date — that every wiki page is listed and no stale entries reference deleted pages. The lint reports missing entries (pages not in the index) and stale entries (index references to non-existent pages). With `--fix`, the tool regenerates `index.md` using the existing `regenerateIndex()` function from `wiki.mjs`.

**Why this priority**: The index is the table of contents for the wiki. An out-of-sync index makes navigation unreliable, which is a core spec 002 requirement (FR-007).

**Independent Test**: Can be fully tested by creating wiki pages, generating an index, then adding a new page without updating the index, running lint, and verifying the new page is reported as missing from the index.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/new-entity.md` exists but is not listed in `wiki/index.md`, **When** the lint runs, **Then** the report includes an index-sync issue for the missing entry.
2. **Given** `wiki/index.md` contains `[[deleted-page]]` but `deleted-page.md` does not exist, **When** the lint runs, **Then** the report includes a stale-entry issue.
3. **Given** index sync issues exist, **When** the operator runs `node wiki-lint.mjs --fix`, **Then** `wiki/index.md` is regenerated via `regenerateIndex()` and the lint re-check passes.
4. **Given** `wiki/index.md` does not exist at all, **When** the lint runs, **Then** the report includes an index-missing issue, and `--fix` creates it.

---

### User Story 5 - Flag Confidence Decay (Priority: P2)

The operator wants to identify wiki pages whose confidence scores have decayed below a usable threshold based on page type and age. The decay model applies different rates depending on the page's `type` field in frontmatter:

- **entity** (technical facts): -0.1 per 3 months since `updated`
- **concept** (conceptual knowledge): -0.05 per year since `updated`
- **topic** (architecture decisions): -0.1 per 6 months since `updated`
- **comparison**: -0.05 per year since `updated`

Pages whose effective confidence (stored confidence minus decay) drops below 0.5 are flagged for review. The decay is calculated at lint time, not written to the file — it is a read-only diagnostic.

**Why this priority**: Confidence decay ensures stale knowledge is surfaced for review. Without it, outdated technical facts persist unchallenged.

**Independent Test**: Can be fully tested by creating a page with `confidence: 0.8`, `type: entity`, and `updated` set to 9 months ago, running lint, and verifying the page is flagged (0.8 - 0.3 = 0.5, at the threshold boundary — 10 months would drop to 0.47, below threshold).

**Acceptance Scenarios**:

1. **Given** `wiki/entities/nodejs.md` has `confidence: 0.85`, `type: entity`, and `updated: 2025-10-01` (6+ months ago), **When** the lint runs on 2026-04-14, **Then** effective confidence is `0.85 - 0.2 = 0.65` (2 decay periods), NOT flagged.
2. **Given** `wiki/entities/old-fact.md` has `confidence: 0.7`, `type: entity`, and `updated: 2025-01-01` (15+ months ago), **When** the lint runs, **Then** effective confidence is `0.7 - 0.5 = 0.2` (5 decay periods), flagged as below 0.5.
3. **Given** `wiki/concepts/general-concept.md` has `confidence: 0.8`, `type: concept`, and `updated: 2024-04-01` (2 years ago), **When** the lint runs, **Then** effective confidence is `0.8 - 0.1 = 0.7` (2 decay periods), NOT flagged.
4. **Given** a page has no `updated` field in frontmatter, **When** the lint runs, **Then** the page is flagged as a frontmatter validation issue (missing required field), and confidence decay is skipped for that page.

---

### User Story 6 - Check KG-Wiki Consistency (Priority: P2)

The operator wants to verify bidirectional consistency between wiki pages and Knowledge Graph entities in SQLite. Two checks are performed:

1. **Wiki → KG**: Every wiki page with a `kg_id` in frontmatter has a matching entity (by ID) in the `entities` table.
2. **KG → Wiki**: Every entity in the `entities` table that was created by the ingestion pipeline (i.e., has a corresponding wiki page) can be found by looking up wiki pages whose `kg_id` matches the entity ID.

Since the `entities` table does not have a `wiki_page` column, the reverse lookup scans all wiki pages' `kg_id` frontmatter values and checks for entities that were expected to have wiki pages but don't (entities whose type matches wiki types: entity, concept, topic, comparison).

**Why this priority**: KG-Wiki drift means the structured knowledge graph and the human-readable wiki tell different stories. This check catches deletions, failed ingestions, and manual edits that break the link.

**Independent Test**: Can be fully tested by creating an entity in SQLite, creating a wiki page with `kg_id` pointing to a different ID, running lint, and verifying both the dangling `kg_id` and the orphaned entity are reported.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/alice.md` has `kg_id: 42` in frontmatter, but no entity with `id=42` exists in the `entities` table, **When** the lint runs, **Then** the report includes a KG-Wiki issue: "wiki page references non-existent entity 42".
2. **Given** entity `id=99` with `type: entity` exists in SQLite, but no wiki page has `kg_id: 99` in frontmatter, **When** the lint runs, **Then** the report includes a KG-Wiki issue: "entity 99 (name) has no corresponding wiki page".
3. **Given** all wiki pages' `kg_id` values match existing entities, and all wiki-typed entities have corresponding pages, **When** the lint runs, **Then** no KG-Wiki issues are reported.
4. **Given** the database is not accessible (file missing or corrupt), **When** the lint runs, **Then** the KG-Wiki check is skipped with a warning, and other checks proceed normally.

---

### User Story 7 - Detect Duplicate File Names (Priority: P1)

The operator needs to ensure no two `.md` files across different wiki subdirectories share the same filename. Since Obsidian resolves `[[wikilinks]]` by filename using shortest-path matching, duplicate filenames cause ambiguous link resolution. The tool scans all four wiki subdirectories and reports any filename that appears more than once, listing all locations.

**Why this priority**: Duplicate filenames break Obsidian's core navigation model. This is a data integrity issue, not just a quality concern, and was already identified as a requirement in spec 002 (FR-006).

**Independent Test**: Can be fully tested by creating `wiki/entities/python.md` and `wiki/concepts/python.md`, running lint, and verifying both are reported as duplicates.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/python.md` and `wiki/concepts/python.md` both exist, **When** the lint runs, **Then** the report includes a duplicate-filename issue listing both paths.
2. **Given** all filenames are unique across subdirectories, **When** the lint runs, **Then** no duplicate-filename issues are reported.
3. **Given** three files share the name `data.md` across entities, concepts, and topics, **When** the lint runs, **Then** the report lists all three paths in a single duplicate-filename issue.

---

### User Story 8 - Validate Frontmatter Fields (Priority: P1)

The operator wants to ensure every wiki page has all required YAML frontmatter fields as defined in spec 002 (FR-003): `id`, `type`, `created`, `updated`, `confidence`. The tool reports missing fields, invalid types (e.g., `confidence` not a number, `type` not one of entity/concept/topic/comparison), and malformed YAML. Additional optional fields (`sources`, `related`, `kg_id`) are not required but are validated for correct types when present.

**Why this priority**: Frontmatter is the structured metadata backbone of the wiki. Missing or invalid fields break programmatic access, confidence decay calculations, and KG consistency checks.

**Independent Test**: Can be fully tested by creating a page missing the `confidence` field, running lint, and verifying the report flags the missing field.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/alice.md` is missing the `confidence` field in frontmatter, **When** the lint runs, **Then** the report includes a frontmatter issue: "missing required field: confidence".
2. **Given** a page has `type: invalid_type` in frontmatter, **When** the lint runs, **Then** the report includes a frontmatter issue: "invalid type value: must be one of entity, concept, topic, comparison".
3. **Given** a page has `confidence: "high"` (string instead of number), **When** the lint runs, **Then** the report includes a frontmatter issue: "confidence must be a number between 0.0 and 1.0".
4. **Given** a page has malformed YAML frontmatter that cannot be parsed, **When** the lint runs, **Then** the report includes a frontmatter issue: "failed to parse YAML frontmatter" with the parse error, and subsequent checks that depend on frontmatter are skipped for that page.
5. **Given** a page has all required fields with valid values, **When** the lint runs, **Then** no frontmatter issues are reported for that page.

---

### User Story 9 - Auto-Fix Simple Issues (Priority: P3)

The operator wants to automatically fix issues that have safe, deterministic resolutions. When running with `--fix`, the tool applies the following fixes:

1. **Orphan pages**: Add orphan pages to `wiki/index.md` by regenerating the index.
2. **Broken links**: Create stub pages for broken wikilinks (minimal frontmatter + a "This page is a stub" body).
3. **Index sync**: Regenerate `wiki/index.md` using `regenerateIndex()`.

The tool reports what was fixed. Fixes that could lose data or require human judgment (e.g., confidence decay, KG inconsistency, frontmatter repair) are never auto-fixed.

**Why this priority**: Auto-fix is a convenience feature. The diagnostic checks are independently useful without it.

**Independent Test**: Can be fully tested by creating a broken wikilink to `[[new-topic]]`, running `node wiki-lint.mjs --fix`, and verifying a stub page was created at `wiki/topics/new-topic.md` (or the appropriate subdirectory) and the link is no longer broken on re-lint.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/alice.md` contains `[[bob]]` and `bob.md` does not exist, **When** the operator runs `node wiki-lint.mjs --fix`, **Then** a stub page `wiki/entities/bob.md` is created with minimal frontmatter (`id: bob`, `type: entity`, `created`, `updated`, `confidence: 0.5`) and body "This page is a stub. Created by wiki-lint auto-fix.", and the broken-link issue is resolved.
2. **Given** 3 orphan pages exist, **When** the operator runs `node wiki-lint.mjs --fix`, **Then** `wiki/index.md` is regenerated to include all pages, and the orphan issues are resolved.
3. **Given** no fixable issues exist, **When** the operator runs `node wiki-lint.mjs --fix`, **Then** the tool reports "No issues to fix" and exits with code 0.
4. **Given** the operator runs `--fix`, **When** confidence decay issues exist, **Then** the decay issues are reported but NOT auto-fixed (decay requires human review of page content).

---

### Edge Cases

- What happens when `wiki/` directory does not exist? The tool reports it and exits with code 1 (no checks can run).
- What happens when a wiki page has no frontmatter at all (just Markdown content)? Treated as a frontmatter validation error; the page is still scanned for wikilinks.
- How does the tool handle nested wikilinks in code blocks? Wikilinks inside fenced code blocks (` ``` `) are ignored — they are not real references.
- What happens when a wikilink target contains special characters or spaces? The tool slugifies the target using the same `slugify()` function from `wiki.mjs` before checking for file existence.
- How does the tool behave when the SQLite database file does not exist? The KG-Wiki consistency check is skipped with a warning; all other checks proceed.
- What happens when `--fix` creates a stub page that would be a duplicate filename? The stub creation follows the same collision resolution as `createPage()` in `wiki.mjs` (appends type suffix).
- How does the tool handle symlinks in the wiki directory? Symlinks are followed (standard `fs.readFileSync` behavior).
- What happens when `wiki/index.md` contains manually added content beyond the auto-generated sections? The `--fix` regeneration replaces the entire file (consistent with `regenerateIndex()` behavior). The tool warns before overwriting if the file does not start with the auto-generated header.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `wiki-lint.mjs` script at `src/wiki-lint.mjs` that is both executable as a CLI (`node src/wiki-lint.mjs`) and importable as an ES module with named exports for each check function.
- **FR-002**: The CLI MUST accept the following flags: `--json` (output JSON report to stdout), `--fix` (auto-fix simple issues), `--check <name>` (run only a specific check), `--wiki-dir <path>` (wiki directory, default `wiki`), `--db <path>` (database path, default `jarvis.db`).
- **FR-003**: The CLI MUST exit with code 0 when no issues are found, and code 1 when any issues are found (after fixes, if `--fix` was used).
- **FR-004**: The **broken wikilinks check** MUST scan all `.md` files in `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, and `wiki/comparisons/`, extract all `[[target]]` and `[[target|display]]` patterns, and report any target that does not resolve to an existing `.md` file in any wiki subdirectory. Wikilinks inside fenced code blocks MUST be ignored.
- **FR-005**: Each broken wikilink issue MUST include: source file path, line number, and the unresolved target name.
- **FR-006**: The **orphan detection check** MUST identify wiki pages that have zero inbound wikilinks from other wiki pages AND are not listed in `wiki/index.md`. Infrastructure files (`index.md`, `log.md`) MUST be excluded from orphan evaluation.
- **FR-007**: The **index sync check** MUST compare the set of wiki pages on disk against entries in `wiki/index.md` and report: (a) pages on disk not in the index, (b) entries in the index that reference non-existent pages, (c) `wiki/index.md` missing entirely.
- **FR-008**: The **confidence decay check** MUST calculate effective confidence for each page using the formula: `effective = stored_confidence - (decay_rate * periods_elapsed)`, where periods and rates are: entity = 0.1 per 3 months, concept = 0.05 per year, topic = 0.1 per 6 months, comparison = 0.05 per year. Pages with effective confidence below 0.5 MUST be flagged. The decay calculation is read-only — it MUST NOT modify page files.
- **FR-009**: The **KG-Wiki consistency check** MUST verify: (a) every wiki page with a `kg_id` frontmatter field has a corresponding entity in the `entities` table, (b) every entity in the `entities` table whose `type` is one of `entity`, `concept`, `topic`, `comparison` has at least one wiki page with a matching `kg_id`. This check MUST use `db.mjs` functions (`initDatabase`, `getEntity`, `getAllEntities`) — it MUST NOT import `better-sqlite3` directly.
- **FR-010**: The **duplicate filename check** MUST scan all four wiki subdirectories and report any `.md` filename that appears in more than one subdirectory, listing all conflicting paths.
- **FR-011**: The **frontmatter validation check** MUST verify that every wiki page has the following required fields: `id` (string), `type` (one of: entity, concept, topic, comparison), `created` (string), `updated` (string), `confidence` (number, 0.0-1.0). Optional fields (`sources`, `related`, `kg_id`) MUST be type-validated when present: `sources` must be an array, `related` must be an array, `kg_id` must be a number.
- **FR-012**: The tool MUST parse YAML frontmatter using the `gray-matter` library with the same JSON_SCHEMA engine configuration used by `wiki.mjs`, to ensure consistent date handling.
- **FR-013**: The **report** MUST be available in two formats: (a) human-readable Markdown printed to stdout (default), (b) JSON printed to stdout (when `--json` is specified). Both formats MUST include: total issue count, issue count per check category, and a list of individual issues with file path, line number (where applicable), category, severity, and description.
- **FR-014**: In `--fix` mode, the tool MUST: (a) regenerate `wiki/index.md` using `regenerateIndex()` from `wiki.mjs`, (b) create stub pages for broken wikilink targets with minimal frontmatter and a stub body, (c) report all fixes applied. The tool MUST NOT auto-fix confidence decay, KG-Wiki inconsistencies, or frontmatter errors.
- **FR-015**: Stub pages created by `--fix` MUST have frontmatter with: `id` (derived from target name), `type: entity` (default), `created` (current ISO timestamp), `updated` (current ISO timestamp), `confidence: 0.5`, and body content: `\n# {Title}\n\nThis page is a stub. Created by wiki-lint auto-fix.\n`.
- **FR-016**: The tool MUST handle graceful degradation: if the SQLite database is unavailable (file missing, corrupt, or `better-sqlite3` not loadable), the KG-Wiki check MUST be skipped with a warning, and all other checks MUST still run.
- **FR-017**: The tool MUST handle the case where `wiki/` directory does not exist by reporting the issue and exiting with code 1.
- **FR-018**: Each exported check function MUST be independently callable with a `wikiDir` parameter, returning an array of issue objects. This enables programmatic use and selective checking.

### Key Entities

- **Lint Issue**: A single detected problem with fields: `category` (string: `broken-link`, `orphan`, `index-sync`, `confidence-decay`, `kg-consistency`, `duplicate-filename`, `frontmatter`), `severity` (string: `error`, `warning`), `file` (string: file path), `line` (number or null), `message` (string: human-readable description), `target` (string or null: the referenced entity, for broken links and KG issues).
- **Lint Report**: Aggregate result of all checks with fields: `timestamp` (ISO 8601), `wikiDir` (string), `totalIssues` (number), `issuesByCategory` (object: category → count), `issues` (array of Lint Issue objects), `fixesApplied` (array of fix descriptions, when `--fix` was used).
- **Decay Rule**: A per-type configuration specifying `decayRate` (number) and `periodMonths` (number) used to calculate effective confidence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running `node src/wiki-lint.mjs` on a wiki with known planted issues detects 100% of planted issues across all 7 check categories.
- **SC-002**: Running `node src/wiki-lint.mjs` on a clean wiki exits with code 0 and reports zero issues.
- **SC-003**: The `--json` flag produces valid JSON that can be parsed by `JSON.parse()` and contains the same issue set as the human-readable output.
- **SC-004**: The `--fix` flag resolves all fixable issues (orphans added to index, stubs created for broken links, index regenerated) such that a subsequent lint run with the same checks reports zero issues in those categories.
- **SC-005**: The `--check <name>` flag runs only the specified check and completes in under 1 second for a wiki with 500 pages.
- **SC-006**: Each check function is independently importable and callable: `import { checkBrokenLinks } from './wiki-lint.mjs'` returns an array of issue objects.
- **SC-007**: The confidence decay calculation produces correct effective confidence values for all page types, verified against hand-calculated expected values in tests.
- **SC-008**: The KG-Wiki consistency check correctly identifies both directions of drift: wiki pages pointing to missing entities, and entities with no corresponding wiki page.
- **SC-009**: The tool completes a full lint run on a wiki with 1,000 pages and 10,000 entities in under 10 seconds.

## Assumptions

- The SQLite database layer from spec 001 and wiki module from spec 002 are fully implemented and available. The lint tool imports `db.mjs` for entity lookups and `wiki.mjs` for `regenerateIndex()` and `slugify()`.
- The `gray-matter` package (already a project dependency) is used for frontmatter parsing, with the same `JSON_SCHEMA` engine configuration as `wiki.mjs` to avoid date coercion issues.
- The wiki directory structure follows spec 002 conventions: four subdirectories (`entities/`, `concepts/`, `topics/`, `comparisons/`) plus `index.md` and `log.md` at the wiki root.
- Wikilink syntax follows Obsidian conventions: `[[target]]` or `[[target|display text]]`. The target portion is matched to filenames (without `.md` extension) using case-insensitive, subdirectory-agnostic resolution (shortest-path).
- The `entities` table does NOT have a `wiki_page` column. The KG-Wiki link is established via the `kg_id` field in wiki page frontmatter pointing to the entity's `id` in SQLite. The reverse lookup (entity → wiki page) requires scanning all wiki pages' frontmatter.
- Confidence decay is a diagnostic calculation, not a persistent state change. The tool never modifies the `confidence` field in page frontmatter. Operators decide whether to update or archive pages flagged for decay.
- Auto-fix for broken links creates stub pages with `type: entity` as the default type. If the operator wants a different type, they edit the stub manually. A future enhancement could infer type from the subdirectory of the referencing page.
- The `wiki/log.md` file is excluded from all checks except index-sync. It is an infrastructure file, not a content page.
- No new npm dependencies are required. The tool uses `gray-matter` (existing), `better-sqlite3` via `db.mjs` (existing), and Node.js built-ins (`fs`, `path`, `process`).
