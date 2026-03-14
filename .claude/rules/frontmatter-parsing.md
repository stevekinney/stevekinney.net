---
paths:
  - 'packages/scripts/frontmatter.ts'
  - 'packages/scripts/generate-*-manifest.ts'
---

# Frontmatter Parsing

- **Use shared utilities**: `parseFrontmatter`, `toDate`, and `normalizePath` live in `packages/scripts/frontmatter.ts`. Import from there instead of duplicating. This prevents date-parsing fixes from being applied to only one manifest generator.
- **CORE_SCHEMA for dates**: `gray-matter` uses `js-yaml`'s default schema, which silently converts `YYYY-MM-DD` strings into local-timezone `Date` objects. Use `yaml.CORE_SCHEMA` to keep date values as strings, then parse them explicitly as UTC via `Date.UTC()`.
- **Date-only strings are UTC**: When a frontmatter date matches `YYYY-MM-DD` (no time component), parse it as midnight UTC to avoid off-by-one errors in timezones ahead of UTC.
