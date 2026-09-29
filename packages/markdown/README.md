# `@stevekinney/markdown`

This package normalizes published Obsidian Markdown before content validation, mdsvex rendering, and Markdown/LLM responses. The publication index contains only successfully collected routes, image-manifest entries, and published static assets. Referencing a file never makes it eligible for publication.

## Supported syntax

- Callouts use `rehype-callouts` with Obsidian titles, formatted titles, nesting, and native `<details>/<summary>` folding. `+` starts open and `-` starts closed. `warn` and `information` supplement the package aliases. Valid custom types receive the theme's note fallback. Folding uses `data-collapsible` and the native `open` attribute.
- `[[Note]]`, `[[Note|Label]]`, `[[Note#Heading]]`, and `[[Note#^block-id]]` resolve through the publication index. Matching is case-sensitive: source-relative paths precede content-root-qualified paths, unique basenames, and unique frontmatter aliases. Explicit paths never fall back to a different basename.
- `![[Note]]`, heading-section embeds, and block embeds include content without frontmatter or page layouts. Sections include their heading and end at the next heading of equal or higher level. Embedded headings, blocks, footnotes, and reference definitions receive an occurrence namespace. Relative references retain the originating document's meaning.
- Approved image embeds use the existing image-manifest transform. Audio and video use native controls. PDF embeds include an accessible object and a separate file link. Image/video dimensions use `|width` or `|widthxheight`; PDFs support `#page=number`.
- `%%comments%%` are removed from published bodies, including multiline comments crossing Markdown block boundaries. Code examples, raw HTML, executable Svelte regions, and frontmatter remain protected. Unclosed comments fail validation.
- `==highlights==` become `<mark>` while retaining inline Markdown. Inline and display math use `remark-math` and final-stage MathJax SVG rendering. Malformed delimiters follow the parser's literal-text behavior; invalid TeX fails rendering. MathJax uses standalone paths and one generated global stylesheet.
- Trailing `^block-id` definitions create `block-<identifier>` anchors. Standalone markers attach to the preceding Markdown block. Duplicate block IDs and collisions with rendered HTML IDs are errors. Ordinary Markdown links to published documents also validate their fragments.

Missing, ambiguous, escaping, and malformed references are diagnostics with source filenames and line numbers. Embeds reject cycles with an inclusion chain, more than 32 nested inclusions, and expanded output exceeding 10 MiB. Canvas, Bases, and community-plugin execution are unsupported. Aliases and tags accept normalized frontmatter lists without changing publication eligibility.

## Pipeline

`normalizeObsidianMarkdown(source, context)` accepts a source path and publication index. It returns normalized Markdown, dependency paths, diagnostics, and source-offset mappings. The parser uses positioned modern mdast nodes; source edits preserve untouched slices and line endings. Local micromark/mdast extensions recognize comments and block definitions.

Collection first reads source syntax and constructs routes, then builds the publication index and normalizes each document. `content-build.ts` writes a private `.generated/obsidian-content.json` artifact and `.generated/obsidian-math.css`. The Svelte preprocessor and server-only Markdown loaders consume the normalized document artifact. It contains source information for rebuilding and must never be copied into public assets. Vite watches parser sources, the manifest, content, and attachments, rebuilding and invalidating importing modules when dependencies change.

The Flowershow wikilink parser is pinned to `3.4.0`: the investigated `4.0.0` artifact omitted its exported code. Callouts, highlights, and math use ecosystem packages; routing, publication eligibility, image enhancement, and Tailwind previews remain site-specific.

## Exports

| Export                          | Responsibility                                                     |
| ------------------------------- | ------------------------------------------------------------------ |
| `./obsidian-normalization`      | Shared normalization entry point                                   |
| `./obsidian-types`              | Publication index, context, result, diagnostic, and mapping types  |
| `./obsidian-syntax`             | Positioned Obsidian syntax                                         |
| `./obsidian-preprocessor`       | Private generated-artifact loader and Svelte preprocessor          |
| `./rehype-callouts`             | Callout rendering and site aliases                                 |
| `./rehype-obsidian-identifiers` | Embedded heading IDs and final collision validation                |
| `./rehype-obsidian-math`        | Final math rendering and stylesheet generation                     |
| `./remark-escape-comparators`   | Prose comparator escaping for mdsvex                               |
| `./remark-fix-urls`             | Site-specific canonical Markdown routes                            |
| `./remark-tailwind-playground`  | Sanitized HTML previews for the exact `tailwind` metadata token    |
| `./rehype-enhance-images`       | Validated manifest lookup, responsive images, and video attributes |

## Verification

From the repository root, use its pinned Bun and Node versions:

```sh
bun run continuous-integration:validate
bun run test:og-metadata
with-turborepo-cache bun run build
bun run test:integration
```

Regression fixtures live with website plugin tests and script collection tests. Rendering tests compile through mdsvex and Svelte; browser tests exercise native folding and the single content-document wrapper.
