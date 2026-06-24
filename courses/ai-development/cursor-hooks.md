---
title: Cursor Hooks
description: >-
  Use Cursor hooks to observe, control, and extend agent behavior locally and in
  cloud agents without hiding quality gates in chat.
modified: 2026-06-24
date: 2026-06-23
---

[Cursor hooks](https://cursor.com/docs/hooks) let you run logic around the agent
loop. They can observe events, inject guidance, or block unsafe actions.

Use hooks for small, deterministic guardrails. Do not use them to reimplement a
continuous integration system inside the editor.

## Where Hooks Live

Cursor supports project and user hooks. Cloud Agents can run command-based hooks
from `.cursor/hooks.json` when the hook type is supported in the cloud
environment.

Project hooks are best for repository safety checks. User hooks are best for
personal workflow preferences.

## Hook Types

Cursor supports command hooks and prompt hooks. Command hooks can run scripts and
use exit codes to influence the agent. A blocking exit code can stop an unsafe
action before it happens.

Good hook use cases include:

- Blocking edits to generated files.
- Warning when a command targets production.
- Adding repository-specific context at session start.
- Recording agent activity for local audit.

## Keep Hooks Small

A hook should be fast, readable, and easy to disable during diagnosis. If a hook
needs complex state, it probably belongs in a checked-in script with tests.

For example, a hook can call:

```bash
bun scripts/check-generated-file-edit.ts "$CURSOR_FILE"
```

The script owns the logic. The hook owns the integration point.

## Security Posture

Hooks run code. Review them with the same suspicion you would apply to a build
script. A malicious or sloppy hook can leak secrets, approve dangerous commands,
or hide failures from the developer.
