# `@stevekinney/scripts`

The Bun-driven command-line scripts that feed the website build — content collection, validation, image processing, generated-asset sync, and the post-build report.

## Commands

Each script is exposed as a bin entry so other workspaces can invoke it via `bunx`:

| Bin                             | Source                             | What it does                                                                                                                                                         |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content-build`                 | `content-build.ts`                 | Collect markdown + bundle content-enhancements into `applications/website/.generated/`.                                                                              |
| `validate-content`              | `validate-content.ts`              | Re-run collection and fail with validation issues. Consumed by the Turbo `content:validate` task.                                                                    |
| `build-report`                  | `build-report/build-report.ts`     | After a production build, read `.turbo/runs/*.json`, walk the adapter output, assemble a `BuildReport`, and write `tmp/build-report/website-build-report.{json,md}`. |
| `run-with-sharp-runtime`        | `run-with-sharp-runtime.ts`        | Spawn a child command with the sharp/libvips library path set for the current platform. Used to run Vite's build and the image validator.                            |
| `sync-generated-browser-assets` | `sync-generated-browser-assets.ts` | Copy `.generated/content-enhancements/` into every adapter's build output (static, SvelteKit client, Vercel static) and filter out the `.build-hash` sidecar.        |
| `validate-image-compatibility`  | `validate-image-compatibility.ts`  | Cross-check every image referenced from content against the manifest and sharp's format support.                                                                     |
| `sync-images`                   | `sync-images.ts`                   | Upload content images to Vercel Blob Storage, regenerate the manifest, and optionally prune orphan blobs. Requires `BLOB_READ_WRITE_TOKEN`.                          |
| `check-image-manifest`          | `check-image-manifest.ts`          | Fast manifest sanity check that doesn't need sharp.                                                                                                                  |

Each script file starts with `#!/usr/bin/env bun` and is marked executable, so `bunx <bin>` runs the TypeScript source directly.

## Subdirectories

- `content-repository/` — the collection graph. `collect.ts` orchestrates, `builders.ts` emits route and prerender records, `markdown.ts` handles source loading, `validation.ts` covers link and slug checks, and `types.ts` + `constants.ts` pin the shared shapes. Covered by `content-repository.test.ts`.
- `build-report/` — the decomposed build-report pipeline. `types.ts` defines the canonical `BuildReport`; `read-turbo-summary.ts` and `inspect-website-output.ts` read the two external inputs; `create-build-report.ts` is the pure assembly step; `render-markdown.ts` renders via prose-writer; `build-report.ts` is the entrypoint. JSON output is inlined in the entrypoint because `JSON.stringify(report, null, 2)` isn't a formatting pass worth its own module.

## Best practices

- **Scripts stay small and composable.** Anything that grows past ~150 lines is probably hiding a seam — split it before the next pass, not after it breaks.
- **Exit explicitly.** Bun occasionally keeps CLI processes alive after async work finishes. Call `process.exit(0)` when you're done (the existing scripts all do).
- **Never swallow errors from image or content pipelines.** Write the issue list to `stderr` and exit non-zero — the CI job has to surface it.
- **Don't import from `applications/website/`.** Every script runs outside the app's bundle. If you need something the app defines, lift it into `@stevekinney/utilities` first.
