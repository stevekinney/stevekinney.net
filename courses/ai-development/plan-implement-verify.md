---
title: The Plan → Implement → Verify Prompt Pattern
description: >-
  Structure agentic development work as a bounded loop with explicit plans,
  implementation scope, verification commands, and failure signals.
modified: 2026-06-24
date: 2025-07-29
---

The simplest reliable agent workflow is still:

1. Plan.
2. Implement.
3. Verify.

The point is not ceremony. The point is making the agent show its understanding
before it changes files and making success mechanically checkable afterward.

## The Pattern

```text
Goal:
Add validation for expired invite tokens.

Plan:
First inspect the token validation path and the closest tests. Summarize the
smallest implementation path before editing.

Implement:
Write the failing regression test first. Then make the smallest production
change that passes it.

Verify:
Run bun test:unit -- src/lib/server/invitations.test.ts and bun run lint.

Stop:
If a command fails for an unrelated reason, stop and report the command, output,
and likely cause instead of changing unrelated files.
```

This works in [Cursor](https://cursor.com/) Agent mode, Cursor Cloud Agents,
[Claude Code](https://code.claude.com/docs/en/overview), and most command line
agent workflows.

## Why It Works

Planning catches misunderstandings while the cost is still low. Implementation
keeps the agent inside the task. Verification turns "looks good" into a binary
check.

The stop condition matters as much as the success condition. Without it, agents
will often route around failures by editing adjacent code, weakening tests, or
claiming partial success.

## When to Skip the Full Pattern

For a tiny inline edit, a full plan is overkill. Use the pattern when the task:

- Touches more than one file.
- Has security, data, or user-facing risk.
- Requires tests or generated artifacts.
- Could be solved in more than one reasonable way.
- Will run in a cloud, command line, or automated context.

If you cannot name the verification command, you probably do not have a complete
task yet.
