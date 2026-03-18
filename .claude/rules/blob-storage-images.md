---
paths:
  - 'packages/scripts/sync-images.ts'
  - 'packages/scripts/check-image-manifest.ts'
  - 'packages/plugins/src/rehype-enhance-images.ts'
  - 'packages/utilities/image-discovery.ts'
  - 'packages/utilities/image-manifest.ts'
  - 'image-manifest.json'
---

# Vercel Blob Storage Image Pipeline

Images are processed once by `bun images:sync`, uploaded to Vercel Blob Storage, and referenced via `image-manifest.json` at the repo root.

## Key invariants

- **`image-manifest.json` is checked into git** and tracked in `turbo.json` `globalDependencies`. Changes to the manifest invalidate the build cache.
- **The rehype plugin (`rehype-enhance-images`)** runs inside mdsvex during both dev and production builds. It does manifest lookups only — no sharp, no async work. Images not in the manifest are left unchanged (dev fallback via `serveContentAssets()` middleware).
- **`discoverAllImages()` returns `{ images, missing }`** — callers must handle both. Never silently drop missing file references; downstream validation depends on seeing them.
- **`upload()` always calls `put()`** even for existing blobs, to retrieve the canonical URL. Never return placeholder or fabricated URLs — they end up in the manifest.
- **The hash in the manifest is truncated** (first 16 hex chars of SHA-256), not the full digest. The blob pathname scheme is `images/{hash}/original.{ext}` and `images/{hash}/avif-{width}w.avif`.

## Dev middleware (`serveContentAssets`)

- Serves images from `/courses/`, `/content/`, and `/writing/` paths during development. If a new content directory is added, it must also be added to this middleware.

## Sync script (`bun images:sync`)

- Requires `BLOB_READ_WRITE_TOKEN` (loaded from `.env` via `--env-file`). Not required for `--dry-run`.
- Supports `--dry-run` and `--prune-blobs` flags.
- Raster images (PNG/JPG) get resized to 1600px max, AVIF variants at 480/1024/1600, and a 24px WebP LQIP.
- SVG/GIF/WebP/AVIF are passthrough (upload original only).
- Videos are uploaded as-is with MIME type recorded.
- **`--prune-blobs` deletes both removed keys and changed-hash keys.** When an image is edited in place, the old hash-based blob paths become orphaned and must be cleaned up.

## Rehype plugin gotchas

- **Preserve explicit attributes.** The plugin must carry over user-specified `loading`, `decoding`, `fetchpriority`, `width`, `height`, and any `data-*` or other attributes from the original `<img>`. Only add computed defaults when the attribute is absent.
- **`imageIndex` must increment after manifest lookup**, not before. Otherwise an unmanifested image consumes the first-image priority slot and the first real enhanced image misses `fetchpriority="high"`.
- **Use `decodeURI` consistently** (matching `image-discovery.ts`), not `decodeURIComponent`. The two decode different character sets, causing manifest key mismatches on paths with encoded reserved characters.
- **mdsvex VFile compatibility.** mdsvex passes `{ contents, filename }` to unified, but its bundled VFile stores the path as `file.filename` (not `file.path`). Read `file.path ?? file.filename ?? file.history[0]`.
- **Use `path.relative` for manifest keys**, not string replacement on absolute paths. String replacement is brittle across platforms and can yield absolute paths that never match.

## Build configuration

- The build script still needs `--max-old-space-size=4096` even though sharp no longer runs at build time — open-graph generation and large-page prerendering can still exhaust the default heap.

## When modifying image handling

- If changing the manifest schema, update `packages/utilities/image-manifest.ts` types.
- If changing discovery logic, ensure `validate-image-compatibility.ts`, `sync-images.ts`, and `check-image-manifest.ts` all handle the updated return shape.
- The rehype plugin operates on hast (HTML AST), not Svelte AST. Use `unist-util-visit` and `hastscript` — never MagicString or manual string building.
