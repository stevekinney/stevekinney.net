# `@stevekinney/markdown` — agent notes

Remark/rehype plugins consumed by mdsvex and the content pipeline. Keep changes compatible with both entry points.

## Load-bearing constraints

- **Subpath exports stay explicit.** Every plugin has its own subpath entry (`./remark-callouts`, `./rehype-enhance-images`, etc.). A barrel `./` export would force consumers to load every plugin at type-check time and defeat the package's lean import cost.
- **Plugins return unified `Plugin` types, but consumers see mdsvex's bundled `unified` types.** The two don't agree on `Node` shape. `svelte.config.ts` collapses the mismatch with `asPluggable` / `asPreprocess` helpers — don't refactor those away; the types reconcile at the edge, not inside this package.
- **Emit HTML safely.** Any `type: 'html'` node goes through mdsvex and Svelte. `{`, `}`, and `` ` `` must be encoded as `&#123;`, `&#125;`, `&#96;` in the emitted HTML. `remark-tailwind-playground` and the Shiki highlighter in `svelte.config.ts` both rely on this; new plugins must too.
- **Blob-storage image URLs are the production path.** `rehype-enhance-images` looks up the manifest truncated SHA (first 16 hex chars of SHA-256). In dev, images missing from the manifest fall through to the `serve-content-assets` Vite plugin. Do not fabricate URLs when the manifest has no match — downstream validation depends on the absence.

## Behaviour to preserve across edits

- `remark-callouts` encodes variant (`NOTE` / `TIP` / `IMPORTANT` / `WARNING` / `CAUTION`) and fold state (`+` or `-` after `]`) on separate `data-` attributes. Class names are a styling layer; attributes are the contract.
- `remark-fix-urls` treats its second argument as `[writingRoot, coursesRoot]`. Rewrites happen relative to the file's physical location; do not try to resolve through the generated route map — the transform runs before routes exist.
- `remark-tailwind-playground` extracts the sanitized HTML with DOMPurify and emits a placeholder element plus a `data-tailwind-playground-html` attribute. The runtime enhancer reads that attribute, so changing its name breaks the playground enhancer silently.
- `rehype-enhance-images` reads `file.path ?? file.filename ?? file.history[0]`. mdsvex's bundled `VFile` stores the path as `filename`, not `path` — do not "simplify" this to `file.path`.

## Things that look wrong but aren't

- Some plugins take options as a tuple `[plugin, options]` while others don't. That's the unified contract — a plugin function is valid, and so is `[plugin, options]`.
- `remark-escape-comparators` runs _before_ `remark-gfm`. Flipping the order silently breaks `<` and `>` comparisons inside prose by letting gfm's autolinker eat them first.

## Modifying the package

- Unit tests live at `applications/website/src/lib/remark-*.test.ts` and `src/lib/remark-tailwind-playground.test.ts`. Run them with `bun run test:unit`.
- Build-time coverage comes from `bun run content:validate` and the Playwright `content-pages.spec.ts` integration tests — they exercise the plugins against real site content.
