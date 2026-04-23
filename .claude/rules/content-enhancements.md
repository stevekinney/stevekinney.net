---
paths:
  - 'packages/content-enhancements/**'
  - 'applications/website/plugins/vite/**'
  - 'packages/scripts/content-build.ts'
  - 'applications/website/src/routes/writing/**'
  - 'applications/website/src/routes/courses/**'
---

# Content Enhancements

Content routes (`/writing/*`, `/courses/*`, `/courses/*/*`) render prerendered HTML inside a single `<div data-content-document>` wrapper. A runtime loader lazy-loads enhancer modules and applies them to every matching element in that wrapper.

## Wrapper rule

- **Exactly one `data-content-document` per rendered page.** The browser enhancer picks up every element matching the selector and runs enhancers independently on each, so a nested wrapper doubles every copy button, mermaid render, and tailwind playground mount.
- The integration test `tests/content-pages.spec.ts` asserts exactly one wrapper on the canonical routes. Keep that test passing.
- Do not add `data-content-document` to `src/lib/markdown/base.svelte` or `page.svelte`. Those layouts render embedded HTML whose parent route already owns the wrapper. If a future `+page.md` route needs enhancement, wire `ContentEnhancements` and `data-content-document` at that page.

## Enhancer modules

- Live at `packages/content-enhancements/src/enhance-*.ts` inside `@stevekinney/content-enhancements`. Despite the name, these are **not** Svelte `use:` actions — they are plain functions `(node: HTMLElement) => { destroy: () => void } | void`, optionally async.
- `content-enhancements.ts` is the loader. It selects roots via `[data-content-document]`, filters enhancers whose selector matches any root, lazy-loads each module, and tracks `destroy` callbacks in a `WeakMap` keyed by root. `pagehide` triggers cleanup.
- `copy-code-block-as-image.ts` is a shared helper imported by both code-block and mermaid enhancements. Keep it colocated inside the package.

## Generated bundle

- `packages/scripts/content-build.ts` bundles the enhancer tree (via `Bun.build`) into `applications/website/.generated/content-enhancements/` and writes a `.build-hash` sidecar alongside the output. On subsequent runs the build is skipped when the sha256 of `packages/content-enhancements/src/**/*.ts` matches the sidecar, so Turbo's cache restore remains valid and the "already up to date" message stays truthful.
- `sync-generated-browser-assets.ts` copies the generated bundle into each adapter output, filtering the `.build-hash` sidecar so it is not served to users.

## Vite dev-server plugins

- Live at `applications/website/plugins/vite/`. They are app-local because they encode this repository's directory layout; do not hoist to a shared package unless a second app emerges.
- `content-development-plugins.ts` returns the plugins in their intended order. Always register through the factory rather than picking individual plugins — ordering between watcher registration, content rebuild triggers, and dev-only middleware matters.
- Watched inputs are globs (`packages/content-enhancements/src/**/*.{ts,css}`, `writing/**/*.{md,toml}`, `courses/**/*.{md,toml}`), not enumerated paths. Add a new enhancement source file inside the package and the watcher picks it up for free.
