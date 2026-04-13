# Snippet Validation Matrix

Use this matrix when validating fenced code blocks from the course manifest.

## General rules

- Prefer the cheapest trustworthy check.
- When the prose says the block is the real shipped shape, compare it against the referenced file before falling back to syntax-only validation.
- When a block is intentionally partial, record `illustrative-partial` and require surrounding prose to point at the shipped file that completes the idea.
- A syntactically valid snippet can still fail if it drifts from the file the prose claims it represents.

## Language strategies

- **`ts` / `js`:** compare against referenced starter files when the prose says the block is exact. Otherwise parse with TypeScript. If parsing fails but the block is clearly an excerpt, record `illustrative-partial`.
- **`svelte`:** compare against the referenced `.svelte` file when exactness is claimed. Otherwise compile with `svelte/compiler`. Partial excerpts may be `illustrative-partial`.
- **`sh` / `bash`:** compare against referenced scripts or commands when exactness is claimed. Otherwise shell-parse with `sh -n` or `bash -n`.
- **`json` / `jsonc`:** parse with `JSON.parse` or Prettier's `json5` parser. Compare against referenced files when the prose says the block is the real file.
- **`yaml`:** parse with Prettier's YAML parser. When the lesson says the block is the real workflow or config skeleton, compare it against the referenced file.
- **`toml`:** parse with Python's `tomllib`. Compare against referenced files when the prose claims exactness.
- **`markdown`:** validate with Prettier's Markdown parser. Treat as explanatory unless the prose claims the block is a shipped document.
- **`mermaid`:** treat as a documented illustration unless the course starts shipping a Mermaid validation tool.
- **`diff` / `text` / no language:** treat as explanatory unless the surrounding prose explicitly says the block is machine-executable or a literal file excerpt.

## Exactness cues

These phrases make a block a compare-first candidate when they appear in the lead-in prose immediately above the block:

- `looks like this`
- `the exact file`
- `the exact shape`
- `the full file`
- `the full config`
- `complete test`
- `complete file`
- `copy that shape`
- `use that as your starting point`
- `ships the file`
- `the workflow looks like this`

Do not treat a block as compare-first when the same lead-in prose is clearly instructing the reader to create or add something (`add`, `create`, `start from`, `write yours first`). Those are scaffolding examples, not claims that the block already matches a shipped file.
