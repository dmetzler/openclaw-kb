# Feature Specification: Wiki Structure, Templates & Ingestion Pipeline

**Feature Branch**: `002-wiki-ingestion-pipeline`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "Wiki structure, templates, and ingestion pipeline for the OpenClaw Knowledge Base. This feature builds on the SQLite foundation (spec 001) and adds: (1) Wiki directory structure with Obsidian-compatible pages (wiki/entities/, wiki/concepts/, wiki/topics/, wiki/comparisons/), (2) wiki/index.md auto-generated catalog of all pages, (3) wiki/log.md append-only operation chronology, (4) Page templates with YAML frontmatter (id, type, created, updated, sources, confidence, related, kg_id) and Obsidian wikilinks [[page-name|Display Name]], (5) Ingestion pipeline: fetch URL or accept text -> save to raw/ with frontmatter -> LLM extracts entities/concepts/facts -> creates or updates wiki pages + KG entities in SQLite -> updates index.md and log.md, (6) raw/ directory for immutable source archival with YAML frontmatter (title, source, date, author, tags). All links must use Obsidian wikilinks format. Wiki pages are Markdown only, no HTML. File names must be unique across all wiki subdirectories. The wiki folder is designed to be a subfolder of an Obsidian vault synced via Google Drive."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ingest a URL and Generate Wiki Pages (Priority: P1)

