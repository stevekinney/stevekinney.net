# `@stevekinney/scripts`

The Bun-driven command-line scripts that feed the website build — content collection, validation, image processing, generated-asset sync, and the post-build report.

## Commands

Content metadata can be checked and repaired directly from the repository root:

| Command                            | Scope                                     | Purpose                                                                                                       |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `bun run content:check [paths...]` | Selected paths, or all content by default | Check frontmatter schemas, description limits, plain text, uniqueness, and Git-derived metadata expectations. |
| `bun run content:fix [paths...]`   | Selected paths, or all content by default | Apply safe metadata normalization without inventing title or description copy.                                |
| `bun run content:validate`         | Whole content graph                       | Validate source content together with generated routes, indexes, and links.                                   |

The root Turbo commands capture the Git revision used to compute semantic `modified` metadata. That value is derived during collection and is never an authoring field.

Each script is exposed as a bin entry so other workspaces can invoke it via `bunx`:

| Bin                             | Source                             | What it does                                                                                                                                                         |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content-build`                 | `content-build.ts`                 | Collect and validate Markdown, then emit content data, canonical playground inputs, and article HTML class candidates.                                               |
| `validate-content`              | `validate-content.ts`              | Re-run collection and fail with validation issues. Consumed by the Turbo `content:validate` task.                                                                    |
| `build-report`                  | `build-report/build-report.ts`     | After a production build, read `.turbo/runs/*.json`, walk the adapter output, assemble a `BuildReport`, and write `tmp/build-report/website-build-report.{json,md}`. |
| `run-with-sharp-runtime`        | `run-with-sharp-runtime.ts`        | Spawn a child command with the sharp/libvips library path set for the current platform. Used to run Vite's build and the image validator.                            |
| `sync-generated-browser-assets` | `sync-generated-browser-assets.ts` | Copy `.generated/content-enhancements/` into adapter outputs, excluding private build metadata. Playground assets are emitted by Vite before prerendering.           |
| `validate-image-compatibility`  | `validate-image-compatibility.ts`  | Cross-check every image referenced from content against the manifest and sharp's format support.                                                                     |
| `sync-images`                   | `sync-images.ts`                   | Upload content images to Vercel Blob Storage, regenerate the manifest, and optionally prune orphan blobs. Requires `BLOB_READ_WRITE_TOKEN`.                          |
| `check-image-manifest`          | `check-image-manifest.ts`          | Fast manifest sanity check that doesn't need sharp.                                                                                                                  |

Each script file starts with `#!/usr/bin/env bun` and is marked executable, so `bunx <bin>` runs the TypeScript source directly.

The repository commands `bun run playgrounds:build` and `bun run content-enhancements:build` run separate Turbo tasks. Playground compilation depends on content collection. Enhancement bundling has no Markdown dependency. Their generated output directories do not overlap.

## Playground compilation and caching

`playgrounds-build.ts` consumes `.generated/playground-inputs.json`. It uses the official Tailwind CLI and Tailwind packages pinned together to `4.3.3` in this workspace. `tailwind-playground.css` resolves that local package, disables automatic source discovery, and supplies the standard theme and system fonts. Each distinct linked CSS fragment gets one complete stylesheet compiled from its examples' sorted, deduplicated classes. Examples without linked CSS share one stylesheet.

Named CSS fragments reject `@import`, `@reference`, `@source`, `@config`, and `@plugin` rules so a playground cannot load styles from outside its generated stylesheet.

Compiler cache keys include the class set, linked CSS, base stylesheet, build recipe, resolved compiler dependencies, and runtime versions. Text edits reuse CSS. Website theme edits do not affect playground inputs or compilation. Output digests are checked before reuse; missing or corrupt assets are repaired. Writes compare bytes first, so an unchanged run preserves timestamps. HTML identity also includes the production response policy in `packages/utilities/tailwind-playground-policy.ts`.

The generator publishes completed assets before atomically replacing `.generated/playgrounds/manifest.json`. Production builds remove unreachable hashed playground files. Development retains previous hashes for pages already open, serializes rebuilds, and invalidates content modules after publication. Vite emits only manifest-referenced files into its client output, which both adapters consume. Never copy the private `playground-cache` or the manifest into public output.

`content-enhancements-build.ts` verifies its output digests and hashes transitive utility sources, package dependencies, runtime versions, and build recipes. Its metrics and playground compilation metrics are written to `tmp/build-report/`, outside generated task outputs. `bun run build:report` includes playground document counts, configuration counts, raw and gzip CSS sizes, and the last local compiler invocation.

After a successful website build, enhancement delivery verifies its source files, then keeps only the selected adapter output: `build/` for static builds or `.vercel/output/` for Vercel builds. It also updates the SvelteKit client output used by preview. Removing the inactive adapter prevents stale files from entering Turbo cache archives or being mistaken for the current deployment. Preserve a verified adapter output outside these generated directories when comparing adapters locally.

## Subdirectories

- `content-repository/` — the collection graph. `collect.ts` orchestrates, `builders.ts` emits route and prerender records, `markdown.ts` handles source loading, `validation.ts` covers link and slug checks, and `types.ts` + `constants.ts` pin the shared shapes. Covered by `content-repository.test.ts`.
- `build-report/` — the decomposed build-report pipeline. `types.ts` defines the canonical `BuildReport`; `read-turbo-summary.ts` and `inspect-website-output.ts` read the two external inputs; `create-build-report.ts` is the pure assembly step; `render-markdown.ts` renders via prose-writer; `build-report.ts` is the entrypoint. JSON output is inlined in the entrypoint because `JSON.stringify(report, null, 2)` isn't a formatting pass worth its own module.

## Best practices

- **Scripts stay small and composable.** Anything that grows past ~150 lines is probably hiding a seam — split it before the next pass, not after it breaks.
- **Exit explicitly.** Bun occasionally keeps CLI processes alive after async work finishes. Call `process.exit(0)` when you're done (the existing scripts all do).
- **Never swallow errors from image or content pipelines.** Write the issue list to `stderr` and exit non-zero — the CI job has to surface it.
- **Don't import from `applications/website/`.** Every script runs outside the app's bundle. If you need something the app defines, lift it into `@stevekinney/utilities` first.
