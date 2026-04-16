---
name: openclaw-kb
description: "3-tier personal knowledge base. ALWAYS use proactively: (1) store facts from conversations (entities + relations in KG), (2) ingest URLs/documents shared by user (create wiki pages + KG entries + embeddings), (3) answer questions by searching KG first, then data lake, then semantic search. Wiki pages are Obsidian-compatible with wikilinks. Use when: any entity (person, org, concept) is mentioned, any URL or document is shared, any question requires recalling stored knowledge. NOT for: ephemeral chat, weather, time queries."
---

# OpenClaw Knowledge Base

3-tier knowledge system: Knowledge Graph (facts) → Data Lake (structured records) → Semantic Search (FTS5 + embeddings). Wiki pages synced to Obsidian via iCloud/Google Drive.

## Setup

```bash
cd ~/kb && npm install && node -e "import { initDatabase } from './src/db.mjs'; initDatabase('./jarvis.db');"
```

Requires: Node.js 18+, `better-sqlite3`, `sqlite-vec`. Optional: Ollama `nomic-embed-text` for embeddings.

## Agent Behavior Rules

These rules define HOW the agent should use the KB in conversations. They are part of the skill, not the agent's personality.

### Silent storage
When you detect facts in conversation (names, companies, relationships), store them in the KG **without announcing it**. Don't say "I'm storing this in the knowledge base" every time. The user doesn't need to know about every INSERT.

### URL/Document ingestion
When the user shares a URL or document, acknowledge briefly ("Got it, ingesting now!") and report back when done with a **short summary** of what was captured (e.g. "Added 5 entities and 3 concepts"). Delegate to a sub-agent if available.

### Answering questions
Use KB data naturally. Don't explain which tier the answer came from. Don't say "According to my knowledge graph, Tier 1 says..." — just answer.

### Verbosity
Only be detailed about KB internals when explicitly asked ("what did you store?", "show me the KB", "what's in the wiki?").

### Language
All generated content (wiki pages, summaries, descriptions) MUST be in **English**, regardless of the conversation language.

## When to Store What

### Always store in KG (silent, no wiki page):
- People mentioned by name → entity type `person`
- Companies/orgs mentioned → entity type `org`
- Simple factual relations (works_at, knows, located_in...)

### Store in KG + create wiki page when:
- User explicitly shares a URL or document → **ALWAYS** create source + concept pages
- User says "remember this", "note this", or shares notable knowledge
- Entity is a concept, technology, or domain knowledge worth retrieving later
- Entity is a key person (colleague, expert, author — not casual mentions)
- A decision with consequences is made

### Never store:
- Casual greetings, weather/time questions, ephemeral context
- "I'm in a meeting", "I'll be back" — transient state

### Wiki page threshold:
The wiki is for the **human** to browse in Obsidian. Don't pollute it with every minor fact. The KG can be rich (many small facts) — the wiki should be curated (only notable items).

## Ingesting URLs and Documents (ASYNC)

Ingestion is slow (fetch + extract + wiki + sync). **Always delegate to a sub-agent**:

```
User: "Check out https://example.com/article"
You: "On it — ingesting in background!"
→ sessions_spawn(task: "Ingest URL into KB", runtime: "subagent")
→ Sub-agent does the work
→ You get notified when done
You: "Done! Added 5 concepts to the wiki."
```

### Sub-agent ingestion task:

The sub-agent should:
1. Fetch the URL content (use `web_fetch` tool)
2. Read and understand the content
3. Identify entities, concepts, relations, and a summary
4. Call the KB scripts to store everything (see API below)
5. Sync to iCloud/Google Drive

### For simple facts from conversation:

Do it inline (no sub-agent needed) — it's fast:

```bash
cd ~/kb && node -e "
import { initDatabase, createEntity, createRelation, getRelationsFrom, getRelationsTo } from './src/db.mjs';
import { createPage, regenerateIndex } from './src/wiki.mjs';
initDatabase('./jarvis.db');

const e1 = createEntity({ name: 'Alice', type: 'person', metadata: { description: 'Engineer at Acme' } });
const e2 = createEntity({ name: 'Acme Corp', type: 'org', metadata: { description: 'Tech company in NYC' } });
createRelation({ source_id: e1.id, target_id: e2.id, type: 'works_at' });

// Create wiki pages with relations (only for notable entities)
for (const e of [e1, e2]) {
  const rels = [
    ...getRelationsFrom(e.id).map(r => ({ ...r, direction: 'outgoing' })),
    ...getRelationsTo(e.id).map(r => ({ ...r, direction: 'incoming' }))
  ];
  createPage(
    { name: e.name, type: e.type, description: JSON.parse(e.metadata).description, attributes: JSON.parse(e.metadata) },
    'conversation', { wikiDir: './wiki', relations: rels, kgId: e.id }
  );
}
regenerateIndex({ wikiDir: './wiki' });
"
```

