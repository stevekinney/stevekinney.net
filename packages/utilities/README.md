# `@stevekinney/utilities`

Framework-agnostic TypeScript helpers shared across the website app, the content pipeline, and the plugin packages.

## Modules

| Export                   | Purpose                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./content-types`        | Canonical types for routes, writing/course/lesson indexes, and the `GeneratedContent` artifact. Every package that talks about content data imports these.             |
| `./frontmatter`          | Safe parsing helpers for markdown frontmatter — `normalizePath`, `toDateString`, and the like.                                                                         |
| `./image-discovery`      | Walks a directory and returns `{ images, missing }` tuples. Shared by `sync-images` and `check-image-manifest`.                                                        |
| `./image-manifest`       | Reads and validates `image-manifest.json`. Source of truth for the blob-storage hash scheme.                                                                           |
| `./routes`               | Route-path normalization used in both the collector and the client-side router guards.                                                                                 |
| `./tailwind-playground`  | Build-time Tailwind playground HTML/CSS validation and canonical extraction. Browser-facing metadata and fingerprint helpers live in `./tailwind-playground-metadata`. |
| `./write-formatted-json` | Writes JSON with Prettier's formatting so generated files match the checked-in style.                                                                                  |

## Best practices

- **Runtime boundaries**: `tailwind-playground.ts` performs HTML and CSS validation at build time and must never enter a browser bundle. Its metadata, policy, and type contracts have separate exports so consumers can import only what they need. Keep other shared helpers compatible with their actual browser, Bun, and server consumers.
- **Type exports stay stable.** Everything in `content-types.ts` is a structural contract between `packages/scripts` (producer) and the website app (consumer). Schema changes need matching updates in both places, plus a regen of `.generated/content-data.json`.
- **Validation returns structured results, not thrown errors.** `image-discovery` returns `missing` arrays; `frontmatter` helpers return `null` on failure. Callers decide how strict to be.
- **Narrow imports at the call site.** Consumers should pick specific subpath exports (`@stevekinney/utilities/routes`) rather than a barrel import that pulls sharp bindings into the browser.
