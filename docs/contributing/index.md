# Contributing

This guide covers everything you need to contribute to OpenClaw Knowledge Base — from setting up your environment to submitting a pull request.

---

## Development Environment Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| Python | 3.x | MkDocs documentation (optional) |
| Git | 2.30+ | Version control |
| SQLite | 3.38+ | Database engine (bundled via `better-sqlite3`) |

### Getting Started

```bash
# Clone the repository
git clone https://github.com/dmetzler/openclaw-kb.git
cd openclaw-kb

# Install dependencies
npm install

# Run the test suite to verify your setup
npm test
```

!!! tip "First-time setup"
    The database file (`jarvis.db`) is created automatically on first use.
    No manual database setup is required.

### Documentation Development (Optional)

If you plan to edit documentation:

```bash
# Install MkDocs dependencies
pip install -r requirements-docs.txt

# Start the local docs server
npm run docs:serve
```

The docs server runs at `http://127.0.0.1:8000` with live reload.

---

## Coding Standards

### Language & Module System

- **JavaScript only** — no TypeScript. The project uses plain JavaScript with ES Modules.
- All source files use the **`.mjs` extension** to indicate ES Module format.
- The project has `"type": "module"` in `package.json`.

```javascript
// ✅ Correct: ES Module imports
import { getDb } from './db.mjs';
import { search } from './wiki-search.mjs';

// ❌ Wrong: CommonJS
const { getDb } = require('./db.mjs');
```

### File Organization

```text
src/           # Application source modules
tests/
  integration/ # Integration tests (Vitest)
docs/          # MkDocs documentation
specs/         # Feature specifications and plans
```

- Source modules live in `src/` as flat `.mjs` files.
- Each module exports public functions; keep internal helpers unexported.
- Database access goes through `src/db.mjs` — never open SQLite connections directly.

### Code Style

| Rule | Convention |
|------|-----------|
| Imports | Named imports, no default exports (except where library requires it) |
| Functions | Use `export function` declarations, not arrow function assignments |
| Async | Prefer `async/await` over raw Promises |
| Error handling | Throw descriptive errors; never swallow exceptions silently |
| SQL | Use parameterized queries (`?` placeholders) — never string interpolation |
| Naming | `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for constants |

### Database Conventions

- All database operations go through the `db.mjs` abstraction layer.
- Schema changes require a numbered migration file in `src/` (see [Writing Migrations](../developer-guide/writing-migrations.md)).
- Foreign keys are enforced (`PRAGMA foreign_keys = ON`).
- WAL mode is enabled for concurrent read performance.

### Validation

- Use [Zod](https://zod.dev/) schemas for input validation where structured data is expected.
- See `src/extractor.mjs` for examples of Zod schema patterns used in the project.

---

## Testing

### Running Tests

```bash
# Run the full test suite
npm test

# Run with verbose output
npx vitest run --reporter=verbose

# Run a specific test file
npx vitest run tests/integration/db.test.mjs

# Run tests matching a pattern
npx vitest run -t "search"

# Watch mode during development
npx vitest
```

### Test Framework

The project uses [Vitest](https://vitest.dev/) `4.1.4` as the test runner.

- Tests live in `tests/integration/`.
- Test files follow the naming pattern `*.test.mjs`.
- Each test file typically mirrors a source module (e.g., `db.test.mjs` tests `src/db.mjs`).

### Writing Tests

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from '../../src/db.mjs';

describe('myFeature', () => {
  let db;

  beforeAll(() => {
    db = getDb(':memory:');
  });

  afterAll(() => {
    db.close();
  });

  it('should do the expected thing', () => {
    const result = someFunction();
    expect(result).toBeDefined();
    expect(result.field).toBe('expected');
  });
});
```

!!! note "In-memory databases for tests"
    Use `getDb(':memory:')` to create an isolated in-memory database for tests.
    This avoids polluting the real `jarvis.db` file.

### Test Requirements for PRs

