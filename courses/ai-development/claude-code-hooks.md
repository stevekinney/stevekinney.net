---
title: Claude Code's Hooks
description: >-
  Use Claude Code hooks for observable, testable integration points around
  prompts, tools, permissions, compaction, files, and subagents.
modified: 2026-06-24
date: 2025-07-29
---

I reach for [Claude Code hooks](https://code.claude.com/docs/en/hooks) when I've
told an agent the same safety rule twice and I want the repository to enforce it
the third time. Hooks let you run command, HTTP, LLM prompt, or agent hooks
around the session lifecycle. They are powerful because they can influence tool
use and decisions. That also makes them risky.

## Common Events

Claude Code exposes many hook events, including:

- Session start and end.
- User prompt submission and expansion.
- Pre-tool and post-tool use.
- Permission requests and denials.
- Tool failure.
- Subagent start and stop.
- Task creation and completion.
- Pre-compact and post-compact.
- File changes.
- Working directory changes.
- Configuration changes.

Use the narrowest event that fits. A broad hook that fires on every tool call
should be very small and very fast.

## Hook Locations

Hooks can come from user, project, local, managed, plugin, skill, and agent
configuration. That means a hook might be inherited from a place other than the
repository you are currently reading.

When diagnosing surprising behavior, inspect the hook sources before blaming the
model.

## Good Hook Uses

Good hooks are deterministic:

- Block edits to generated files.
- Add a required instruction when a file pattern is touched.
- Log tool use for local audit.
- Deny shell commands that target production.
- Run a fast formatter check after a specific tool action.

Bad hooks try to run the whole development process invisibly. Put real quality
gates in scripts and continuous integration.
