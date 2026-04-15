# Quickstart: Document Ingestion Pipeline

**Feature**: 009-doc-ingestion-pipeline
**Date**: 2026-04-15

## Prerequisites

1. **Node.js 18+** and npm (already required by the project)
2. **Python 3.10+** — required for document conversion via docling
3. **Ollama** — local embedding server with nomic-embed-text model

### Install docling

```bash
pip install docling
```

### Install and start Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull the embedding model
ollama pull nomic-embed-text

# Start the server (if not running as a service)
ollama serve
```

### Verify setup

```bash
# Check docling
python3 -c "import docling; print(f'docling {docling.__version__}')"

# Check Ollama
curl -s http://localhost:11434/api/embed \
  -d '{"model": "nomic-embed-text", "input": "test"}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Ollama OK: {len(d[\"embeddings\"][0])} dims')"
```

## Usage

### Ingest a local document (PDF, DOCX, PPTX, image)

```javascript
import { initDatabase } from './src/db.mjs';
import { ingestFile } from './src/ingest-file.mjs';

// Initialize database (runs migrations automatically)
const db = initDatabase('./jarvis.db');

// Your LLM provider (same as used with ingestUrl)
const llm = yourLlmProvider;

// Ingest a PDF
const result = await ingestFile('./documents/research-paper.pdf', llm, {
  verbose: true
});

console.log(`Created ${result.entities.length} entities`);
console.log(`Generated ${result.chunks.total} chunks, ${result.chunks.embedded} embedded`);
```

### Ingest a URL (enhanced with chunking)

```javascript
import { ingestUrl } from './src/ingest.mjs';

// Existing API — now also generates chunks and embeddings
const result = await ingestUrl('https://example.com/article', llm);

// Same return format as before, plus new chunk info
console.log(`Chunks: ${result.chunks.total}, embedded: ${result.chunks.embedded}`);
```

### Search by semantic similarity (chunk-level)

```javascript
import { searchSemantic, search } from './src/wiki-search.mjs';

// Semantic search — now returns chunk-level results
const results = await searchSemantic('machine learning optimization techniques');

for (const r of results) {
  console.log(`[${r.score.toFixed(2)}] ${r.name}`);
  if (r.chunk) {
    console.log(`  Section: ${r.chunk.section.join(' > ')}`);
    console.log(`  Passage: ${r.chunk.text.substring(0, 200)}...`);
  }
}

// Unified search (all tiers) still works as before
const unified = await search('neural networks', { maxResults: 10 });
```

### Backfill existing wiki pages

```bash
# Preview what would be processed
node src/backfill.mjs --dry-run --verbose

# Run backfill
node src/backfill.mjs --verbose
```

```javascript
// Programmatic usage
import { backfillWikiPages } from './src/backfill.mjs';

const result = await backfillWikiPages({
  verbose: true,
  dryRun: false
});

console.log(`Processed: ${result.processed}/${result.total}, skipped: ${result.skipped}`);
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `nomic-embed-text` | Embedding model name |
| `OLLAMA_EMBED_DIMENSIONS` | `768` | Expected embedding dimensions |
| `OLLAMA_TIMEOUT_MS` | `60000` | Embedding request timeout (ms) |
| `DOCLING_TIMEOUT_MS` | `120000` | Document conversion timeout (ms) |

## Graceful Degradation

The pipeline is designed to work even when optional dependencies are unavailable:

| Scenario | Behavior |
|----------|----------|
| Ollama not running | Ingestion completes without embeddings; chunks stored; FTS5 search works; semantic search falls back to FTS5 |
| Docling not installed | `ingestFile` for PDF/DOCX/PPTX throws descriptive error; URL/Markdown/text ingestion works normally |
| nomic-embed-text not pulled | Embedding returns descriptive error; pipeline continues without embeddings |

## Supported File Formats

| Format | Extensions | Conversion Method |
|--------|-----------|-------------------|
| PDF | `.pdf` | docling |
| Word | `.docx` | docling |
| PowerPoint | `.pptx` | docling |
| Images | `.png`, `.jpg`, `.jpeg`, `.tiff` | docling (OCR) |
| Markdown | `.md` | pass-through |
| Plain text | `.txt` | pass-through |
| HTML/URLs | N/A | readability (existing) |
