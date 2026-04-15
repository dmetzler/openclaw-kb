# API Quick Reference

All exported functions organized by module. Source paths relative to repo root.

## ../src/db.mjs

### Constants

| Export | Value | Description |
|--------|-------|-------------|
| `EMBEDDING_DIMENSIONS` | `384` | Entity embedding vector dimensions |
| `CHUNK_EMBEDDING_DIMENSIONS` | `768` | Chunk embedding vector dimensions |

### Database Lifecycle

| Function | Description |
|----------|-------------|
| `initDatabase(dbPath?)` | Open/create SQLite DB, apply migrations, seed schemas. Default `'jarvis.db'` |
| `closeDatabase()` | Close DB connection. Idempotent, safe to call multiple times |
| `getSchemaVersion()` | Returns latest migration version string or `null` |
| `getMigrationHistory()` | Returns `[{version, name, applied_at}]` |

### Entity CRUD

| Function | Description |
|----------|-------------|
| `createEntity({name, type, metadata?})` | Create KG entity. Returns `{id, name, type, metadata, created_at, updated_at}` |
| `getEntity(id)` | Get entity by ID or `null` |
| `updateEntity(id, {name?, type?, metadata?})` | Update entity fields. Throws if not found |
| `deleteEntity(id)` | Delete entity + cascade relations. Returns `boolean` |
| `getAllEntities()` | All entities ordered by id ASC |

### Relation CRUD

| Function | Description |
|----------|-------------|
| `createRelation({source_id, target_id, type, metadata?})` | Create directed relation. Throws on duplicate/self-ref |
| `getRelationsFrom(entityId)` | Outbound relations from entity |
| `getRelationsTo(entityId)` | Inbound relations to entity |
| `deleteRelation(id)` | Delete relation by ID. Returns `boolean` |
| `getAllRelations()` | All relations ordered by id ASC |

### Graph Traversal

| Function | Description |
|----------|-------------|
| `traverseGraph(startEntityId, maxDepth)` | Recursive traversal, cycle-safe. Returns `[{id, name, type, depth, path}]` |

### Entity Embeddings (384-dim)

| Function | Description |
|----------|-------------|
| `upsertEmbedding(entityId, vector)` | Store/replace entity embedding. Throws on dim mismatch |
| `deleteEmbedding(entityId)` | Remove embedding. Returns `boolean` |
| `findNearestVectors(queryVector, k?)` | KNN search. Returns `[{entity_id, distance}]`. Default k=5 |
| `getAllEmbeddings()` | All embeddings as `[{entity_id, embedding: Float32Array}]` |

### Data Sources

| Function | Description |
|----------|-------------|
| `createDataSource({name, type, config?})` | Register data source (unique name). Returns `{id, name, type, config, is_active, ...}` |
| `getDataSource(id)` | Get source by ID or `null` |
| `updateDataSource(id, {name?, type?, config?, is_active?})` | Update source fields |
| `getAllDataSources()` | All sources ordered by id ASC |

### Data Records

| Function | Description |
|----------|-------------|
| `insertRecord(recordType, data)` | Insert typed record. Validates against schema if registered. `data.source_id` required |
| `queryRecords(recordType, filters?)` | Query by type. Filters: `{source_id, from, to, jsonFilters, limit, offset}` |
| `getAllDataRecords()` | All records ordered by id ASC |
| `getRecordCounts()` | Counts per table and per record_type |

### Schema Registry

| Function | Description |
|----------|-------------|
| `registerSchema(recordType, label, description, jsonSchema, example)` | Register/update schema. Auto-generates wiki page |
| `getSchema(recordType)` | Full schema object or `null` |
| `listSchemas()` | List `[{record_type, label, description}]` |
| `validateRecord(recordType, data)` | Returns `{valid, errors}`. Throws if type unregistered |

### Full-Text Search (FTS5)

| Function | Description |
|----------|-------------|
| `search(query, {source_table?, limit?})` | FTS5 search. Returns `[{source_table, source_id, name, snippet, rank}]` |

### Chunks & Chunk Embeddings (768-dim)

| Function | Description |
|----------|-------------|
| `insertChunk(entityId, chunkIndex, content, metadata?)` | Insert chunk. Returns chunk ID |
| `getChunks(entityId)` | All chunks for entity, ordered by chunk_index |
| `deleteChunksForEntity(entityId)` | Delete all chunks + cascade vec/FTS. Returns count |
| `upsertChunkEmbedding(chunkId, vector)` | Store/replace 768-dim chunk embedding |
| `findNearestChunks(queryVector, k?)` | KNN on chunks. Returns `[{chunk_id, distance}]`. Default k=20 |
| `getChunkWithEntity(chunkId)` | Returns `{chunk, entity}` or `null` |

### Import (bulk, explicit IDs)

| Function | Description |
|----------|-------------|
| `importEntity(row)` | Import entity with explicit `{id, name, type, metadata, created_at, updated_at}` |
| `importRelation(row)` | Import relation with explicit `{id, source_id, target_id, type, metadata, created_at}` |
| `importDataSource(row)` | Import source with explicit `{id, name, type, config, is_active, created_at, updated_at}` |
| `importDataRecord(row)` | Import record with explicit `{id, source_id, record_type, data, recorded_at, created_at}` |

### Transaction

| Function | Description |
|----------|-------------|
| `runTransaction(fn)` | Wrap callback in atomic SQLite transaction. Returns fn's return value |

---

## ../src/wiki-search.mjs

