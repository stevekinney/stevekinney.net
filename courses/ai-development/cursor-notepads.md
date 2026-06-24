---
title: Cursor Notepads Migration
description: >-
  Replace deprecated Cursor Notepads with Rules, Skills, Memories, and ordinary
  Markdown references while keeping old lesson links valid.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor Notepads](https://forum.cursor.com/t/deprecating-notepads-in-cursor/138305)
were deprecated by Cursor in 2025. Do not introduce Notepads into a current
workflow. If you find one in an older course, team process, or personal setup,
migrate the content into a durable source that matches how the information is
used.

This page keeps the old route alive because external links may still point here.
The current lesson is migration, not usage.

## Where Notepad Content Should Go Now

Use this mapping:

- Repeated behavioral guidance becomes a Project Rule in `.cursor/rules/*.mdc`.
- Multi-step workflows become a Skill in `.cursor/skills/<name>/SKILL.md`.
- Personal preferences that should not live in the repository become Cursor
  Memories or User Rules.
- Long explanations, architecture notes, and onboarding material become ordinary
  Markdown files in the repository.
- Team-wide policy belongs in Team Rules or repository-owned documentation.

The old habit was "bundle whatever I need later." The current habit should be
"put the information where ownership and review are obvious."

## Migration Example

An old Notepad might contain this:

```text
When editing API routes, use zod validation, return typed errors, update tests,
and run bun test:unit.
```

That should become a scoped project rule:

```md
---
description: API route testing and validation expectations.
globs:
  - 'src/routes/api/**/*.ts'
alwaysApply: false
---

When editing API routes, validate inputs at the boundary, return the existing
typed error shape, update the closest regression test, and run the targeted unit
test command before reporting completion.
```

If the Notepad also included a release checklist, move that checklist into a
skill instead of making the rule longer.

## What Not to Migrate

Do not preserve stale Notepad content just because it used to exist. Delete
temporary prompts, old model recommendations, copied documentation, and notes
that no longer match the repository. Migrating bad context just gives it a new
folder.
