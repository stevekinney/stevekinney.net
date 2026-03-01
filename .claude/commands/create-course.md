---
allowed-tools: Bash(mkdir *), Bash(ls *), Write, Read, Glob
description: Scaffold a new course with all required files
---

You are creating a new course in the `courses/` directory. Each course follows a consistent structure. Your job is to gather the required information from the user and then scaffold the course.

## Step 1: Gather Information

Use AskUserQuestion to collect the following from the user. Ask all questions in a single call when possible.

1. **Course title** — The human-readable title (e.g., "Introduction to Testing", "React Performance").
2. **Course slug** — The kebab-case directory name (e.g., `testing`, `react-performance`). Suggest one derived from the title but let the user override.
3. **Course description** — A brief description of the course content.
4. **Initial sections** — Ask for the high-level section names that will appear in `_index.md` (e.g., "The Basics", "Advanced Topics", "Next Steps"). These are just organizational headers — all lesson files live flat in the course root.
5. **Repository URL** — Optional link to a practice/lab repository on GitHub.
6. **Frontend Masters URL slug** — Optional. If this course is on Frontend Masters, the URL path segment (e.g., `testing` for `frontendmasters.com/courses/testing/`).

## Step 2: Create the Course Directory

Create `courses/<slug>/` with the following files:

### `package.json`

```json
{
  "name": "@stevekinney/<slug>",
  "private": true,
  "type": "module",
  "scripts": {
    "manifest": "bun run ../../packages/scripts/generate-course-manifest.ts",
    "build": "bun run manifest"
  }
}
```

### `README.md`

The main course landing page. Use `layout: page` in frontmatter.

```markdown
---
title: <Course Title>
description: >-
  <Course Description>
layout: page
date: <current ISO 8601 date>
modified: '<current ISO 8601 date>'
---

<If Frontend Masters URL is provided:>
The material in this course is intended to go along with the [<Course Title>](https://frontendmasters.com/courses/<fem-slug>/?utm_source=kinney&utm_medium=social&code=kinney) course with [Frontend Masters](https://frontendmasters.com/?utm_source=kinney&utm_medium=social&code=kinney).

<Course description, expanded into a paragraph.>

<If repository URL is provided:>
## Important Things

- [Practice Lab Repository](repository-url)

<Sections from the \_index.md mirrored here with absolute paths like `/courses/<slug>/lesson-name`>
```

### `_index.md`

The table of contents file. Use `layout: contents` in frontmatter. This file organizes lessons into sections using relative markdown links.

```markdown
---
layout: contents

modified: <current ISO 8601 date>
---

## <Section Name>

- [Lesson Title](lesson-slug.md)
```

Start with the section headers the user provided. Leave them empty (no lesson links yet) — the user will add lessons later.

## Step 3: Generate the Manifest

After creating the files, run the manifest generation script:

```sh
cd courses/<slug> && bun run manifest
```

## Step 4: Confirm

Tell the user what was created and remind them:

- Lesson files are individual `.md` files placed directly in the course root (flat structure, no subdirectories for sections).
- Each lesson needs frontmatter with `title`, `description`, `date`, and `modified` fields.
- Optional fields: `published` (boolean), `tags` (array of strings).
- Exercises and solutions follow the pattern: `topic-exercise.md` and `topic-solution.md`.
- Images go in an `assets/` subdirectory.
- After adding lessons, link them in `_index.md` with relative paths and in `README.md` with absolute paths (`/courses/<slug>/lesson-slug`).
- Run `bun run manifest` from the course directory to regenerate `manifest.json` after changes.
