# `@stevekinney/website` — agent notes

The SvelteKit app. Every content page is prerendered; the client payload is the progressive-enhancement bundle plus CSS.

## Load-bearing constraints

- **Exactly one `<div data-content-document>` per content page.** The browser enhancer selects every match and runs enhancers independently — nested wrappers double every copy button, mermaid render, and playground mount. The Playwright regression test at `tests/content-pages.spec.ts` enforces this on writing, course, and lesson routes.
- **Shared mdsvex layouts do not own the wrapper.** `src/lib/markdown/base.svelte` and `page.svelte` render embedded HTML; the route template (one level up) wraps it. If a `+page.md` route ever needs enhancement, wire `<ContentEnhancements />` and the wrapper at that page rather than at the shared layout.
- **`csr = false` everywhere content-related.** Pages export `prerender = true` and `csr = false`. Do not flip these on a per-route basis without thinking about how the enhancer cleanup works on client-side navigation.
- **The `.md` redirect chain lives in `+layout.server.ts` and the page-level loaders.** `/courses/X.md` redirects to `/courses/X`, `/courses/X.md/Y` preserves the lesson segment, and `/courses/X/Y.md` redirects to `/courses/X/Y`. `server/content.ts` normalizes `.md` suffixes inside `getCourseEntry` / `getCourseRoute` as a defense in depth.
- **`svelte.config.ts` is TypeScript.** Node's ESM loader resolves relative imports there with their explicit extension (`./src/lib/code-annotations.ts`) rather than relying on `tsx`'s path resolution. The existing pattern works — keep the `.ts` in the import specifier when you add new imports to the config.

## Behaviour to preserve across edits

- `src/lib/server/content-documents.ts` imports markdown via `import.meta.glob` with a deep relative path (`'../../../../../writing/*.md'`). The prefix count matters — don't collapse or alias it without matching the companion path in `getLoader`.
- `plugins/vite/content-development-plugins.ts` returns the Vite plugins in a specific order: watch → rebuild → serve-generated → serve-content-assets. Re-ordering changes when the watcher sees changes and when middleware gets registered relative to `sveltekit()`.
- `app.css` uses the expansive `@source '../**/*.{svelte,js,ts,md}'` scope plus explicit `writing/` and `courses/` entries so Tailwind sees utility classes emitted from `svelte.config.ts`'s Shiki highlighter and from content markdown.
- `tsconfig.json` includes `plugins/**/*.ts` so svelte-check type-checks the Vite plugin files alongside `src/`.

## Things that look wrong but aren't

- `svelte.config.ts` has two helper casts (`asPluggable`, `asPreprocess`) that reconcile mdsvex's bundled `unified` types with the newer `unified` types that the remark/rehype plugins resolve to. They look like escape hatches because they are — but the boundary is the package mismatch, not the helpers.
- `src/lib/merge.ts` is aliased to `$merge` (not `$lib/merge`). Legacy alias; keep it.
- `src/lib/repository-path.ts` only exports the `RepositoryPath` type. The previous helper function was unused dead code and got removed; do not reintroduce it.

## Modifying the app

- Run `bun run continuous-integration:validate` before pushing structural changes — it covers content validation, image compatibility, lint, svelte-check, and unit tests in one pass.
- UI work should show up in Storybook (`bun run storybook`); integration coverage runs via Playwright (`bun run test:integration`).
- The dev server is on port 4444 (`bun dev`); preview on port 4445. Both are configured in `vite.config.ts` and `playwright.config.ts`.
