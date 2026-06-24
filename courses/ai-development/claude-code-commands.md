---
title: Claude Code Commands and Skills
description: >-
  Migrate Claude Code custom commands toward Skills while understanding how
  .claude/commands still works.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code Skills](https://code.claude.com/docs/en/skills) are now the primary
way to package reusable workflows. Custom commands in `.claude/commands/*.md`
still work, but new substantial workflows should usually become skills.

## What Changed

Older lessons often taught custom commands as the main extension point:

```text
.claude/commands/review.md
```

That still creates a slash command. The modern shape is:

```text
.claude/skills/code-review/
  SKILL.md
```

Skills can include frontmatter, instructions, scripts, references, assets,
allowed tools, disallowed tools, model preferences, effort, hooks, and agent
configuration. That makes them better for workflows that need more than one
Markdown file.

## When a Command Is Still Fine

Use `.claude/commands` for a tiny slash command that is mostly a prompt shortcut.
If it grows steps, examples, or tool policy, move it to a skill.

## Built-In Skills

Claude Code ships bundled skills such as code review, batching, debugging, loops,
and Claude API work. Use those before writing your own version. A custom skill is
worth it when the repository has local conventions the bundled skill cannot know.

## Migration Pattern

When migrating a command:

1. Create `.claude/skills/<name>/SKILL.md`.
2. Move the command instructions into the skill.
3. Add scripts or references instead of lengthening the entrypoint.
4. Keep the slash command name only if users already rely on it.
5. Delete stale command files once the skill covers the workflow.

Do not keep two copies of the same instruction. Duplicate agent instructions
drift quickly.