| Function | Description |
|----------|-------------|
| `searchKG(query)` | Tier 1: FTS5 on entities + graph traversal (depth 2). Returns `SearchResult[]` |
| `searchData(query, recordType?)` | Tier 2: FTS5 on data records, optional type filter. Returns `SearchResult[]` |
| `searchSemantic(query, options?)` | Tier 3: FTS5 + vec0 combined. Options: `{ftsWeight, vectorWeight, minScore, maxResults, queryVector}`. Returns `Promise<SearchResult[]>` |
| `search(query, options?)` | Unified 3-tier search. Options: `{maxResults, tiers, includeScores}`. Returns `Promise<SearchResult[]>` |

---

## ../src/ingest.mjs

| Function | Description |
|----------|-------------|
| `ingestUrl(url, llm, options?)` | URL → fetch → extract → chunk → embed → wiki. Options: `{wikiDir, rawDir, fetchTimeout}`. Returns `Promise<IngestResult>` |
| `ingestText(title, text, llm, options?)` | Raw text → extract → chunk → embed → wiki. Options: `{wikiDir, rawDir}`. Returns `Promise<IngestResult>` |

`IngestResult`: `{ok, rawFile, pagesCreated, pagesUpdated, pagesFailed, entitiesCreated, relationsCreated, chunks: {total, embedded}}`

---

## ../src/ingest-file.mjs

| Function | Description |
|----------|-------------|
| `ingestFile(filePath, llm, options?)` | File → convert → extract → chunk → embed → wiki. Options: `{skipEmbedding, verbose, wikiDir, rawDir}`. Returns `Promise<FileIngestResult>` |

---

## ../src/wiki.mjs

| Function | Description |
|----------|-------------|
| `slugify(name)` | Convert name to filesystem-safe slug |
| `rawFileName(title, date?, options?)` | Generate `YYYY-MM-DD-slug.md` filename |
| `createPage(entity, rawFile, options?)` | Create wiki page + KG entity. Returns `{fileName, filePath, kgId}` |
| `updatePage(fileName, newEntity, rawFile, options?)` | Merge new info into existing page. Returns `{fileName, filePath, kgId}` |
| `readPage(fileName, options?)` | Parse page + frontmatter. Returns `{data, content, filePath}` or `null` |
| `findPage(entityName, options?)` | Search wiki dirs for matching page. Returns `{fileName, filePath, type}` or `null` |
| `appendLog(entry, options?)` | Append to `wiki/log.md` |
| `regenerateIndex(options?)` | Rebuild `wiki/index.md`. Returns `{pageCount, filePath}` |

---

## ../src/embedder.mjs

| Function | Description |
|----------|-------------|
| `embed(text, options?)` | Query embedding (prepends `search_query:`). Returns `Promise<Float32Array \| null>` |
| `embedDocument(text, options?)` | Document embedding (prepends `search_document:`). Returns `Promise<Float32Array \| null>` |
| `embedBatch(texts, options?)` | Batch embeddings. Returns `Promise<(Float32Array \| null)[]>` |
| `isOllamaAvailable(options?)` | Check Ollama + model availability. Cached 30s. Returns `Promise<boolean>` |

Env: `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `nomic-embed-text`), `OLLAMA_TIMEOUT_MS` (default `60000`)

---

## ../src/extractor.mjs

| Function | Description |
|----------|-------------|
| `extract(text, llm, options?)` | LLM entity extraction with Zod validation. Options: `{maxRetries}`. Returns `Promise<{entities, relations, topics, summary}>` |

Also exports Zod schemas: `ExtractedEntitySchema`, `ExtractedRelationSchema`, `ExtractionResultSchema`

---

## ../src/chunker.mjs

| Function | Description |
|----------|-------------|
| `estimateTokens(text)` | Word-count token estimate (words / 0.75) |
| `chunkMarkdown(markdown, options?)` | Split on H1-H3 headings. Options: `{source, maxTokens (500), minTokens (50)}`. Returns `[{text, metadata}]` |

---

## ../src/fetcher.mjs

| Function | Description |
|----------|-------------|
| `fetchUrl(url, options?)` | Fetch + Readability + Turndown. Options: `{timeout (15000), userAgent}`. Returns `Promise<{title, content, author, excerpt, url}>` |

---

## ../src/converter.mjs

| Function | Description |
|----------|-------------|
| `detectFormat(filePath)` | Detect file format from extension. Throws on unsupported |
| `isDoclingAvailable(options?)` | Check Python + docling. Returns `Promise<boolean>` |
| `convertDocument(filePath, options?)` | Convert to Markdown. Options: `{timeoutMs, pythonPath}`. Returns `Promise<{markdown, chunks, source}>` |

---

## ../src/kb-export.mjs

| Function | Description |
|----------|-------------|
| `exportDatabase(outputDir, options?)` | Export all tables to JSONL + metadata.json. Options: `{silent}` |

---

## ../src/kb-import.mjs

| Function | Description |
|----------|-------------|
| `importDatabase(exportDir, dbPath, options?)` | Import JSONL into database (atomic). Options: `{silent}` |

---

## ../src/kg-migrate.mjs

| Function | Description |
|----------|-------------|
| `normalizeInput(raw)` | Detect v1/v2 kg-store.json format, normalize |
| `buildMetadata(legacyEntity)` | Build metadata from legacy entity attrs |
| `migrateKnowledgeGraph(filePath, dbPath?, options?)` | Migrate kg-store.json → SQLite. Options: `{dryRun, silent}`. Returns `{entities, relations}` stats |

---

## ../src/schema-registry.mjs

| Function | Description |
|----------|-------------|
| `generateSchemaWikiPage(schema, options?)` | Generate Obsidian wiki page for schema. Options: `{wikiDir}`. Returns `{fileName, filePath}` |
