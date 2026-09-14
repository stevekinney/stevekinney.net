---
allowed-tools: Bash(bun run content:check *), Bash(bun run content:fix *), Bash(bun run content:validate), Read, Edit, Glob
description: Update course Markdown while preserving the current source-of-truth workflow
---

Update course content in `courses/` by editing the Markdown source files directly. The source files—not generated indexes, manifests, or route data—are authoritative.

For a course landing page, preserve `title`, `description`, and authored `date` frontmatter. For a lesson, preserve `title` and `description`; lessons have no publication date, and their modification date is derived from Git history. Keep descriptions plain text, nonempty, unique across writing and courses, and at most 160 Unicode codepoints.

Keep Frontend Masters and practice-repository links in the Markdown body when they are relevant. Preserve existing links and course structure unless the requested update requires changing them. Do not add package manifests, workspace dependencies, generated manifests, `published`, `modified`, `tags`, or unused URL fields.

After editing, run:

```sh
bun run content:fix courses/<slug>/*.md
bun run content:check courses/<slug>/*.md
bun run content:validate
```

The path check catches metadata errors in the edited course. Whole-graph validation catches broken links, routes, and generated index relationships elsewhere in the repository.
