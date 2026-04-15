# Feature Specification: MkDocs Documentation Site

**Feature Branch**: `008-mkdocs-documentation`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "Comprehensive MkDocs documentation for the OpenClaw Knowledge Base project using Material theme"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Discovers the Project (Priority: P1)

A developer or AI agent builder discovers OpenClaw KB and needs to understand what it does, how to install it, and how it is structured before deciding to use it.

**Why this priority**: Without a clear landing page and quick-start guide, no user can adopt the project. This is the front door.

**Independent Test**: Can be fully tested by opening the docs site, reading the home page, and following the quick-install steps to get a working database.

**Acceptance Scenarios**:

1. **Given** a user visits the documentation site, **When** they read the home page, **Then** they understand what OpenClaw KB does, see the 3-tier architecture diagram, and find a quick-install section with copy-paste commands.
2. **Given** a user follows the quick-install instructions, **When** they run the listed commands, **Then** they have a working `jarvis.db` database and can verify it with a simple query.

---

### User Story 2 - Agent Builder Integrates the KB (Priority: P1)

An OpenClaw agent builder wants to install the KB skill, configure a database path, ingest articles from URLs, search across all three tiers, manage wiki pages via Obsidian, and export/import data for backup.

**Why this priority**: This is the primary use case. The user guide must enable self-service usage without reading source code.

**Independent Test**: Can be tested by following each user guide section in sequence: install skill, configure DB, ingest a URL, search, browse wiki in Obsidian, export, import.

**Acceptance Scenarios**:

1. **Given** a user reads the "Installing the Skill" section, **When** they follow the instructions, **Then** the KB skill is available in their OpenClaw agent.
2. **Given** a user reads the "Ingesting Sources" section, **When** they run `node src/ingest.mjs <url>`, **Then** the article is fetched, entities are extracted, wiki pages are created, and the KG is populated.
3. **Given** a user reads the "Searching the KB" section, **When** they understand the 3-tier model (KG, Data Lake, Semantic), **Then** they know which tier to query for facts vs. metrics vs. discovery.
4. **Given** a user reads the "Export & Import" section, **When** they follow the export/import commands, **Then** they can back up and restore their entire knowledge base.

---

### User Story 3 - Developer Understands the Architecture (Priority: P2)

A contributor or maintainer needs to understand the internal architecture: the SQLite unified schema, the 3-tier data model, how the ingestion pipeline works, how search merges results, and how to extend the data lake with new record types.

**Why this priority**: Essential for contributors and maintainers, but not required for basic usage.

**Independent Test**: Can be tested by reading the developer guide and answering: "How does a URL become a wiki page?" and "How does the search system rank results across tiers?"

**Acceptance Scenarios**:

1. **Given** a developer reads the architecture deep-dive, **When** they trace a URL through the ingestion pipeline, **Then** they understand each step: fetch, extract, archive, create/update pages, update KG, regenerate index.
2. **Given** a developer reads the search internals, **When** they understand BM25 normalization, vector distance conversion, and tier priority deduplication, **Then** they can debug search quality issues.
3. **Given** a developer reads "Adding New Data Types," **When** they want to add a custom record type, **Then** they know to use `insertRecord()` with a new `record_type` string without modifying the schema.

---

### User Story 4 - Developer Looks Up API Signatures (Priority: P2)

A developer writing code against the KB needs to look up specific function signatures, parameters, return types, and usage examples for all public modules.

**Why this priority**: API reference is critical for developer productivity but depends on the architecture understanding from Story 3.

**Independent Test**: Can be tested by looking up any exported function (e.g., `createEntity`, `search`, `exportDatabase`) and finding its full signature, parameter descriptions, return type, and a code example.

**Acceptance Scenarios**:

1. **Given** a developer visits the API reference for `db.mjs`, **When** they look up `createEntity`, **Then** they find the function signature, parameter types with defaults, return type, validation rules, and a usage example.
2. **Given** a developer visits the API reference for `wiki-search.mjs`, **When** they look up `search`, **Then** they find the options object schema, tier selection, deduplication behavior, and return type.
3. **Given** a developer visits the API reference for `kb-export.mjs`, **When** they look up `exportDatabase`, **Then** they find the output directory structure, all 6 file formats (JSONL/JSON), and CLI usage.

---

### User Story 5 - Contributor Learns How to Contribute (Priority: P3)

A new contributor wants to understand coding standards, testing requirements, branch strategy, and how to submit changes.

**Why this priority**: Important for community growth but not blocking for initial adoption.

**Independent Test**: Can be tested by reading the contributing guide and knowing: which linting rules apply, how to run tests, what commit message format to use, and how to submit a PR.

**Acceptance Scenarios**:

1. **Given** a contributor reads the contributing guide, **When** they make a change, **Then** they know to create a feature branch, write tests, follow the constitution's coding standards, and submit a PR with a description.

