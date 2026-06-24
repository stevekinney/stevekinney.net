---
title: Claude Code and Bash Scripts
description: >-
  Use Claude Code with shell commands and repository scripts while keeping
  command execution auditable, bounded, and reproducible.
modified: 2026-06-24
date: 2025-07-29
---

The first time an agent runs the wrong shell command confidently, you learn why
terminal output needs to be evidence, not vibes.

[Claude Code](https://code.claude.com/docs/en/overview) can run shell commands,
and users can run bash commands inside a session. As of
[Claude Code 2.1.186](https://code.claude.com/docs/en/changelog), commands
entered with `!` trigger a Claude response by default unless
[`respondToBashCommands`](https://code.claude.com/docs/en/settings) is set to
`false`.

That makes terminal output part of the conversation. Treat it as evidence.

## Prefer Repository Scripts

Ask Claude to run documented scripts instead of ad hoc command chains:

```text
Run the targeted test command from package.json. If it fails, report the command
and failure before editing files.
```

Good scripts are repeatable. Long one-off shell pipelines are harder to review
and easier to get wrong.

## Make Commands Bounded

Avoid commands that can hang forever, write to production, or mutate broad state.
For investigation, prefer:

```bash
rg "expired token" src tests
git status --short
bun test src/lib/server/invitations.test.ts
```

For dangerous operations, require an explicit explanation before execution:

```text
Before running any command that deletes files, changes branches, or writes to an
external service, explain the command and wait for approval.
```

## Turn Repeated Shell Work into Scripts

If a command sequence becomes part of the workflow, commit it as a script with a
clear name. Then rules, skills, hooks, and humans can all call the same thing.

Agents are good at reasoning over command output. Build systems should still be
owned by the repository.
