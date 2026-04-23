# `@stevekinney/markdown`

The markdown transformation plugins used by both the content pipeline (`packages/scripts/content-build.ts` and `validate-content.ts`) and the SvelteKit app (`applications/website/svelte.config.ts`).

## What's inside

Each plugin is published as its own subpath export so consumers pull in only what they use.

| Export                         | What it does                                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./remark-callouts`            | Converts GitHub-style `> [!NOTE]`/`> [!WARNING]` blockquotes into semantic `<blockquote data-callout>` elements (with foldable `+`/`-` variants).                       |
| `./remark-escape-comparators`  | Escapes `<`/`>` comparison operators in markdown prose so mdsvex doesn't mistake them for Svelte tags.                                                                  |
| `./remark-fix-urls`            | Rewrites relative `.md` links into the site's canonical route shape; takes the writing/courses content roots as options.                                                |
| `./remark-tailwind-playground` | Detects ` ```tailwind ` code blocks, extracts a sanitized preview, and emits a placeholder element the runtime enhancement can hydrate.                                 |
| `./rehype-enhance-images`      | Looks up each `<img>` in `image-manifest.json` and rewrites `src`/`srcset` to blob-storage URLs while preserving explicit attributes like `loading` or `fetchpriority`. |

## How it's used

`svelte.config.ts` composes the remark/rehype pipelines for mdsvex; the same plugins run when `content-build.ts` walks the markdown tree to produce `.generated/content-data.json`. Because the package is source-only (`type: module`, TypeScript entrypoints in `exports`), anything that loads it has to either support TypeScript natively (SvelteKit does) or run with `NODE_OPTIONS="--import tsx"` (see `.claude/rules/ci-tooling.md`).

## Best practices

- **Preserve existing component semantics.** When you change a plugin, grep the repository for consumers before trusting types. Callout foldability, the mermaid `data-mermaid` attribute, and Tailwind playground wrappers each depend on specific attribute names.
- **Use data attributes, not class names, for component integration.** Set `data.hProperties` with attributes like `data-callout` or `data-foldable`. Class names are Tailwind territory and will drift.
- **Escape Svelte delimiters in emitted HTML.** When a remark plugin emits `type: 'html'` nodes, mdsvex compiles them as Svelte templates. Curly braces and backticks have to become HTML entities (`&#123;`, `&#125;`, `&#96;`) or the Svelte compiler will treat them as expressions.
- **Never discard regex capture groups.** When a pattern has multiple groups, either use them all or name the unused ones explicitly with a leading comma (`const [, variant, foldIndicator] = match`) so the intent stays clear.
- **Test edge cases against real content.** `grep -r` the `writing/` and `courses/` directories before assuming a feature isn't in use.
