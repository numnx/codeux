# Agent Knowledge Base

Code UX differentiates context into three distinct contracts:
1. **Memory (Evidence and Claims)**: What the runtime *learns* automatically from work.
2. **Knowledge Base**: Curated reference documents added by users.
3. **Persistent Skills**: Reusable agent instructions stored in project-owned skill storages.

The agent knowledge base is a project-scoped document library used to ground agent presets. Knowledge consists of manually curated reference material (documents, specs, notes, code) that is chunked and embedded with the active local embedding model. It provides bounded, evidence-backed claims separate from the runtime's auto-captured learnings.

Once ingested, knowledge documents are attached to individual agents through subscriptions.

## Knowledge Ingestion Boundaries

Knowledge ingestion strictly enforces content boundaries to protect the database and embedding models:
- Maximum file upload size limit: 10 MB.
- Maximum extracted characters limit: 4,000,000 characters (~1M tokens).
- Chunk size boundary: 1,400 characters (~350 tokens) to fit comfortably within the 512-token embedding model limit.
- Overlap size: 200 characters.

## Restart-Safe Ingestion

Raw text is written to the database first with a status of `pending` or `embedding`. Chunking and embedding are computed incrementally in memory, and written atomically to the database upon successful completion when the status is set to `ready`. If interrupted, the document remains in `pending` or `error` state, preventing orphaned chunks and allowing safe re-processing.

## Search Filters

Agents retrieving knowledge will only search chunks from documents that are actively subscribed to that specific agent. The search uses a default minimum similarity threshold of 0.2 and a limit of 5 chunks.

## Runtime Flow

The dashboard exposes the library under `/knowledge` and agent subscriptions inside each agent editor.
Agent editors provide search plus Select all and Unselect all controls for the visible knowledge list.

Supported ingest paths:

- Upload one or more files through `POST /api/projects/:projectId/knowledge/documents/upload`.
- Paste a note through `POST /api/projects/:projectId/knowledge/documents` with `title` and `text`.
- Ingest an in-repo file or directory through `POST /api/projects/:projectId/knowledge/documents` with `path`.
- Import selected documents from another project through `POST /api/projects/:projectId/knowledge/documents/import-project` with `sourceProjectId` and optional `documentIds`.

Repo-path ingestion resolves `path` inside the selected project's `baseDir`, rejects traversal outside the project directory, and skips common generated or dependency directories when walking a directory.

`ProjectDocsAutoEmbedService` provides a reusable setup-time path for automatically finding documentation-like repository files and passing them through `KnowledgeService.ingestDocument` as `sourceType: "repo_path"` documents. It only selects root documentation files (`README*`, `CHANGELOG*`, `CONTRIBUTING*`, assistant instruction markdown) plus supported documentation extensions under `docs/`, skips generated/dependency/cache/VCS directories and symlinks, enforces file-count and byte limits, and reports per-file errors without duplicating chunking, embedding, or content-hash logic.

Project imports copy extracted document text into the target project as `sourceType: "project"` documents. The target project embeds the copied documents with the active embedding model and still deduplicates by content hash inside that project.

## Memory Auto-Capture

Agent auto-captured learnings (`.task-learnings.md`) are persisted via batch processing to ensure reliability and determinism. When learning files are ingested, all entries are parsed and committed together in a single operation. The caller receives the exact count of successfully persisted memory records rather than relying on fire-and-forget loops.

## Code UX Internal Docs

Every project can receive a grouped Code UX internal documentation entry:

- title: `codeux/internaldocs`
- source reference: `codeux/internaldocs`
- content: all markdown files under the running Code UX checkout's `docs/` directory, grouped into one knowledge document

When the built-in `Project manager` preset is first synced for a project, Code UX selects `codeux/internaldocs` for that preset by default. This seed is one-time only. If a user unselects the document later, subsequent agent syncs do not reselect it.

The repository includes precomputed BGE Small embeddings for the grouped docs at:

```text
.code-ux/embeddings/codeux-internaldocs.bge-small-en-v1.5.json
```

If the active model and bundled content hash match, Code UX loads these chunks directly instead of recomputing embeddings. If no matching bundle is available, normal asynchronous embedding is used.

## Agent Subscriptions

Agent subscriptions are persisted through:

```http
PUT /api/agent-presets/:agentPresetId/knowledge/subscriptions
Content-Type: application/json

{ "documentIds": ["..."] }
```

The server validates the agent preset and stores only documents that belong to the agent's project. The response echoes the persisted set:

```json
{ "documentIds": ["..."] }
```

At runtime, subscribed ready documents are rendered into the agent manifest. The manifest instructs the agent to call `search_knowledge` for exact passages before using attached documents.

The dashboard writes subscription changes immediately so knowledge selection is not lost if the
editor closes. Those changes also mark the agent editor dirty, enabling Save Agent as an explicit
acknowledgement step after selecting or deselecting knowledge.

## Route Registration

Knowledge and memory routes must be registered through the dashboard route-registration phase, after `applyDashboardPreRouteMiddleware` installs `express.json`. If knowledge routes are mounted before the JSON parser, pasted notes and repo-path ingest requests arrive with an empty `req.body`, and subscription updates can silently replace the agent document set with an empty array.

## Dashboard Localization Boundary

The `/knowledge` interface uses the dashboard's English/German locale while keeping the ingestion contract opaque to localization. Route-authored headings, controls, statuses, validation fallbacks, confirmations, and live announcements are translated, and derived counts, file sizes, dates, and similarity percentages are locale-formatted. Document text and metadata, repository paths, agent and model names, MIME and language identifiers, embedding/search output, partial-failure diagnostics, and API error messages pass through unchanged.

Focused coverage lives in `tests/backend/server/knowledge-route-registration.test.ts`.
