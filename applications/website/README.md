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

## Authoring Tailwind playgrounds

Mark an HTML fence with `tailwind` and a positive integer `height` in pixels. The preview fills the article width and scrolls internally when its content exceeds the authored height. Its caption, standalone link, iframe, and highlighted source are rendered together on the server. The first frame loads eagerly; subsequent frames use native lazy loading. No JavaScript is required to view the example or source.

````markdown
```css playground=brand
@theme {
  --color-brand: #5b21b6;
}
```

```html tailwind height=160 css=brand title="Save button"
<button class="bg-brand rounded px-4 py-2 text-white">Save changes</button>
```
````

CSS names belong to one Markdown file and may appear before or after their references. Multiple examples can share a definition. CSS remains visible where you teach it, with a link from each referencing example. Ordinary CSS and Tailwind directives such as `@theme`, `@utility`, `@custom-variant`, and `@apply` are supported. Executable fragments reject `@import`, `@reference`, `@source`, `@config`, and `@plugin`; show installation instructions in separate unmarked fences.

Optional `theme` accepts `light` (the default), `dark`, or `system`. The iframe explicitly declares its color scheme independently of the website theme. Tailwind's standard media-based dark variant remains intact; selector-based dark variants must be declared in linked CSS. Standalone examples follow the browser viewport and preference. Omit `title` to derive an accessible title from the nearest heading and example ordinal. Existing line-highlighting metadata remains supported.

Invalid metadata, missing CSS references, stale manifest entries, duplicate names, and forbidden HTML fail the build with source locations. Native elements, SVG, accessibility attributes, inline styles, and authored `html`/`body` attributes are preserved. Scripts, event handlers, executable URLs, embedded documents, author stylesheets, and redirects are rejected. The generated document owns the head. Forms retain native validation, but response policy prevents submission and scripts. Both the iframe sandbox and response headers use `allow-forms` without same-origin access.

Playground Tailwind is pinned in the scripts workspace and has no website theme, typography plugin, or website source discovery. The website stylesheet scans rendering sources and generated classes from raw article HTML; fenced examples do not enter it. After changing playground behavior, run the repository validation, build, integration tests, and build budget checks. The finite migration screenshot audit is `bun applications/website/tests/audit-tailwind-playgrounds.ts --base-url http://127.0.0.1:4445` against a running preview; it is deliberately outside production builds.

For automated Vercel preview verification, send the `x-vercel-skip-toolbar: 1` request header. [Vercel documents this automation header](https://vercel.com/docs/vercel-toolbar/managing-toolbar) to disable its preview toolbar, which otherwise appends a script to HTML responses for authenticated reviewers. The playground CSP intentionally blocks scripts. Verify the child HTML and CSS response headers and compare their bytes with the manifest, alongside the parent page's separate framing prohibition. Project toolbar settings can disable that injection for interactive reviews as well.

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