A knowledge base operator provides a URL to the ingestion pipeline. The system fetches the content, saves it as an immutable raw source file in the `raw/` directory with full provenance frontmatter, then uses an LLM to extract entities, concepts, and facts from the content. For each extracted item, the system creates or updates the corresponding wiki page in the correct subdirectory (`wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, or `wiki/comparisons/`), creates or updates matching Knowledge Graph entities and relations in the SQLite database, and finally updates `wiki/index.md` and `wiki/log.md` to reflect the new or changed pages.

**Why this priority**: The ingestion pipeline is the primary way content enters the knowledge base. Without it, pages must be created manually, defeating the purpose of an automated knowledge management system.

**Independent Test**: Can be fully tested by providing a URL (or mock content), running the pipeline, and verifying that raw source is archived, wiki pages are created with correct frontmatter and wikilinks, KG entities exist in SQLite, and both index and log are updated.

**Acceptance Scenarios**:

1. **Given** the ingestion pipeline is available, **When** the operator provides a URL pointing to a web article, **Then** the system fetches the content and saves it as a Markdown file in `raw/` with YAML frontmatter containing title, source URL, fetch date, author (if available), and tags.
2. **Given** a raw source has been saved, **When** the LLM extraction step runs, **Then** the system identifies entities, concepts, and facts from the content and produces structured output specifying which wiki pages to create or update.
3. **Given** extracted items include a new entity not yet in the wiki, **When** the page creation step runs, **Then** a new Markdown file is created in `wiki/entities/` with YAML frontmatter (id, type, created, updated, sources, confidence, related, kg_id) and content using Obsidian wikilinks for cross-references.
4. **Given** an extracted entity already has a wiki page, **When** the page update step runs, **Then** the existing page's content is merged with new information, the `updated` timestamp and `sources` list in frontmatter are updated, and the original page is not overwritten destructively.
5. **Given** wiki pages have been created or updated, **When** the pipeline completes, **Then** `wiki/index.md` is regenerated to list all pages across all subdirectories, and `wiki/log.md` has a new entry appended recording what was ingested and what pages were affected.

---

### User Story 2 - Ingest Raw Text Content (Priority: P1)

A knowledge base operator provides text content directly (e.g., pasted notes, a document excerpt, or manually typed information) instead of a URL. The system saves it as a raw source file with appropriate frontmatter and processes it through the same LLM extraction and page generation pipeline as URL-sourced content.

**Why this priority**: Not all knowledge originates from URLs. Manual text input is equally critical for capturing meeting notes, personal observations, and content from non-web sources.

**Independent Test**: Can be fully tested by providing a text string with a title, running the pipeline, and verifying raw archival, page creation, KG updates, and index/log updates.

**Acceptance Scenarios**:

1. **Given** the operator provides text content with a title, **When** the ingestion pipeline runs, **Then** a raw source file is created in `raw/` with frontmatter where `source` is set to "manual" and the provided title is used.
2. **Given** text content containing references to multiple concepts and entities, **When** the LLM extraction runs, **Then** the system identifies and creates or updates corresponding wiki pages and KG entities, identical to URL-sourced processing.

---

### User Story 3 - Browse the Wiki in Obsidian (Priority: P2)

A user opens the `wiki/` folder as part of an Obsidian vault (synced via Google Drive). They see a navigable collection of Markdown pages organized by type. Each page's YAML frontmatter is displayed by Obsidian's properties view. Wikilinks like `[[entity-name|Display Name]]` create clickable connections between pages. The user can use Obsidian's graph view to visualize relationships, search across pages, and follow links naturally.

**Why this priority**: The wiki must be Obsidian-compatible to deliver on its core value proposition — a human-browsable, linked knowledge base that integrates with existing note-taking workflows and syncs via Google Drive.

**Independent Test**: Can be fully tested by generating sample wiki pages, opening the `wiki/` folder in Obsidian, and verifying that frontmatter renders correctly, wikilinks resolve to existing pages, and the graph view reflects page connections.

**Acceptance Scenarios**:

1. **Given** wiki pages exist in `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, and `wiki/comparisons/`, **When** a user opens the `wiki/` folder in Obsidian, **Then** all pages are visible in the file explorer organized by subdirectory.
2. **Given** a page contains wikilinks like `[[another-page|Display Text]]`, **When** the user clicks the link in Obsidian, **Then** Obsidian navigates to the linked page (or shows it as an unresolved link if the page doesn't exist yet).
3. **Given** pages have YAML frontmatter with `id`, `type`, `created`, `updated`, `sources`, `confidence`, `related`, and `kg_id` fields, **When** the user views a page in Obsidian, **Then** the frontmatter is parseable and displayed in Obsidian's properties panel.
4. **Given** no wiki page contains HTML markup, **When** the user views any page, **Then** the content renders correctly as pure Markdown without rendering artifacts.

---

### User Story 4 - Consult the Wiki Index (Priority: P2)

A user opens `wiki/index.md` to see a complete catalog of all pages in the knowledge base. The index lists every page across all subdirectories, grouped by type (entities, concepts, topics, comparisons), with wikilinks to each page. The index is regenerated automatically whenever pages are added, updated, or removed through the ingestion pipeline.

**Why this priority**: The index provides a structured entry point for navigating the knowledge base without relying solely on Obsidian's search or graph view. It serves as a table of contents.

**Independent Test**: Can be fully tested by creating several wiki pages across different subdirectories, regenerating the index, and verifying all pages are listed with correct groupings and wikilinks.

**Acceptance Scenarios**:

1. **Given** wiki pages exist across multiple subdirectories, **When** the index is regenerated, **Then** `wiki/index.md` contains a section for each type (entities, concepts, topics, comparisons) listing all pages in that subdirectory with wikilinks.
2. **Given** a new page has been added through the ingestion pipeline, **When** the pipeline completes, **Then** the new page appears in `wiki/index.md` under the correct type section.
3. **Given** a page has been removed, **When** the index is regenerated, **Then** the removed page no longer appears in the index.

---

### User Story 5 - Review the Operation Log (Priority: P3)

A user opens `wiki/log.md` to see a chronological record of all ingestion operations. Each log entry records what was ingested (URL or text title), when it happened, and which pages were created or updated. The log is append-only — entries are never modified or removed.

**Why this priority**: The operation log provides auditability and traceability. It answers "when did this information enter the knowledge base?" and "what was affected by a particular ingestion?"

**Independent Test**: Can be fully tested by running multiple ingestion operations and verifying log entries are appended in chronological order with correct details.

**Acceptance Scenarios**:

1. **Given** the ingestion pipeline processes a URL, **When** the pipeline completes, **Then** a new entry is appended to `wiki/log.md` containing the timestamp, source URL, and a list of pages created or updated.
2. **Given** multiple ingestion operations run sequentially, **When** the user reads `wiki/log.md`, **Then** entries appear in chronological order with the most recent at the bottom.
3. **Given** an existing `wiki/log.md` with previous entries, **When** a new ingestion runs, **Then** previous entries are preserved and the new entry is appended without modifying existing content.

---

### User Story 6 - Ensure File Name Uniqueness Across Wiki (Priority: P2)

When the ingestion pipeline creates a new page, the system ensures the chosen file name is unique across all wiki subdirectories — not just within the target subdirectory. If a name collision would occur, the system resolves it by appending a disambiguating suffix.

**Why this priority**: File name uniqueness is critical for Obsidian wikilinks to resolve unambiguously. If `wiki/entities/python.md` and `wiki/concepts/python.md` both exist, wikilinks like `[[python]]` become ambiguous.

**Independent Test**: Can be fully tested by attempting to create two pages with the same name in different subdirectories and verifying the second gets a disambiguated name.

**Acceptance Scenarios**:

1. **Given** `wiki/entities/python.md` already exists, **When** the pipeline attempts to create a concept page also named `python`, **Then** the concept page is created with a disambiguated name (e.g., `python-concept.md`) and all wikilinks referencing it use the disambiguated name.
2. **Given** no naming collision exists, **When** a new page is created, **Then** the page uses the natural name derived from the entity/concept without any suffix.

---

### Edge Cases

- What happens when the ingestion pipeline fetches a URL that returns an error (404, timeout, paywall)?
- How does the system handle a raw source file that the LLM cannot extract meaningful entities from (e.g., a page with only images or non-textual content)?
- What happens when the same URL is ingested a second time — does it create a duplicate raw file or recognize and update?
- How does the system handle very long entity/concept names that would create excessively long file names?
- What happens if `wiki/index.md` or `wiki/log.md` is manually edited or deleted?
- How does the system handle YAML frontmatter that becomes malformed (e.g., special characters in titles)?
- What happens when an ingestion operation partially fails (some pages created, others not)?
- How does the system behave when the wiki directory does not yet exist on first run?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a wiki directory structure with four subdirectories: `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, and `wiki/comparisons/`. Each subdirectory contains Markdown pages of the corresponding type.
- **FR-002**: System MUST maintain a `raw/` directory for immutable source archival. Each raw file is a Markdown file with YAML frontmatter containing `title`, `source` (URL or "manual"), `date` (fetch/creation date), `author` (if available, otherwise omitted), and `tags` (list). Raw files MUST NOT be modified after creation.
- **FR-003**: Every wiki page MUST use YAML frontmatter with the following fields: `id` (unique string identifier), `type` (entity, concept, topic, or comparison), `created` (ISO 8601 timestamp), `updated` (ISO 8601 timestamp), `sources` (list of raw file references), `confidence` (float 0.0–1.0), `related` (list of wikilink references to other pages), and `kg_id` (matching Knowledge Graph entity ID in SQLite).
- **FR-004**: All cross-references between wiki pages MUST use Obsidian wikilink syntax: `[[page-name|Display Name]]`. No HTML links permitted.
- **FR-005**: Wiki pages MUST be pure Markdown. No HTML markup is permitted in any wiki page.
- **FR-006**: File names MUST be unique across all wiki subdirectories (`wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, `wiki/comparisons/`). The system MUST check for collisions before creating a page and resolve them by appending a type-based disambiguating suffix.
- **FR-007**: System MUST auto-generate `wiki/index.md` as a catalog of all wiki pages, grouped by type (entities, concepts, topics, comparisons), with wikilinks to each page. The index MUST be regenerated whenever pages are added, updated, or removed.
- **FR-008**: System MUST maintain `wiki/log.md` as an append-only chronological log of all ingestion operations. Each entry MUST include the timestamp, source (URL or text title), and a list of pages created or updated.
- **FR-009**: The ingestion pipeline MUST accept a URL as input, fetch the page content, and save it as a raw source file in `raw/` with complete provenance frontmatter before proceeding to extraction.
- **FR-010**: The ingestion pipeline MUST accept raw text as input (with a title), save it as a raw source file in `raw/` with frontmatter where `source` is "manual", and proceed through the same extraction pipeline as URL content.
- **FR-011**: The ingestion pipeline MUST use an LLM to extract entities, concepts, and facts from raw source content, producing structured output that specifies which wiki pages to create or update and what content to include.
- **FR-012**: For each extracted item, the ingestion pipeline MUST create or update the corresponding wiki page in the correct subdirectory AND create or update the matching Knowledge Graph entity and relations in the SQLite database (using the db.mjs abstraction layer from spec 001).
- **FR-013**: When updating an existing wiki page, the system MUST merge new information with existing content, update the `updated` timestamp and `sources` list in frontmatter, and preserve any manually added content.
- **FR-014**: When a URL is ingested that has already been fetched before (duplicate URL), the system MUST create a new raw file (raw files are immutable) but MUST merge extracted information into existing wiki pages rather than creating duplicates.
- **FR-015**: The system MUST handle URL fetch failures (HTTP errors, timeouts, unreachable hosts) by reporting the error and halting the pipeline for that input without creating any raw file or wiki pages.
- **FR-016**: File names for wiki pages MUST be derived from the entity/concept name, lowercased, with spaces replaced by hyphens, and non-alphanumeric characters (except hyphens) removed. Names exceeding 80 characters MUST be truncated and suffixed with a hash for uniqueness.
- **FR-017**: The system MUST create the `wiki/` directory structure and `raw/` directory automatically on first run if they do not already exist.
- **FR-018**: If the LLM extraction produces no meaningful entities or concepts from a raw source, the system MUST still archive the raw file, log the operation with a note that no pages were generated, and complete without error.
- **FR-019**: When an ingestion operation partially fails (some pages created, others fail), the system MUST log the partial failure in `wiki/log.md`, leave successfully created pages intact, and report which items failed.

### Key Entities

- **Raw Source**: An immutable archived document in `raw/` representing fetched or manually provided content. Has title, source URL or "manual" indicator, date, author, and tags.
- **Wiki Page**: A Markdown file in a wiki subdirectory representing a single entity, concept, topic, or comparison. Has structured YAML frontmatter linking it to the Knowledge Graph and other pages via wikilinks.
- **Wiki Index**: An auto-generated catalog page (`wiki/index.md`) listing all wiki pages grouped by type with wikilinks.
- **Operation Log Entry**: An append-only record in `wiki/log.md` documenting a single ingestion operation — what was ingested, when, and what pages were affected.
- **Extraction Result**: The structured output from the LLM step, specifying entities, concepts, facts, and relationships extracted from a raw source.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can ingest a URL and have all resulting wiki pages, KG entities, index, and log updates completed within a single pipeline execution.
- **SC-002**: An operator can ingest raw text and have the same complete pipeline output as URL ingestion.
- **SC-003**: All wiki pages open and render correctly in Obsidian, with frontmatter displayed in the properties panel and wikilinks resolving to existing pages.
- **SC-004**: The wiki index (`wiki/index.md`) accurately reflects 100% of wiki pages across all subdirectories at all times after pipeline execution.
- **SC-005**: The operation log (`wiki/log.md`) contains a complete, append-only chronological record of every ingestion operation performed.
- **SC-006**: No two wiki pages across any subdirectory share the same file name.
- **SC-007**: Every wiki page has a corresponding Knowledge Graph entity in the SQLite database, linked by the `kg_id` frontmatter field.
- **SC-008**: No wiki page contains HTML markup — all pages are pure Markdown with Obsidian wikilinks.
- **SC-009**: Raw source files are never modified after creation — subsequent ingestions of the same URL create new raw files.
- **SC-010**: The wiki directory structure is fully compatible as a subfolder within an Obsidian vault synced via Google Drive, with no file naming or path constraints that would break sync.

## Assumptions

- The SQLite database layer from spec 001 is fully implemented and available. The ingestion pipeline uses `db.mjs` for all KG entity and relation operations.
- The LLM used for content extraction is accessed via an external API call. The specific LLM provider and model are configurable but out of scope for this spec — the pipeline defines the extraction interface (input: raw text, output: structured entities/concepts/facts), not the LLM implementation.
- The `confidence` field in wiki page frontmatter is populated by the LLM extraction step, representing the LLM's assessment of extraction accuracy. Its scale (0.0–1.0) is a relative indicator, not a calibrated probability.
- File names are sanitized to be compatible with all major operating systems (Windows, macOS, Linux) and Google Drive sync. This means lowercase, hyphens instead of spaces, no special characters, and a maximum length of 80 characters before truncation.
- The wiki is designed to be a subfolder of an Obsidian vault. It does not need to function as a standalone vault — it may rely on vault-level settings (e.g., `.obsidian/` config) residing in a parent directory.
- Obsidian's "shortest path" wikilink resolution is assumed. Since file names are unique across all subdirectories, `[[page-name]]` resolves unambiguously without needing to specify the subdirectory path.
- Raw files in `raw/` use a naming convention of `YYYY-MM-DD-slugified-title.md` to allow chronological sorting. If the same title is ingested on the same day, a numeric suffix is appended (e.g., `-2`).
- The ingestion pipeline runs as a CLI command or programmatic function call — there is no web UI or API server in scope. The operator interacts via the command line or imports the module directly.
- Google Drive sync compatibility requires avoiding characters that Google Drive prohibits in file names (`:`, `*`, `?`, `"`, `<`, `>`, `|`, `\`). The file naming rules already enforce this.
