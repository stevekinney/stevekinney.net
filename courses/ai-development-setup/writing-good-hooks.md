---
title: Writing Good Hooks
description: 'Eight rules for hooks that fail safely, a catalog of hooks worth writing, and a table of hook ideas that look clever and cause problems.'
---

A bad hook is worse than no hook. It fires at the wrong time, dumps a build log into the context, blocks something harmless, or silently lets the dangerous thing through. And because hooks run automatically, nobody notices until the damage is done.

This lesson builds on [Hooks](hooks.md), which covers the mechanics, and [The Enforcement Ladder](the-enforcement-ladder.md), which covers when to reach for one. Here's how to write ones that hold up.

## Rules for hooks

- **Keep scope narrow and output actionable**: "Verification failed" is less useful than "The account-settings test failed; here is the command and the first relevant failure." Avoid dumping an entire build log into every continuation.
- **Separate feedback from enforcement**: A `PostToolUse` check can't prevent side effects that _already_ occurred. That's not how time works. Likewise, an asynchronous check (one that runs in the background without holding the agent up) can't gate an action that continues before the check finishes. Claude's documentation _explicitly_ notes that asynchronous hooks can't block the behavior they would otherwise control.
- **Make repeated executions safe**: Assume a hook may fire _more often_ than you expect. Deduplicate notifications, make file changes idempotent (safe to run twice) so they converge rather than oscillate, and keep checks from competing over shared temporary files.
- **Don't assume several hooks form a sequential pipeline**: All the hooks that match one event run in parallel, in no guaranteed order. When order matters (format, then check, then report), put the sequence in one script so the dependencies are visible in code.
- **Choose failure behavior deliberately**: A failed desktop notification should _not_ stop the work. A failed security guard probably should. A guard fails _closed_ when it catches its own errors and exits `2` (or returns a deny decision) on purpose, because an unhandled crash exits `1`, which lets the action proceed. Plan for timeouts, malformed output, missing executables, and unavailable services, not just the happy path.
- **Treat hook code as executable software, not harmless configuration**: It's a shell script running on your machine. You should probably make sure it's not going to `rm -rf /` or anything like that.
- **Don't confuse "it runs" with "it guarantees"**: These are four separate properties: the hook gets invoked, its decision is deterministic (same input, same answer), its effect is safe to repeat, and its run is reproducible (replaying the recorded event gives the same result, which needs the policy version and inputs saved). Only claim the ones you've actually shown.
- **Write the decision as a pure function**: Something like `policy(event, stateSnapshot, policyVersion)`, which gives the same answer for the same inputs. The clock, the network, a mutable branch, and environment variables are all hidden inputs. Record them or remove them.

## Example hooks

These are the jobs hooks do well. Most fit one specific event, and none tries to manage work.

- **Catching a missed verification step before handoff**: Sometimes the agent announces "implemented and ready" without running the required checks. A hook can look for a sentinel: a marker, such as a file on disk, whose presence proves the checks ran for this exact set of changes. [Sentinels](sentinels.md) covers the idea.
- **Steering an agent away from generated files**: If an agent keeps mucking around with your generated files, a hook can redirect it. A permission deny rule blocks the path more simply. Use a hook when you want to explain the proper source, or when the decision depends on what's in the call.
- **Loading small amounts of context into the current session**: Add details like the branch name or its ticket, based on what you're doing and where, so the agent doesn't have to think to run the command itself.
- **Notifications and other lightweight operational logging**: Tell some external system, like a dashboard, what the agent is doing: started, waiting for you, finished.

Here's a fuller catalog. The Trigger column names the lifecycle event, a set point in the agent's work: `PreToolUse` runs before a tool, `PostToolUse` after one, and `Stop` when the agent ends a turn and waits for you. `SessionStart` and `SessionEnd` fire at the edges of a session. `PermissionRequest` fires when the agent is waiting on your approval. (A worktree, mentioned in one row, is an extra checkout of the same Git repository in its own directory.)

| Hook                        | Trigger                     | What it does                                                                                                                                                           |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Smart formatter**         | `PostToolUse`               | Formats only files the agent just changed                                                                                                                              |
| **Generated-file guard**    | `PreToolUse`                | Blocks direct edits to generated code and explains the proper source                                                                                                   |
| **Dangerous-command guard** | `PreToolUse`                | Catches suspicious destructive commands before execution                                                                                                               |
| **Verification gate**       | `Stop`                      | Checks changed code when the agent stops. `Stop` also fires when the agent just asks you a question, so the gate has to decide whether the agent is claiming it's done |
| **Context bootstrapper**    | `SessionStart`              | Injects branch, worktree, environment, issue, and local-service context                                                                                                |
| **Attention notification**  | `PermissionRequest`         | Sends a macOS notification when the agent is waiting for you                                                                                                           |
| **Secret scanner**          | `PostToolUse`               | Detects credentials or `.env` leakage in newly written content, so the agent can remove it. To prevent the write, scan the content in a `PreToolUse` hook instead      |
| **Migration guard**         | `PreToolUse`                | Prevents modifications to already-applied migrations                                                                                                                   |
| **Session cleanup**         | `SessionEnd`                | Cleans up temporary resources created specifically for the session                                                                                                     |
| **Telemetry hook**          | Several, one hook per event | Records tool usage, durations, failures, and token and cost data                                                                                                       |

## Anti-patterns

Every one of these sounds reasonable until you live with it:

| Proposed hook                                                                                                   | Why I'd avoid it                                                                                                                                                                  | Better choice                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **"On every `UserPromptSubmit`, inject our preferred prompt format as extra instructions."**                    | It silently adds instructions you didn't write and can distort intent. (`UserPromptSubmit` fires when you submit a prompt. A hook there can add context, not replace the prompt.) | Clear instructions, or an explicitly invoked planning skill.                                                                                                             |
| **"After every edit, ask another model whether the architecture is good."**                                     | The review happens at an arbitrary intermediate point and repeatedly evaluates unfinished work.                                                                                   | A review subagent after a coherent change.                                                                                                                               |
| **"Whenever a command uses npm, secretly rewrite it to Bun."** (A `PreToolUse` hook can change a tool's input.) | It changes the requested operation rather than explaining the project convention.                                                                                                 | Instructions first, then a targeted warning or rejection when there's a concrete incompatibility.                                                                        |
| **"Every session start should install dependencies and recreate infrastructure."**                              | Merely opening a session becomes an expensive, mutating operation.                                                                                                                | An explicit, idempotent setup command, or environment provisioning.                                                                                                      |
| **"Run a dependency audit every Monday."**                                                                      | Monday is a scheduling event, not an agent lifecycle event.                                                                                                                       | A scheduler or a scheduled continuous-integration job. See [Routines and Schedules](routines-and-schedules.md), which covers prompts that run on a schedule or an event. |
| **"When one subagent finishes, launch the next five and manage retries."**                                      | Dependencies, cancellation, state, and retry policy become hidden across callbacks.                                                                                               | An explicit coordinator script or workflow runner. See [Dynamic Workflows](dynamic-workflows.md), which covers scripts that orchestrate subagents.                       |
| **"Ensure all contributors obey this check."**                                                                  | A local agent hook isn't the shared integration boundary.                                                                                                                         | Required CI checks and repository protections.                                                                                                                           |

The pattern across the table: a hook that rewrites, schedules, or coordinates is doing a job that belongs somewhere else.

Next, [Hooks in Practice](hooks-in-practice.md) covers testing, rolling out, and the ways guards fail.

A good hook does one small thing, fails the way you chose, and can be explained in a sentence.
