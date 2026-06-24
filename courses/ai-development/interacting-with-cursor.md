---
title: Interacting with Cursor
description: >-
  Use Cursor's inline editing, chat, agent, plan, cloud, and terminal workflows
  with clear approval boundaries.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor](https://cursor.com) gives you several interaction surfaces. They are not
different skins on the same prompt. Each one has a different blast radius.

## Inline Edit

Use inline edit for surgical changes to selected code. Select the relevant code,
press `Cmd+K` or `Ctrl+K`, and ask for the change you want. This is the right
tool when the surrounding file already tells the story.

Good inline prompts are narrow:

```text
Convert this function to return a discriminated union.
Do not change the call sites.
```

If the request needs repository search, tests, or multiple files, move up to the
agent.

## Chat

Chat is useful for questions, debugging, and design discussion. Cursor can use
open files, selected code, mentioned files, documentation references, images, and
web context. Ask for citations when you need to understand where an answer came
from.

```text
Explain how authentication is wired in this project.
Use file references and do not propose changes yet.
```

Use Chat when the next best step is understanding. Use Agent when the next best
step is changing code.

## Agent Mode

Agent mode opens from the side pane with `Cmd+I` or `Ctrl+I`. It can search the
repository, read files, edit files, run shell commands, use configured MCP tools,
open a browser, and ask clarifying questions while continuing with work it can
already do.

Give the agent a verifiable finish line:

```text
Add validation for invalid invite tokens.
Write the failing test first, implement the fix, then run the targeted test and
the repository lint command. Stop if either command fails for an unrelated reason.
```

Cursor creates checkpoints during agent work, so you can inspect or roll back a
bad turn. Checkpoints are a recovery feature. They are not a substitute for
reviewing diffs.

## Plan and Ask Modes

Plan mode is for research before edits. Ask mode is for answers without action.
Use Plan mode when a request has multiple reasonable designs, unknown files, or
security implications.

A useful plan request names the decision you need:

```text
Plan the smallest change that adds Slack notifications to failed imports.
Compare the two likely implementation paths and list the files each path touches.
Do not edit files.
```

## Cloud and Terminal Workflows

Cloud Agents run in isolated cloud environments and are useful for tasks that can
continue away from your laptop. Automations run Cloud Agents from schedules and
events. The `agent` command line interface is useful for terminal-native review,
scripts, and remote sessions.

These surfaces are powerful because they can act while you are not staring at
the editor. That is also the risk. For cloud or terminal work, make permissions,
verification commands, and failure signals explicit in the prompt.
