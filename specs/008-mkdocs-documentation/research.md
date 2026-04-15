# Research: MkDocs Documentation Site

**Feature**: 008-mkdocs-documentation  
**Date**: 2026-04-14  

## Research Tasks

### R1: MkDocs + Material Theme Configuration

**Decision**: Use MkDocs 1.6.x with mkdocs-material 9.7.x.

**Rationale**: MkDocs 2.0 is in pre-release and is incompatible with Material for MkDocs. The Material theme team has announced Zensical as the future replacement. For stability, pin to MkDocs 1.x (latest 1.6.1) + mkdocs-material (latest 9.7.6).

**Alternatives considered**:
- MkDocs 2.0: Rejected — incompatible with Material theme as of April 2026
- Docusaurus: Rejected — requires React ecosystem, adds unnecessary complexity for a Node.js/SQLite project
- Jekyll: Rejected — Ruby dependency, less feature-rich for technical documentation
- Sphinx: Rejected — more suited for Python API auto-doc; overkill for manually-written docs

### R2: Mermaid Diagram Support

**Decision**: Use Material's built-in Mermaid support via `pymdownx.superfences` custom fences.

**Rationale**: Material for MkDocs includes native Mermaid rendering. No extra plugins or JavaScript injection needed. Just configure `pymdownx.superfences` with a `mermaid` custom fence and use standard ` ```mermaid ` code blocks.

**Alternatives considered**:
- `mkdocs-mermaid2-plugin`: Rejected — third-party plugin that conflicts with Material's built-in Mermaid support
- External image files (PNG/SVG): Rejected — spec explicitly requires text-based diagrams (FR-010)
- Adding Mermaid via `extra_javascript`: Rejected — Material handles JS injection automatically

### R3: Python Dependency Management

**Decision**: Use `requirements-docs.txt` at project root.

**Rationale**: MkDocs docs are a build artifact, not a Python package. `requirements.txt` is the universal convention across the MkDocs ecosystem (used by Kubernetes ingress-nginx, Renovate, InvenTree, Astral's ty, etc.). Placing it at project root as `requirements-docs.txt` keeps it visible and avoids confusion with any future `requirements.txt` for other purposes.

**Alternatives considered**:
- `pyproject.toml`: Rejected — meant for distributable Python packages; this project is Node.js
- `docs/requirements.txt`: Considered — but root-level is more discoverable for contributors

### R4: Navigation Structure & Features

**Decision**: Use `navigation.tabs` for top-level sections + `navigation.indexes` for section landing pages + `navigation.instant` for SPA-like navigation.

**Rationale**: Five top-level sections (Home, User Guide, Developer Guide, API Reference, Contributing) map naturally to tabs. Each section gets an `index.md` that serves as the section landing page. Instant navigation provides fast page transitions without full reloads.

**Alternatives considered**:
- Single sidebar without tabs: Rejected — too many items in one sidebar for 20+ pages
- Auto-generated nav from directory structure (`awesome-pages-plugin`): Rejected — explicit nav in `mkdocs.yml` gives full control over ordering and display names

### R5: Required Python Packages

**Decision**: Minimal dependency set:
- `mkdocs>=1.6,<2.0` (pin to 1.x)
- `mkdocs-material~=9.7` (theme + pymdownx bundled)
- `mkdocs-minify-plugin~=0.8` (HTML minification for production)

**Rationale**: `mkdocs-material` bundles `pymdownx-extensions`, so no separate install needed. The minify plugin is lightweight and reduces page size. Git revision date plugin omitted to avoid requiring full git history in CI (can be added later if needed).

**Alternatives considered**:
- `mkdocs-git-revision-date-localized-plugin`: Deferred — requires `fetch-depth: 0` in CI, adds complexity for initial setup
- `mkdocs-glightbox`: Deferred — no images in initial documentation (Mermaid diagrams don't need lightbox)

### R6: Key mkdocs.yml Extensions

**Decision**: Include the official recommended extension set from Material docs:
- `admonition` + `pymdownx.details` (collapsible callouts)
- `pymdownx.highlight` + `pymdownx.inlinehilite` (code syntax highlighting with line numbers)
- `pymdownx.superfences` (nested fences + Mermaid)
- `pymdownx.tabbed` (content tabs for multi-language examples)
- `pymdownx.tasklist` (checkbox lists)
- `attr_list` + `md_in_html` (HTML attribute support)
- `toc` with `permalink: true` (anchor links on headings)

**Rationale**: This is the standard extension set used by the Material theme's own documentation site and recommended in their setup guide. It covers all formatting needs for technical documentation.

### R7: Theme Customization

**Decision**: Use light/dark mode toggle with `indigo` primary color. Use system preference detection (`prefers-color-scheme`).

**Rationale**: Indigo is Material's default and works well for technical documentation. Auto-detection of system preference is the modern UX standard. Both light (default scheme) and dark (slate scheme) are included.

### R8: npm Script Integration

**Decision**: Add `"docs:serve": "mkdocs serve"` and `"docs:build": "mkdocs build --strict"` to `package.json` scripts.

**Rationale**: FR-009 requires a script to serve docs locally. The `--strict` flag on build ensures warnings become errors (broken links, missing pages), serving as the primary validation mechanism.
