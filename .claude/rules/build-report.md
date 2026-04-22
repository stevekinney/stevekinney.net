---
paths:
  - 'packages/scripts/build-report/**'
---

# Build Report Pipeline

`bun run build:report` writes `tmp/build-report/website-build-report.{json,md}` after a production build. The pipeline lives at `packages/scripts/build-report/` and is split along the real seams:

- `types.ts` — the canonical `BuildReport` shape and Turbo summary types.
- `read-turbo-summary.ts` — locates the latest `.turbo/runs/*.json` (or honors `TURBO_SUMMARY_FILE`) and parses it.
- `inspect-website-output.ts` — walks the adapter output, counts HTML pages, and returns the largest JS chunk and CSS file. Also re-exports `countFilesIfDirectoryExists` / `findFirstDirectoryWithMatchingFile` used by tests.
- `create-build-report.ts` — pure assembly: input objects → `BuildReport`. No I/O.
- `render-markdown.ts` — Markdown rendering via `prose-writer`. Do not concatenate strings here; use `write.with(...)` so headings, lists, and callouts stay structurally correct.
- `build-report.ts` — the thin entrypoint: read inputs, assemble via `createBuildReport`, then `JSON.stringify` for the JSON file and `renderMarkdownReport` for the Markdown file.

Keep JSON writing inline in the entrypoint — `JSON.stringify(report, null, 2)` is not a formatting pass that needs its own module.

When the report grows a new section:

1. Extend `types.ts` with the new subtype.
2. Surface raw inputs in `inspect-website-output.ts` (or add a new reader module if the input source is new).
3. Map those into the canonical report inside `create-build-report.ts`.
4. Add the heading/list block to `render-markdown.ts` through the prose-writer API.
5. Cover the readers or the assembly step with `bun:test` specs under `packages/scripts/build-report/`.
