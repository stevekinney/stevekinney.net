---
title: Cursor Command Line Interface
description: >-
  Use Cursor's agent command for terminal workflows, print mode, session resume,
  cloud handoff, and scripted review.
modified: 2026-06-24
date: 2026-06-23
---

[Cursor's command line interface](https://cursor.com/docs/cli/overview) uses the
`agent` command. It is useful when the task belongs in the terminal or when you
want a scriptable agent surface.

## Interactive Sessions

Run `agent` inside a repository:

```bash
agent
```

The terminal interface supports Agent, Plan, and Ask modes. It can resume
sessions, continue the latest session, and hand work to the cloud when you append
`&` to an agent request.

Useful session commands include:

```bash
agent ls
agent resume
agent --continue
```

## Print Mode

[Print mode](https://cursor.com/docs/cli/headless) runs a prompt and exits:

```bash
agent -p "Summarize the staged diff and list test gaps."
```

By default, print mode is safest for read-only work. If you allow file
modification, do it explicitly with the documented flags and only inside a clean
working tree.

## Automation Pattern

Use print mode for narrow checks:

```bash
agent -p "Review this diff for missing tests. Output only findings with file paths."
```

Do not build hidden release systems out of agent prompts. If a step must always
run, put it in a script or continuous integration. Use the agent to reason about
the result.

## Local Permissions Still Matter

The command line interface can run shell commands and edit files. The same
approval rules apply as in the editor: know what the agent is allowed to do,
review the diff, and run the verification command yourself before shipping.