- All existing tests must pass before submitting a PR.
- New features must include tests covering the primary use cases.
- Bug fixes should include a regression test that reproduces the issue.

---

## Branch Strategy

### Branch Naming

Feature branches follow a numbered convention matching the spec system:

```text
<spec-number>-<short-description>

# Examples
001-sqlite-db-layer
005-hybrid-search
008-mkdocs-documentation
```

For work outside the spec system, use descriptive branch names:

```text
fix/broken-search-scoring
chore/update-dependencies
docs/improve-api-reference
```

### Branching Workflow

```mermaid
gitGraph
    commit id: "main"
    branch 008-mkdocs-documentation
    commit id: "add mkdocs config"
    commit id: "write user guide"
    commit id: "write api reference"
    checkout main
    merge 008-mkdocs-documentation id: "merge feature"
```

1. Create a feature branch from `main`.
2. Make your changes in focused, logical commits.
3. Keep your branch up to date with `main` by rebasing.
4. Open a pull request when ready for review.

---

## Commit Messages

### Format

Use clear, descriptive commit messages following this pattern:

```text
<type>: <short summary>

<optional body with details>
```

### Types

| Type | Usage |
|------|-------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `test` | Adding or updating tests |
| `refactor` | Code restructuring without behavior change |
| `chore` | Maintenance tasks (dependencies, configs) |

### Examples

```text
feat: add hybrid search with BM25 and vector scoring

fix: correct depth scoring calculation for nested wiki pages

docs: write API reference for db.mjs module

test: add integration tests for export/import round-trip

chore: update vitest to 4.1.4
```

!!! warning "Keep commits focused"
    Each commit should represent a single logical change. Avoid mixing
    unrelated changes in one commit.

---

## Pull Request Workflow

### Before Opening a PR

1. **Run the test suite** — all tests must pass:

    ```bash
    npm test
    ```

2. **Check for regressions** — if you changed database schema or search logic, run the full suite with verbose output to verify edge cases.

3. **Update documentation** — if your change modifies a public API (function signature, new export, changed behavior), update the corresponding page in `docs/api-reference/`.

4. **Build the docs** (if you changed any docs):

    ```bash
    npm run docs:build
    ```

### PR Description

Include in your pull request:

- **What** — a clear summary of the change.
- **Why** — the motivation or issue being addressed.
- **How** — a brief description of the approach taken.
- **Testing** — how you verified the change works.

### Review Process

1. Open a PR against `main`.
2. Ensure all CI checks pass (tests, build).
3. Request a review from a maintainer.
4. Address review feedback with additional commits (don't force-push during review).
5. Once approved, the PR will be merged via squash or rebase merge.

---

## Documentation Updates

### When to Update Docs

| Change Type | Documentation Action |
|-------------|---------------------|
| New exported function | Add to the relevant `docs/api-reference/*.md` page |
| Changed function signature | Update parameters/return type in API reference |
| New feature or workflow | Add a User Guide page or update an existing one |
| Architecture change | Update `docs/developer-guide/architecture.md` |
| New schema migration | Document in `docs/developer-guide/writing-migrations.md` |
| New dependency | Note in the relevant developer guide page |

### Documentation Standards

- Use **admonitions** (`!!! note`, `!!! warning`, `!!! tip`) for callouts.
- Use **Mermaid** diagrams for architecture and flow visualizations — no image files.
- Include **code examples** with language hints (` ```javascript `, ` ```bash `, ` ```sql `).
- Use **tables** for parameter lists, options, and comparisons.
- Link to related pages using **relative paths** (e.g., `[db.mjs](../api-reference/db.md)`).

### Building and Previewing Docs

```bash
# Live preview with hot reload
npm run docs:serve

# Production build with strict validation
npm run docs:build
```

The strict build catches broken links, missing pages, and configuration errors.

---

## Getting Help

- Review the [Developer Guide](../developer-guide/architecture.md) for architecture details.
- Check the [API Reference](../api-reference/index.md) for function signatures.
- Open an issue for bugs or feature proposals.
