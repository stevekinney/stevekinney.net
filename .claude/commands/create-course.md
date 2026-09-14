---
allowed-tools: Bash(mkdir *), Bash(ls *), Bash(bun run content:check *), Bash(bun run content:fix *), Bash(bun run content:validate), Write, Read, Glob
description: Scaffold a course landing page and lesson files
---

Create course content under `courses/<slug>/` using the repository's current flat-file layout.

Ask for the course title, kebab-case slug, short description, and any Frontend Masters or practice-repository links. The title and description are editorial input. Keep the description plain text, nonempty, unique across `writing/` and `courses/`, and at most 160 Unicode codepoints.

Create a course landing page at `courses/<slug>/README.md`:

```markdown
---
title: <Course Title>
description: <Course Description>
date: '<YYYY-MM-DD>'
---
```

Put the course overview, Frontend Masters link, and practice-repository link in the body. Keep those links in the body rather than adding unused frontmatter fields. Use the existing repository conventions for any section links.

Create lessons as Markdown files directly inside `courses/<slug>/`. Each lesson starts with:

```markdown
---
title: <Lesson Title>
description: <Lesson Description>
---
```

Do not add `modified`, `published`, `tags`, package manifests, workspace registration, generated manifests, or unused URL fields. The content pipeline derives lesson metadata and generated routes from the source files and Git history.

After writing content, run:

```sh
bun run content:fix courses/<slug>/*.md
bun run content:check courses/<slug>/*.md
bun run content:validate
```

The first command checks the edited files. The second validates the whole content graph and generated route/index relationships.
