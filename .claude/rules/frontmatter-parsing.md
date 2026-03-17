---
paths:
  - 'packages/scripts/frontmatter.ts'
  - 'packages/scripts/generate-*-manifest.ts'
  - 'packages/scripts/update-content-dates.ts'
  - 'applications/website/src/lib/posts.ts'
  - 'applications/website/src/lib/schemas/courses.ts'
---

# Frontmatter Parsing

- **Use shared utilities**: `parseFrontmatter`, `toDate`, `toDateString`, and `normalizePath` live in `packages/scripts/frontmatter.ts`. Import from there instead of duplicating. This prevents date-parsing fixes from being applied to only one manifest generator.
- **CORE_SCHEMA for dates**: `gray-matter` uses `js-yaml`'s default schema, which silently converts `YYYY-MM-DD` strings into local-timezone `Date` objects. Use `yaml.CORE_SCHEMA` to keep date values as strings, then parse them explicitly as UTC via `Date.UTC()`.
- **Date-only strings are UTC**: When a frontmatter date matches `YYYY-MM-DD` (no time component), parse it as midnight UTC to avoid off-by-one errors in timezones ahead of UTC.
- **Canonical date format is `YYYY-MM-DD`**: All content frontmatter stores `date` and `modified` as date-only strings. The pre-commit hook (`update-content-dates.ts`) enforces this automatically. Do not use ISO datetime strings in frontmatter.
- **No `published` field**: All committed content is considered published. The `published` frontmatter field was removed; do not reintroduce it in types, schemas, or templates.
- **Keep Zod schemas format-flexible for dates**: Zod schemas validating post/course metadata should use `z.string()` for date fields, not `z.string().datetime()` or `z.string().date()`. Content stores `YYYY-MM-DD` but mdsvex's YAML parser may convert dates to full ISO strings at runtime — the schema must accept both.
- **Editing frontmatter safely**: When modifying frontmatter programmatically, use targeted regex replacement on the raw YAML block rather than parse-then-reserialize. Reserializing with `matter.stringify` or manual string concatenation can strip necessary quoting (e.g., titles containing colons like `'What If It Goes Wrong?:'`).
