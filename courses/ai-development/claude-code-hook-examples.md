---
title: Claude Code Hook Cookbook
description: >-
  Examples of small Claude Code hooks for generated files, dangerous shell
  commands, compaction notes, and subagent audit.
modified: 2026-06-24
date: 2025-07-29
---

Hooks should be small enough that you can explain them in one sentence. The
examples here are patterns, not copy-paste production policy.

## Block Generated File Edits

Use a pre-tool hook to deny edits under a generated directory:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit",
        "command": "bun scripts/deny-generated-edits.ts"
      }
    ]
  }
}
```

The script should inspect the hook input and return a clear denial when the file
is generated. Keep the path policy in the script so it can be tested.

## Warn on Dangerous Bash Commands

Use a permission or pre-tool hook to require approval for commands that deploy,
delete, force-push, or print secrets. The hook should block the command and tell
the user exactly why.

```text
Denied: command matches a production deployment pattern. Ask the user for
explicit approval with the exact command.
```

## Preserve Compaction State

A pre-compact hook can write a short status file:

```text
goal, changed files, completed checks, remaining checks, blockers
```

Do not use this as the only state store. It is a safety net for long sessions.

## Audit Background Subagents

A subagent stop hook can record the subagent name, tools used, and returned
summary. That is useful when background work affects a main implementation.

Keep audit logs local unless the team has agreed on retention and privacy.
