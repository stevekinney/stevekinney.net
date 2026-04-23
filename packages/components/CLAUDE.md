# `@stevekinney/components` — agent notes

Shared Svelte 5 components used across the website. The package has no build step — consumers import `.svelte` files directly.

## Load-bearing constraints

- **Svelte 5 runes are the default.** New components use `$state`, `$derived`, `$props`, `$effect`. Migrations from Svelte 4 patterns (stores, `export let`, `$:`) happen leaf-first to keep each commit green.
- **No state shared at module scope.** Module-level `let counter` is observable across SvelteKit SSR requests and leaks between users. Encapsulate shared state in a class inside a `.svelte.ts` file or a context created with `createContext`.
- **`content-enhancements.svelte` is the only path to the progressive-enhancement bundle.** It injects a `<script type="module" src="…/content-enhancements.js">` into `<svelte:head>`. Route templates _must_ render it on content pages — removing it silently disables mermaid, copy buttons, tables, and the Tailwind playground.
- **Components don't own the `data-content-document` wrapper.** The route template wraps server-rendered HTML; components stay focused on their local markup. If a component needs the wrapper, the route is probably doing something wrong.

## Behaviour to preserve across edits

- `open-in-obsidian.svelte` and `pull-request.svelte` accept a `repoPath` prop. Its type is the `RepoPath` template literal defined in the website's `src/lib/repo-path.ts` — keep the shape matched on both sides.
- `seo.svelte` builds the JSON-LD graph. It expects an array of entities (`buildCourseSchema`, `buildBreadcrumbSchema`), not a single object, and emits them as one `<script type="application/ld+json">`.
- `navigation.svelte` treats the active link via `$page.url.pathname` normalization. Don't compare against raw `href` values.

## Things that look wrong but aren't

- The package has no tests directory. Component behavior is covered by Storybook stories in the website app (`applications/website/src/**/*.stories.svelte`) and the Playwright integration suite.
- Some components still use JSDoc `@typedef Props` instead of TypeScript interfaces — remnants of the Svelte 4 → 5 migration. Convert to a `type Props` block when you touch a file, but don't make that the goal of its own commit.

## Modifying the package

- Storybook: `bun run storybook` from the repo root runs the component explorer on port 6006.
- Prop changes to shared components should go through Storybook first — the story serves as both a visual test and an API sketch.
- When you add a new component, keep it colocated with its siblings: `badge/` for the badge family, loose `.svelte` files at the root only for singletons.