---

### Edge Cases

- What happens when a user serves the docs locally without Python installed? The guide should note the Python/pip prerequisite for MkDocs.
- What happens when source code changes but docs are not updated? The contributing guide should note that docs updates are required for API changes.
- What happens if the docs reference a function that has been renamed or removed? The API reference should be manually maintained and verified against source during reviews.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Documentation site MUST include a home page with project overview, quick install guide, and a visual representation of the 3-tier architecture (KG, Data Lake, Semantic Index).
- **FR-002**: Documentation site MUST include a User Guide covering: skill installation, database configuration, article ingestion, 3-tier search usage, wiki management with Obsidian, export/import workflows, and Google Drive sync with rclone.
- **FR-003**: Documentation site MUST include a Developer Guide covering: architecture deep-dive, `db.mjs` API overview, wiki structure and conventions, ingestion pipeline internals, search system internals, wiki-lint system, export/import format specifications, KG migration, adding new data types, and writing migrations.
- **FR-004**: Documentation site MUST include an API Reference section with function signatures, parameter descriptions, return types, and usage examples for all public functions in: `db.mjs`, `wiki-search.mjs`, `wiki.mjs`, `ingest.mjs`, `extractor.mjs`, `fetcher.mjs`, `kb-export.mjs`, `kb-import.mjs`, `kg-migrate.mjs`, `csv.mjs`.
- **FR-005**: Documentation site MUST include a Contributing section covering coding standards (from constitution.md), testing requirements, branch strategy, and PR workflow.
- **FR-006**: Documentation site MUST use MkDocs with the Material for MkDocs theme, with search enabled and a structured navigation sidebar.
- **FR-007**: A `mkdocs.yml` configuration file MUST be created at the project root with Material theme settings, navigation structure, and search plugin enabled.
- **FR-008**: All documentation content MUST be Markdown files placed in a `docs/` directory following MkDocs conventions.
- **FR-009**: The project's `package.json` MUST include a script to serve docs locally (e.g., `"docs:serve": "mkdocs serve"`).
- **FR-010**: The 3-tier architecture MUST be represented as a text-based diagram (Mermaid or ASCII art) that renders in the Material theme without external image dependencies.
- **FR-011**: The API reference MUST document all 35+ exported functions from `db.mjs` grouped by domain: Lifecycle, Entities, Relations, Search & Traversal, Embeddings, Data Sources & Records, Bulk Import, Statistics, Transactions.
- **FR-012**: The search system documentation MUST explain the scoring algorithms: BM25 normalization, vector distance-to-similarity conversion, graph depth scoring, and weighted fusion with redistribution.
- **FR-013**: The export/import documentation MUST include format specifications with example JSONL/JSON payloads showing actual field structures.

### Key Entities

- **Documentation Page**: A Markdown file in `docs/` that represents one section or topic. Has a title, content body, and position in the navigation hierarchy.
- **Navigation Structure**: The hierarchical menu defined in `mkdocs.yml` that organizes documentation pages into sections (Home, User Guide, Developer Guide, API Reference, Contributing).
- **MkDocs Configuration**: The `mkdocs.yml` file that defines site metadata, theme settings, navigation, plugins, and extensions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from zero knowledge to a working `jarvis.db` database in under 5 minutes by following the quick-start guide.
- **SC-002**: Every public function across all 10 source modules has a documented signature, parameter list, return type, and at least one usage example in the API reference.
- **SC-003**: The documentation site builds without errors when running `mkdocs build` and serves locally via `mkdocs serve`.
- **SC-004**: The navigation sidebar contains all five top-level sections (Home, User Guide, Developer Guide, API Reference, Contributing) with appropriate subsections.
- **SC-005**: A developer can answer "How does a URL become a wiki page?" and "How does 3-tier search rank results?" by reading the developer guide without consulting source code.
- **SC-006**: The contributing guide accurately reflects the project's constitution (coding standards, testing requirements, branch strategy) as defined in `.specify/memory/constitution.md`.

## Assumptions

- Python 3 and pip are available on the developer's machine for running MkDocs. The docs will note this prerequisite.
- The Material for MkDocs theme is the standard `mkdocs-material` PyPI package. No paid/Insiders features are required.
- API documentation is manually written (not auto-generated from source) to ensure quality and include examples. This means docs must be updated when APIs change.
- The Google Drive sync section describes an rclone-based workflow, not a built-in feature. The docs will present it as an optional setup guide.
- Wiki-lint (`specs/007-wiki-lint`) is specified but may not yet be fully implemented. The docs will document the planned behavior based on the spec.
- The documentation site is intended for local serving and GitHub Pages deployment. No custom hosting infrastructure is assumed.
- Mermaid diagrams are used for architecture visuals since Material for MkDocs supports Mermaid natively.
