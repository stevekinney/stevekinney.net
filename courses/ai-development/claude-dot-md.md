---
title: CLAUDE.md, Rules, and Memory
description: >-
  Use CLAUDE.md, .claude/rules, auto memory, AGENTS.md imports, and skills as
  distinct instruction layers in Claude Code.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code](https://code.claude.com/docs/en/memory) has two broad memory
systems: human-written memory and Claude-written auto memory. Both are context,
not enforcement. If something must be enforced, encode it in tests, lint,
permissions, hooks, or continuous integration.

## CLAUDE.md

`CLAUDE.md` is the main human-written project instruction file. It can live at
the repository root or under `.claude/`. User-level instructions can live at
`~/.claude/CLAUDE.md`.

Use `CLAUDE.md` for durable project guidance:

```md
# Project Instructions

- Use Bun for package management.
- Run `bun run lint` and the closest test before reporting completion.
- Do not edit generated files directly.
```

Keep it short. Link to deeper documentation instead of turning the file into a
manual.

Do not rely on local-only memory for shared project policy. If the next person
needs the instruction, put it in a versioned file.

## Imports and AGENTS.md

Claude Code supports imports with `@path` references. As of the current
documentation, Claude Code does not read [`AGENTS.md`](https://agents.md/)
directly. If a repository uses `AGENTS.md`, create a `CLAUDE.md` that imports it:

```md
@AGENTS.md
```

That keeps one shared instruction source without pretending every agent discovers
files the same way.

## .claude/rules

Rules in `.claude/rules/*.md` are useful for scoped context. They can include
frontmatter such as `paths` so the rule attaches to relevant files.

Use rules for constraints:

```md
---
paths:
  - 'src/routes/api/**/*.ts'
---

API routes must validate input at the boundary and return the shared error
shape.
```

## Skills Versus Rules

Use skills for task-specific workflows. If the instruction has phases, scripts,
references, or assets, it probably belongs in `.claude/skills/<name>/SKILL.md`
instead of a rule.

Rules shape the session. Skills run a workflow.

## Auto Memory

Auto memory is Claude-written and can help carry preferences forward, but it
should not become the only place important project behavior lives. If an auto
memory captures a real team decision, move that decision into a versioned file.
