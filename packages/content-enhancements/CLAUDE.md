# `@stevekinney/content-enhancements` — agent notes

Browser runtime that progressively enhances server-rendered content. Shipped as TypeScript source; bundled by `packages/scripts/content-build.ts`.

## Load-bearing constraints

- **One `data-content-document` per page.** The DOM contract assumes exactly one wrapper. Nesting it (for example, by wrapping a route's content twice or adding the attribute to a shared markdown layout) doubles every enhancement because the loader processes each matching element independently.
- **Selectors drive lazy loading.** `matchesAnyRoot` in `content-enhancements.ts` gates the dynamic import. Deleting the selector filter will force every enhancer bundle onto every content page — a regression Turbo/Vite won't surface.
- **Every enhancer returns a destroy callback if it mutates DOM.** The loader stores callbacks in a `WeakMap` and runs them on `pagehide` (without `{ once: true }`, so bfcache restores still get a cleanup pass). New enhancers must preserve this invariant or the next navigation leaks.
- **`copy-code-block-as-image.ts` owns the clipboard capability check.** Call `supportsClipboardImageCopy()` there. Do not re-implement the check in individual enhancers.

## Behaviour to preserve across edits

- Mermaid rendering escapes `<`/`>` in the source block before Svelte sees it. If the output goes through another escape pass, diagrams break.
- Code-block enhancement only shows the "copy as image" button when the browser supports `ClipboardItem` _and_ `navigator.clipboard.write`. The module is still lazy-loaded, then it self-reports capability.
- `pagehide` cleanup must run in reverse registration order. `cleanupRoot` iterates the callbacks backwards so the most recent mutation is undone first.

## Things that look wrong but aren't

- The package exports look like `./*` so the content-build script can reach each file by name. That's intentional: the script builds `content-enhancements.ts` as the entrypoint with splitting, so sibling modules are co-loaded as chunks — never imported by name outside this tree.
- There's no Svelte anywhere in the package. The filename `enhance-*.ts` was inherited from the old `src/lib/actions/` location (which implied `use:` actions). These are just functions.
- Module state is explicitly not shared across roots. Every root gets its own cleanup array. Don't "optimize" by collapsing them.

## Modifying the package

- Run the content-build to verify the bundle still emits without errors: `bunx content-build` from the repo root. It prints `Generated content artifacts are already up to date.` on a cache hit — force a rebuild by deleting `applications/website/.generated/content-enhancements/`.
- Integration tests live at `applications/website/tests/content-pages.spec.ts`. They assert exactly one `data-content-document` per page and that enhancements actually mount. Update them when the DOM contract changes.
