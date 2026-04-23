# `@stevekinney/website`

The SvelteKit site at [stevekinney.net](https://stevekinney.net). Every writing post, course, and lesson is prerendered from markdown via a custom content pipeline (see `packages/scripts/`); the runtime is server-only with no hydration beyond the progressive enhancement bundle.

## Getting around

- `src/routes/` — SvelteKit routes. `courses/[course]/` and `writing/[slug]/` pick up content through server loaders that render the mdsvex-compiled Svelte module to HTML, then embed the result under a single `data-content-document` wrapper.
- `src/lib/` — app-scoped helpers: server loaders, code-annotation rendering, structured-data builders, metadata, OG-image generation.
- `src/lib/markdown/` — mdsvex layouts (`base.svelte`, `page.svelte`). The mdsvex config points at these from `svelte.config.ts`.
- `plugins/vite/` — Vite dev-server plugins that keep the content pipeline alive during development. They are app-local because they encode this repository's layout — see `.claude/rules/content-enhancements.md`.
- `tests/` — Playwright integration specs that exercise the content pages end to end.

## Scripts

Everything uses `bunx` rather than hard-coded relative paths to `node_modules/.bin`:

```
bun run dev              # vite dev server on port 4444
bun run build            # vite build + sync generated browser assets
bun run preview          # vite preview
bun run check            # svelte-kit sync + svelte-check
bun run lint             # prettier + eslint
bun run test:integration # playwright
bun run test:unit        # vitest
bun run storybook        # storybook on port 6006
```

Content commands (collect + validate + build the generated tree) live in `@stevekinney/scripts`; the website app exposes them through `bun run content:build` and `bun run content:validate` wrappers.

## What's shared from where

- `@stevekinney/markdown` — remark/rehype plugins consumed by `svelte.config.ts` and by `@stevekinney/scripts`.
- `@stevekinney/content-enhancements` — browser-side enhancer modules, bundled by `@stevekinney/scripts` into `.generated/content-enhancements/`.
- `@stevekinney/components` — Svelte components imported via the `$lib/components/*` path alias.
- `@stevekinney/utilities` — pure helpers (types, frontmatter parsing, route normalization, image manifest).
- `@stevekinney/scripts` — content pipeline, build-report, image sync, adapter post-processing. Exposed as bin entries so workspace scripts invoke them by name.

## Adding a new content route

Most new pages are markdown files under `writing/` or `courses/` — the content pipeline picks them up automatically. Adding an entirely new route type means:

1. Write a new `+page.server.ts` that loads the content.
2. Wrap the rendered HTML in `<div data-content-document>{@html data.contentHtml}</div>` exactly once. Two wrappers double every enhancement.
3. Include `<ContentEnhancements />` above the content to inject the enhancer script.
4. Add the route to the prerender list in `svelte.config.ts` if it isn't reachable from the site map.
