# Test Fixtures

This directory contains test fixtures for the document ingestion pipeline (feature 009).

## Available Fixtures

### sample.md
A comprehensive Markdown document about Machine Learning Fundamentals with:
- Multiple heading levels (h1, h2, h3)
- Paragraphs and descriptive text
- Lists (bullet and markdown tables)
- Tables with structured data
- ~1000+ words for testing multi-chunk behavior

Used by most unit and integration tests for markdown ingestion.

### sample.pdf and sample.docx
These binary fixtures are NOT committed to the repository. They must be generated from `sample.md` using pandoc:

```bash
# Generate PDF fixture
pandoc sample.md -o sample.pdf

# Generate DOCX fixture
pandoc sample.md -o sample.docx
```

**Prerequisites:**
- Install pandoc: `brew install pandoc` (macOS) or `apt-get install pandoc` (Linux)

These fixtures are used by docling conversion tests to validate PDF and DOCX parsing.

## Usage in Tests

```javascript
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sampleMdPath = resolve(import.meta.url, '../fixtures/sample.md');
const content = readFileSync(sampleMdPath, 'utf-8');
```
