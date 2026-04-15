# Quickstart: MkDocs Documentation Site

**Feature**: 008-mkdocs-documentation  
**Date**: 2026-04-14  

## Prerequisites

- Python 3.8+ and pip installed
- Node.js 18+ (for the OpenClaw KB project itself)
- Git (for repository access)

## Setup

### 1. Install MkDocs dependencies

```bash
pip install -r requirements-docs.txt
```

### 2. Serve documentation locally

```bash
# Via npm script
npm run docs:serve

# Or directly
mkdocs serve
```

The site will be available at `http://127.0.0.1:8000/`.

### 3. Build for production

```bash
# Via npm script (strict mode — warnings become errors)
npm run docs:build

# Or directly
mkdocs build --strict
```

Output is written to `site/` directory (gitignored).

## Verification

After setup, verify the following:

1. **Site builds without errors**: `mkdocs build --strict` exits with code 0
2. **All 5 navigation sections visible**: Home, User Guide, Developer Guide, API Reference, Contributing
3. **Mermaid diagrams render**: Architecture diagram on home page renders as an interactive SVG
4. **Search works**: Type a function name (e.g., `createEntity`) and see results from API Reference
5. **Dark/light toggle works**: Click the brightness icon in the header to switch themes

## Project Structure

```
openclaw-kb/
├── mkdocs.yml              # MkDocs configuration
├── requirements-docs.txt   # Python dependencies for docs
├── docs/                   # Documentation source (Markdown)
│   ├── index.md            # Home page
│   ├── user-guide/         # User-facing guides
│   ├── developer-guide/    # Architecture & internals
│   ├── api-reference/      # Function signatures & examples
│   └── contributing/       # How to contribute
├── package.json            # includes docs:serve and docs:build scripts
└── site/                   # Build output (gitignored)
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run docs:serve` | Start local dev server with hot reload |
| `npm run docs:build` | Build static site (strict mode) |
| `mkdocs gh-deploy --force` | Deploy to GitHub Pages |

## Adding a New Page

1. Create a `.md` file in the appropriate `docs/` subdirectory
2. Add the page to the `nav` section in `mkdocs.yml`
3. Run `mkdocs serve` to verify it renders correctly
4. Use `mkdocs build --strict` to catch broken links
