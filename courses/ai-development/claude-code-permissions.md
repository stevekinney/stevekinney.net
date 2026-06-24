---
title: Claude Code's Permission System
description: >-
  Configure Claude Code permissions with allow, ask, deny, permission modes,
  tool-specific rules, and explicit safety boundaries.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code permissions](https://code.claude.com/docs/en/permissions) decide
what the agent can do without asking. They are one of the most important parts
of a safe setup.

## Permission Outcomes

Rules can allow, ask, or deny. Deny wins over ask, and ask wins over allow. That
means a broad allow rule can still be constrained by a narrower deny rule.

Rules can target tools and parameters:

```text
Bash(bun test:*)
Read(src/**)
Edit(src/**)
Agent(model:opus)
```

Use narrow rules where possible. "Allow all Bash" is a very different policy
from "allow the targeted test command."

## Permission Modes

Claude Code supports modes such as:

- `default`
- `acceptEdits`
- `plan`
- `auto`
- `dontAsk`
- `bypassPermissions`

Use `plan` when you want research without edits. As of June 23, 2026, treat
`auto` as a research-preview mode and review its behavior carefully. Reserve
bypass-style modes for isolated environments where the risk is understood.

## A Practical Team Default

For most repositories:

- Allow read-only inspection.
- Ask before editing files.
- Ask before running shell commands that are not test or lint commands.
- Deny production deployment commands.
- Deny commands that print secrets.
- Keep MCP write tools behind ask rules.

Permissions should match the repository's blast radius. A personal toy project
and a payment system should not have the same policy.
