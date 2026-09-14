---
description: Rules for keeping generated content indexes consistent with source Markdown
paths:
  - applications/website/src/lib/server/content-index.json
  - packages/scripts/content-repository/**
---

# Content Index Consistency

Generated content indexes drive listing, routing, and sorting on the website. Markdown under `writing/` and `courses/` is the source of truth; generated artifacts must be rebuilt from that source rather than edited by hand.

## Slugs must match source files

The canonical slug is derived from the Markdown filename. Always cross-check generated routes and indexes against the filename stem. A mismatch can produce wrong URLs or a `MarkdownModuleNotFoundError` at runtime.

## Dates must match source history

Writing posts and course landing pages use their authored `date`. Lesson dates and `modified` values are derived from Git history by the content pipeline. Generated indexes must use those values consistently.

## Validation

Run `bun run content:validate` after source changes. Never edit generated indexes or routes to hide a source-content validation error.
