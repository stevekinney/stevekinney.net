---
paths:
  - 'packages/utilities/frontmatter.ts'
  - 'packages/scripts/content-repository/**'
  - 'packages/scripts/content-metadata.ts'
  - 'packages/scripts/check-content-metadata.ts'
  - 'applications/website/src/lib/server/content-documents.ts'
---

# Frontmatter Parsing

- **Use shared utilities**: `parseFrontmatter`, `toDate`, `toDateString`, and `normalizePath` live in `packages/utilities/frontmatter.ts`. Import from there instead of duplicating date and path parsing in content collection or metadata checks.
- **CORE_SCHEMA for dates**: `gray-matter` uses `js-yaml`'s default schema, which silently converts `YYYY-MM-DD` strings into local-timezone `Date` objects. Use `yaml.CORE_SCHEMA` to keep date values as strings, then parse them explicitly as UTC via `Date.UTC()`.
- **Date-only strings are UTC**: When a frontmatter date matches `YYYY-MM-DD`, parse it as midnight UTC to avoid off-by-one errors in timezones ahead of UTC.
- **Authored versus derived metadata**: Writing posts and course landing pages store an authored `date` as `YYYY-MM-DD`. Lessons have no publication date. Modification dates are derived from Git history by the content pipeline.
- **No obsolete metadata**: Do not add `published`, `modified`, `tags`, package registration, or generated manifest fields to new course content unless the current source schema explicitly requires them.
- **Validate through the shared contract**: Use `normalizeContentMetadata` from `packages/scripts/content-repository/metadata.ts`. Authored dates accept real calendar dates or explicitly timezoned ISO timestamps, normalized to UTC dates; ambiguous or impossible dates are errors.
- **Editing frontmatter safely**: When modifying frontmatter programmatically, use the shared normalizer’s YAML syntax-tree ranges. Reserializing can strip necessary quoting from titles and descriptions.
