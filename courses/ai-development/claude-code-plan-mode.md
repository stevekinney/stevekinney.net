---
title: Claude Code Plan Mode
description: >-
  Use Claude Code plan mode for research, option comparison, permission
  boundaries, and implementation handoff.
modified: 2026-06-24
date: 2025-07-29
---

Plan mode in [Claude Code](https://code.claude.com/docs/en/permissions) is a
permission boundary. It lets Claude inspect and reason without immediately
editing files.

Use it when the task is unclear, risky, or broad.

## What Plan Mode Should Produce

A useful plan includes:

- The files Claude inspected.
- The implementation options.
- The chosen path and why it is smallest.
- The files expected to change.
- The verification commands.
- The stop conditions.

Prompt:

```text
Enter plan mode. Research the smallest safe way to add refresh-token rotation.
Compare at most two implementation paths. Do not edit files.
```

## Approving the Plan

Before switching from planning to implementation, check the file list and
verification command. If either is missing, the plan is not ready.

Good handoff:

```text
Implement option B only. Write the regression test first. Run the targeted test
and bun run lint. Stop on unrelated failures.
```

## Plan Mode Versus Opus Plan

Plan mode controls permissions. `opusplan` controls model routing. They combine
well for complex tasks, but they solve different problems. Plan mode says "do
not edit yet." `opusplan` says "use a stronger model for planning."
