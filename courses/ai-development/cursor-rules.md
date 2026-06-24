---
title: Cursor Rules
description: >-
  Use Cursor Project Rules, User Rules, Team Rules, and AGENTS.md instructions
  without turning prompts into a stale style guide.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor Rules](https://cursor.com/docs/rules) are system-level instructions for
Cursor's agent. They are the right place for behavior that should apply before a
specific prompt exists.

## Rule Types

Cursor supports four practical instruction sources:

- **Project Rules** live in `.cursor/rules/*.mdc` and belong in the repository.
- **User Rules** live in Cursor settings and follow one developer across
  projects.
- **Team Rules** are centrally managed for teams.
- **AGENTS.md** files can also provide repository instructions.

Project Rules use Markdown with frontmatter. The file extension matters:
`.mdc` is the Cursor rule format. Plain `.md` files in `.cursor/rules` are not
treated as project rules.

## Application Modes

A project rule can apply in different ways:

- Always apply.
- Apply intelligently when its description matches the task.
- Apply to specific file globs.
- Apply only when manually referenced.

Use the weakest mode that is still reliable. Always-on rules are expensive and
can create conflicting instructions when they try to describe every possible
task.

## A Small Useful Rule

```md
---
description: Testing expectations for server-side TypeScript changes.
globs:
  - 'src/**/*.ts'
alwaysApply: false
---

When changing server-side TypeScript, update or add the closest unit test before
implementation. Run the targeted test command and the repository lint command
before reporting completion.
```

This is specific enough to act on and small enough to audit.

## Rules Versus Skills

Use a rule for a constraint. Use a skill for a workflow.

For example, "prefer typed errors in server code" is a rule. "Run the release
checklist, update the changelog, build packages, and verify generated exports" is
a skill because it needs steps, references, and probably scripts.

Cursor can read skills from `.cursor/skills`, `.agents/skills`, `.claude/skills`,
and `.codex/skills`, so a well-written skill can serve more than one agent.

## Maintenance

Keep rules under roughly a few hundred lines and split by concern. Remove
obsolete rules in the same pull request that makes them obsolete. A stale rule is
not harmless documentation; it is active instruction.
