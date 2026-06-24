---
title: Compacting Claude Code Sessions
description: >-
  Use Claude Code compaction deliberately, preserve task state in files, and
  avoid relying on long chat history for correctness.
modified: 2026-06-24
date: 2025-07-29
---

Compaction summarizes a long [Claude Code](https://code.claude.com/docs/en/overview)
session so work can continue with less context. It is useful, but it is also a
compression step. Details can be lost.

## What to Preserve Before Compacting

Before a long task compacts, make sure the important state is in the filesystem:

- The plan is written in a file or reflected in tests.
- The branch diff is coherent.
- Verification commands are known.
- Blockers are documented with command output.
- Decisions are captured in `CLAUDE.md`, rules, skills, or project
  documentation when they need to persist.

If a future session needs to remember a subtle decision, put that decision in a
file before compaction.

## Manual Compaction

Use compaction when the session is still on the same goal but the context is
getting noisy. After compaction, ask Claude to restate:

```text
Restate the goal, files changed, remaining tasks, and verification commands.
Do not edit files.
```

Compare that answer with `git diff` and the task plan before continuing.

## Hooks Around Compaction

Claude Code exposes hook events around compaction. Use them sparingly for
auditing or preserving status, not for hiding critical project state in an
invisible automation.

## Large Context Is Not a Replacement

Large-context model aliases such as `sonnet[1m]` and `opus[1m]` can reduce the
need to compact, but they do not remove the need for clean task state. A million
tokens of unclear conversation is still unclear.
