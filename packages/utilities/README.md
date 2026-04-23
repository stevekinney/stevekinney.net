# `@stevekinney/utilities`

Framework-agnostic TypeScript helpers shared across the website app, the content pipeline, and the plugin packages.

## Modules

| Export                   | Purpose                                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./content-types`        | Canonical types for routes, writing/course/lesson indexes, and the `GeneratedContent` artifact. Every package that talks about content data imports these.                            |
| `./frontmatter`          | Safe parsing helpers for markdown frontmatter — `normalizePath`, `toDateString`, and the like.                                                                                        |
| `./image-discovery`      | Walks a directory and returns `{ images, missing }` tuples. Shared by `sync-images` and `check-image-manifest`.                                                                       |
| `./image-manifest`       | Reads and validates `image-manifest.json`. Source of truth for the blob-storage hash scheme.                                                                                          |
| `./routes`               | Route-path normalization used in both the collector and the client-side router guards.                                                                                                |
| `./tailwind-playground`  | Encoding and sanitization helpers for the Tailwind playground feature. `decodeTailwindPlaygroundHtml` fails closed so one malformed attribute can't take down page-level enhancement. |
| `./write-formatted-json` | Writes JSON with Prettier's formatting so generated files match the checked-in style.                                                                                                 |

## Best practices

- **Pure functions only.** No DOM, no framework imports, no side effects outside the module body. The utilities run in every execution context — browser, Bun scripts, SvelteKit's SSR.
- **Type exports stay stable.** Everything in `content-types.ts` is a structural contract between `packages/scripts` (producer) and the website app (consumer). Schema changes need matching updates in both places, plus a regen of `.generated/content-data.json`.
- **Validation returns structured results, not thrown errors.** `image-discovery` returns `missing` arrays; `frontmatter` helpers return `null` on failure. Callers decide how strict to be.
- **Narrow imports at the call site.** Consumers should pick specific subpath exports (`@stevekinney/utilities/routes`) rather than a barrel import that pulls sharp bindings into the browser.
