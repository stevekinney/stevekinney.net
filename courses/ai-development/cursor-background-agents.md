---
title: Cursor Cloud Agents
description: >-
  Use Cursor Cloud Agents for isolated, remote agent work with explicit
  environments, verification commands, artifacts, and review boundaries.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor Cloud Agents](https://cursor.com/docs/cloud-agent) are the current form
of what earlier material called Background Agents. They run in isolated cloud
environments, clone the repository, create their own branch, and can continue
working while you use the editor for something else.

Cloud Agents are useful when a task is clear enough to run away from your local
machine. They are a poor fit for vague product decisions or work that requires
constant taste-level feedback.

## What the Cloud Environment Contains

A Cloud Agent can use:

- A cloned repository from a supported version control provider.
- Installed dependencies and setup commands.
- Secrets that you explicitly provide.
- MCP servers configured for the environment.
- Command-based hooks.
- Browser, terminal, screenshots, videos, logs, and other artifacts.

Environment setup can live in `.cursor/environment.json`. Keep it boring. A
repeatable environment beats a clever prompt every time.

## Prompt Shape

Use cloud prompts that define scope, verification, and stop conditions:

```text
Update the invite-token validation path only.

Acceptance criteria:
- Expired tokens return the same public error shape as revoked tokens.
- A regression test fails before the implementation and passes afterward.
- Run bun test:unit -- src/lib/server/invitations.test.ts and bun run lint.

Stop and report the blocker if dependency installation fails or if an unrelated
test failure appears.
```

That prompt can be judged from a branch diff and command output. "Improve the
authentication flow" cannot.

## Handoff Back to the Editor

Inspect the Cloud Agent branch before merging or continuing locally. Review the
diff, artifacts, command output, and any created pull request. If you continue
locally, treat the branch as untrusted work from another developer: run the tests
again and read the changed files.

Cloud Agents are an execution surface. They do not remove your review
responsibility.
