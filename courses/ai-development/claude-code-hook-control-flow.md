---
title: Claude Code Hook Control Flow
description: >-
  Understand how Claude Code hook decisions, permission prompts, exits, and JSON
  responses influence the agent loop.
modified: 2026-06-24
date: 2025-07-29
---

Hook control flow is where [Claude Code](https://code.claude.com/docs/en/hooks)
stops being "just prompting" and starts looking like a small policy engine.

## The Basic Flow

A typical tool action can pass through:

1. Prompt expansion or instruction hooks.
2. Pre-tool hooks.
3. Permission checks.
4. Tool execution.
5. Post-tool or failure hooks.
6. Agent response.

Different hook types can observe, add context, block, or request a decision.

## The Blocking Contract

For command hooks, the output stream and exit behavior matter:

| Hook response       | What it means                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Exit `0`            | Continue. Use `stdout` only for intentional structured output.                                                           |
| Exit `2`            | Block or steer the action when the event supports blocking. Put the reason in `stderr` so the user and agent can see it. |
| Other non-zero exit | Treat as hook failure. Surface the failure instead of silently continuing.                                               |
| JSON on `stdout`    | Use documented fields such as `decision`, `reason`, and `continue` when a hook needs structured control.                 |

Not every event can block the same way. Pre-tool and permission-oriented hooks
are the right place for guardrails. Post-tool hooks are better for logging,
auditing, and follow-up context.

## Deny Clearly

When a hook blocks an action, return a message that tells the agent and human
what happened:

```text
Denied: generated files under applications/website/.generated must not be edited
directly. Change the source generator and rerun the content build.
```

A vague denial causes loops. A precise denial creates the next step.

## Prefer Declarative Permission Rules First

If a permission rule can express the policy, use the permission rule. Reach for a
hook when the decision depends on logic: file contents, command parsing, current
branch, changed files, or external state.

## Avoid Hidden Retries

Do not use hooks to silently retry failing commands, raise timeouts, or suppress
warnings. A failed hook should surface the issue. Hidden retries make the session
harder to reason about and can hide real bugs.

## Test Hook Scripts

If a hook calls a script, test the script directly with captured input fixtures.
The hook configuration should be boring; the tested script should own the
policy.
