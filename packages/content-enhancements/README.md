# `@stevekinney/content-enhancements`

Browser-side progressive enhancement for server-rendered content. The website prerenders HTML for every writing post, course, and lesson — this package reaches into that HTML after the page loads and gives it the interactive polish the static markup can't encode.

## What it does

Each rendered content document is wrapped in a single `<div data-content-document>`. After `DOMContentLoaded`, the loader inside this package:

1. Finds every `[data-content-document]` on the page.
2. Picks the subset of enhancers whose selector matches at least one root.
3. Lazy-loads only those enhancer modules — mermaid doesn't ship on pages without diagrams, shiki copy buttons don't ship on marketing pages, and so on.
4. Runs each enhancer against each root and records any `destroy()` it returns in a `WeakMap` keyed by the root element.
5. On `pagehide`, iterates the WeakMap and calls every stored destroy so DOM additions (copy buttons, wrappers, playground mounts) don't pile up if the browser keeps the document alive or restores it from the back/forward cache.

## How it's wired

The package ships TypeScript source only. `packages/scripts/content-build.ts` bundles it with `Bun.build`, writes the output to `applications/website/.generated/content-enhancements/`, and stores a `.build-hash` sidecar so repeated builds are no-ops when the source tree hasn't changed. `packages/scripts/sync-generated-browser-assets.ts` copies the output (minus the sidecar) into each adapter's build directory so the bundle is served at a stable `/generated/content-enhancements/content-enhancements.js` URL.

## Adding a new enhancer

1. Drop a new `enhance-<thing>.ts` file into `src/` that exports a function `(node: HTMLElement) => { destroy?: () => void } | Promise<...>`. Keep the destroy function if anything you add to the DOM needs cleanup.
2. Append an entry to the `enhancers` array in `src/content-enhancements.ts` with the matching selector and a dynamic `import()` of the new file. Selector-based filtering keeps the lazy-load opt-in.
3. Document the DOM attribute contract your enhancer depends on — the server-rendered HTML has to set it, so the mdsvex layout or a remark/rehype plugin has to produce it too.

## Best practices

- **Don't couple to framework globals.** These modules run in the browser before any Svelte code mounts. Use plain DOM APIs and keep the code tree-shakable.
- **Be idempotent per root.** The loader calls `cleanupRoot(root)` before re-running enhancers, but an enhancer that misbehaves when run twice will still create issues under bfcache restores. Prefer attribute or data-flag guards over stateful module-level booleans.
- **Emit one `destroy` per side effect.** If your enhancer adds five buttons, the returned `destroy` should remove all five. The loader composes cleanup across all enhancers on a root, so the callback only needs to undo what _this_ enhancer did.
- **Never import from the website app.** The package boundary exists so enhancements can evolve independently of the SvelteKit app. If you find yourself reaching into `applications/website/...`, the boundary is wrong — lift the shared piece into `@stevekinney/utilities` or split a new shared helper.
