# SvelteKit Website Development Guide

## Build Commands

- `bun dev` - Start dev server on port 4444
- `bun build` - Build for production
- `bun lint` - Run ESLint and Prettier checks
- `bun format` - Format code with Prettier
- `bun test:unit` - Run Vitest tests
- `bun test:unit -- [test file path]` - Run specific test
- `bun storybook` - Run Storybook on port 6006
- `bun run build:report` - Write `tmp/build-report/website-build-report.{json,md}` after a build

## Code Style

- **Formatting**: Use tabs, single quotes, 100 char line length
- **Naming**: Use kebab-case for files, camelCase for variables
- **Types**: Strict TypeScript with explicit return types
- **Imports**: Group imports (svelte/library/internal)
- **Components**: Use Svelte 5 with typed props
- **Error handling**: Use proper error types and bubbling
- **State management**: Prefer Svelte stores for shared state
- **CSS**: Use Tailwind with class-variance-authority for variants

## Monorepo Layout

Workspaces live under `applications/*` and `packages/*`.

- `applications/website/` — the SvelteKit site. Routes, components, and the prerendered content pipeline all live here.
- `applications/website/plugins/vite/` — Vite dev-server plugins that keep the content pipeline alive during development. They are app-local because they assume this repository's layout; they are not a shared package. `content-development-plugins.ts` returns them in their intended order — register through that factory rather than picking individual plugins.
- `applications/website/src/lib/content-enhancements/` — browser-side progressive enhancement for prerendered HTML. `content-enhancements.ts` is the loader; the `enhance-*.ts` files are plain `(node) => { destroy }` functions (not Svelte `use:` actions, despite the older filenames). `copy-code-block-as-image.ts` is a shared helper used by both code-block and mermaid enhancements.
- `packages/markdown/` — `@stevekinney/markdown`. mdsvex/remark/rehype transforms consumed by `svelte.config.js` and the content pipeline (remark-callouts, remark-escape-comparators, remark-fix-urls, remark-tailwind-playground, rehype-enhance-images).
- `packages/scripts/` — the Bun-driven content pipeline. `content-build.ts` generates `applications/website/.generated/`; `content-repository/` holds the collection and validation graph; `build-report/` holds the decomposed post-build report pipeline.
- `packages/components/` and `packages/utilities/` — shared Svelte components and TypeScript utilities.

## Content Pipeline

The generated-content pipeline is the seam that makes prerendering deterministic and fast:

1. **Collect** (`packages/scripts/content-repository/`): walk `writing/` and `courses/`, parse frontmatter, build routes, and surface validation issues.
2. **Build** (`packages/scripts/content-build.ts`): emit `.generated/content-data.json`, `.generated/tailwind-playground-source.html`, and a bundled `.generated/content-enhancements/` tree. The enhancement bundle is skipped when a hash of `src/lib/content-enhancements/**/*.ts` matches the sidecar `.build-hash` — so Turbo's cache restore keeps working and repeated invocations are no-ops.
4. **Serve** in dev: `applications/website/plugins/vite/` plugins watch content and enhancement sources, re-run the build script on change, and serve the generated bundle and workspace images under stable URL prefixes. In production the `sync-generated-browser-assets.ts` script copies the bundle into each adapter output.
5. **Render** at request time: server-only routes call `renderWritingDocument` / `renderCourseDocument` / `renderLessonDocument` in `applications/website/src/lib/server/content-documents.ts`, which renders the mdsvex-compiled Svelte module to HTML. The route wraps the HTML in a single `<div data-content-document>` — never nest this element, the browser-side enhancer walks every match independently.
6. **Enhance** in the browser: `content-enhancements.ts` lazy-loads the matching enhancers, runs them once per content document, and tracks their `destroy` callbacks for cleanup on `pagehide`.

## Architecture

- SvelteKit with file-based routing
- MDSvex for markdown content (layouts live in `src/lib/markdown/`)
- TypeScript for type safety (see `.claude/rules/typescript.md`)
- Vitest (website) and `bun:test` (scripts) for unit testing
- Playwright for integration tests under `applications/website/tests/`
- Storybook for component documentation
- Turbo for task orchestration — every cacheable task lists its inputs explicitly in `turbo.json`, including content-enhancement sources as a single `**/*.ts` glob so the dev glob and Turbo cache stay in sync.

## Testing Checkpoints

- **`bun run continuous-integration:validate`** runs content validation, image compatibility, lint, svelte-check, and all unit tests. Run this before pushing structural changes.
- **`bun run test:integration`** runs Playwright specs in `applications/website/tests/`. Content-page specs assert exactly one `data-content-document` wrapper per page — this is a regression guard against nested wrappers that would run enhancers twice.