## Answering Questions (3-Tier Search)

When a user asks a question that might involve stored knowledge:

### Step 1: Extract entities from the question
You ARE the NER engine. Identify people, orgs, concepts, technologies mentioned in the question.

### Step 2: Search Tier 1 — Knowledge Graph (HIGHEST PRIORITY)
```bash
cd ~/kb && node -e "
import { initDatabase } from './src/db.mjs';
import { searchKG } from './src/wiki-search.mjs';
initDatabase('./jarvis.db');
const results = searchKG('entity name');
console.log(JSON.stringify(results, null, 2));
"
```
If T1 has facts → **use them**. They are verified atomic facts. Do NOT override with T2 or T3.

### Step 3: Search Tier 2 — Data Lake (if T1 incomplete)
```bash
cd ~/kb && node -e "
import { initDatabase, queryRecords } from './src/db.mjs';
initDatabase('./jarvis.db');
const results = queryRecords('health_metric', { from: '2026-01-01', to: '2026-04-16' });
console.log(JSON.stringify(results, null, 2));
"
```
Use SQL-style filters (record_type, date range). Good for metrics, stats, time-series.

### Step 4: Search Tier 3 — Semantic Search (FALLBACK only)
```bash
cd ~/kb && node -e "
import { initDatabase } from './src/db.mjs';
import { searchSemantic } from './src/wiki-search.mjs';
initDatabase('./jarvis.db');
const results = await searchSemantic('search query');
console.log(JSON.stringify(results, null, 2));
"
```
FTS5 + vector embeddings. Auto-embeds the query via Ollama. Good for fuzzy/conceptual queries.

### Priority Rules (CRITICAL):
1. **T1 facts are absolute** — if the KG says "Alice works at Acme", that's the answer
2. **T2 data supplements T1** — use for stats/metrics. If T2 contradicts T1, T1 wins
3. **T3 semantic is fallback** — use only when T1+T2 don't have the answer. NEVER let T3 contradict T1

### Unified search (queries all 3 tiers at once):
```bash
cd ~/kb && node -e "
import { initDatabase } from './src/db.mjs';
import { search } from './src/wiki-search.mjs';
initDatabase('./jarvis.db');
const results = await search('query', { maxResults: 10, includeScores: true });
console.log(JSON.stringify(results, null, 2));
"
```

## Wiki Generation Rules

- Pages go in: `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, `wiki/sources/`
- NEVER put files at wiki root
- Filenames: lowercase, hyphens, keep accents (é, è, ç), no spaces
- All pages MUST use `createPage()` from `src/wiki.mjs` — never write manually
- Always call `regenerateIndex()` after creating/updating pages
- Language: **English** for all generated content
- Links: Obsidian wikilinks `[[slug|Display Name]]`

### Entity types:
`person`, `org`, `place`, `device`, `service`, `project`, `concept`, `knowledge`, `event`, `media`, `product`, `topic`

### Relation types:
`works_at`, `worked_at`, `owns`, `uses`, `created`, `related_to`, `part_of`, `knows`, `located_in`, `manages`, `member_of`, `depends_on`, `likes`, `references`, `covers`, `contrasts_with`, `inspired_by`, `authored`

## Syncing to Obsidian (after every wiki change)

```bash
rclone copy ~/kb/wiki/ icloud:Obsidian/VAULT_NAME/wiki/ --transfers 1
rclone copy ~/kb/raw/ icloud:Obsidian/VAULT_NAME/raw/ --transfers 1
```

## Checking existing knowledge

```bash
cd ~/kb && node -e "
import { initDatabase } from './src/db.mjs';
const db = initDatabase('./jarvis.db');
db.prepare('SELECT id, name, type FROM entities ORDER BY name').all().forEach(e => console.log(e.id, e.type, e.name));
"
```

## Performance Tips
- Batch entity creations in ONE script call
- `regenerateIndex` once at the end, not per page
- Sync to iCloud/Drive once at the end
- Use sub-agents for URL/document ingestion (slow operations)
- For simple facts, store inline (fast)

## References

- [Schema Registry](references/schema-registry.md) — register custom data types
- [API Quick Reference](references/api-quick-ref.md) — all exported functions
