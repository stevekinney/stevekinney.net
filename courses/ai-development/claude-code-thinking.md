---
title: Encouraging Claude Code to Think
description: >-
  Use plan mode, effort controls, opusplan, and explicit tradeoff questions
  instead of relying on magic prompting phrases.
modified: 2026-06-24
date: 2025-07-29
---

The goal is not to make [Claude Code](https://code.claude.com/docs/en/overview)
"think harder" in the abstract. The goal is to make it expose the reasoning that
affects the next action.

## Use Plan Mode for Real Decisions

When a task has multiple plausible designs, start in plan mode:

```text
Plan the smallest change that adds account-level rate limits.
Compare middleware and service-layer implementations. Name the files each path
would touch. Do not edit files.
```

That prompt forces the decision into the open before edits begin.

## Use Effort Controls

Claude Code supports effort controls such as `/effort`. Increase effort when the
task has high reasoning cost: architecture, security, migration planning, or
review. Lower effort for routine edits where latency matters more than deep
analysis.

Effort is not a substitute for context. A high-effort model with the wrong files
will still solve the wrong problem.

## Use Opus Planning Deliberately

The `opusplan` alias uses Opus for planning and Sonnet for implementation. It is
a useful default for larger changes because it spends the expensive reasoning
where it matters most.

Review the plan before implementation:

```text
Use opusplan. Produce the plan first and wait for approval before editing.
```

## Ask Better Tradeoff Questions

Weak:

```text
Think carefully and make this better.
```

Better:

```text
List the two smallest implementation paths, the failure modes of each, and the
verification command that would prove the chosen path works.
```

The second prompt gives thinking a job.
