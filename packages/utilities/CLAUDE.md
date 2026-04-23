# `@stevekinney/utilities` — agent notes

Shared TypeScript helpers. No framework, no runtime globals, no side effects at module scope.

## Load-bearing constraints

- **Every module must be isomorphic.** These helpers run in the browser, in Bun scripts, and under SvelteKit SSR. That means no unguarded `window` / `document` access and no Node-only APIs outside a platform guard. Dependencies that ship their own isomorphic builds (for example `isomorphic-dompurify`, used by `tailwind-playground.ts`) are fine because they handle the DOM split for us. If a module genuinely can't be isomorphic, split it into its own platform-scoped package instead of smuggling platform globals in.
- **`content-types` is a contract, not a sketch.** `GeneratedContent`, `WritingIndexEntry`, `CourseIndexEntry`, and `LessonIndexEntry` define the shape of `.generated/content-data.json`. Breaking changes require rebuilding the content artifact and updating the website's server-only readers in the same commit.
- **`image-manifest` truncates the SHA to 16 hex chars.** That's the blob pathname scheme in production. Do not return the full digest; the manifest key won't match.
- **`tailwind-playground.decodeTailwindPlaygroundHtml` must fail closed.** Wrap `decodeURIComponent` in a try/catch that returns `''` on malformed input so a single bad attribute can't throw during the page-wide enhancement pass.

## Behaviour to preserve across edits

- `frontmatter.normalizePath` uses POSIX separators on all platforms. Don't rely on `path.sep` — content paths are stored as `writing/foo.md`, not `writing\foo.md`.
- `routes.normalizeRoutePath` strips trailing slashes _except_ for the root `/`. The prerender entry logic depends on this distinction.
- `image-discovery.discoverAllImages` returns `{ images, missing }`. Callers iterate `missing` to surface issues; dropping that branch silently hides broken references.
- `write-formatted-json.formatJson` calls Prettier. If Prettier isn't available (e.g. a minimal CI container), it has to fall back gracefully — the current implementation throws, which is fine _only_ because Prettier is always a dev dep.

## Things that look wrong but aren't

- Some exports take absolute paths; others expect relative. Each module comments which is which, but follow the existing shape rather than "normalizing" the arguments.
- `content-types.ts` re-declares shapes that feel like they could come from Zod. That's deliberate: the utilities package has zero runtime dependencies, and importing Zod just for type aliases would be a cost we don't need.

## Modifying the package

- There are no tests inside the package — coverage comes from `content-repository.test.ts` in `@stevekinney/scripts` and the remark/rehype test suite in the website app. Add tests there when you extend a utility.
- When you add a new module, mirror the export pattern in `package.json` (`./<module>` → `./<module>.ts`) so consumers have subpath imports available immediately.
