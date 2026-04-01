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
4. **Initial sections** — Ask for the high-level section names that will appear in `index.toml` (e.g., "The Basics", "Advanced Topics", "Next Steps"). These are just organizational headers — all lesson files live flat in the course root.
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

<Sections from index.toml mirrored here with absolute paths like `/courses/<slug>/lesson-name`>
```

### `index.toml`

The table of contents file. This file organizes lessons into sections using TOML.

```toml
[[section]]
title = "<Section Name>"

[[section.item]]
title = "Lesson Title"
href = "lesson-slug.md"
```

Items can have optional `related` links for exercises and solutions:

```toml
[[section.item]]
title = "Some Topic"
href = "some-topic.md"

  [[section.item.related]]
  title = "Exercise"
  href = "some-topic-exercise.md"

  [[section.item.related]]
  title = "Solution"
  href = "some-topic-solution.md"
```

Start with the section headers the user provided. Leave them empty (no lesson links yet) — the user will add lessons later.

## Step 3: Register the Workspace Dependency

Add the new course package to `applications/website/package.json` under `"dependencies"` (keep alphabetical order):

```json
"@stevekinney/<slug>": "workspace:*"
```

Then run `bun install` from the repo root to update the lockfile and verify Turbo picks up the new workspace.

## Step 4: Generate the Manifest

After creating the files, run the manifest generation script:

```sh
cd courses/<slug> && bun run manifest
```

## Step 5: Confirm

Tell the user what was created and remind them:

- Lesson files are individual `.md` files placed directly in the course root (flat structure, no subdirectories for sections).
- Each lesson needs frontmatter with `title`, `description`, `date`, and `modified` fields.
- Optional fields: `published` (boolean), `tags` (array of strings).
- Exercises and solutions follow the pattern: `topic-exercise.md` and `topic-solution.md`.
- Images go in an `assets/` subdirectory.
- After adding lessons, link them in `index.toml` with relative `.md` hrefs and in `README.md` with absolute paths (`/courses/<slug>/lesson-slug`).
- Run `bun run manifest` from the course directory to regenerate `manifest.json` after changes.
