---
title: Installing and Getting Started with Cursor
description: >-
  Download, install, and configure Cursor with Visual Studio Code migration,
  privacy settings, rules, skills, and the command line interface.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor](https://cursor.com) is still easiest to explain as a code editor with an
agent built into the workflow. The important update is that the editor is no
longer the whole product. Current Cursor also includes cloud agents, automations,
subagents, hooks, skills, Bugbot, Security Agents, and a terminal interface.

Start with the desktop application because that is where the everyday feedback
loop is strongest.

## Install the Desktop Application

Download Cursor from [cursor.com](https://cursor.com). During onboarding, Cursor can
import extensions, settings, keybindings, and themes from
[Visual Studio Code](https://code.visualstudio.com/). That migration is useful
because Cursor is familiar enough that the editor should not be the new thing you
are learning. The agent workflow should be.

After installation, check these settings before you hand it a real repository:

- Enable **Privacy Mode** if the repository contains proprietary code.
- Decide whether model requests can use premium or Max Mode models.
- Add User Rules only for preferences that should follow you across every
  repository.
- Keep repository-specific rules in `.cursor/rules/*.mdc`.
- Configure trusted MCP servers in `.cursor/mcp.json` or `~/.cursor/mcp.json`.

The rule of thumb is simple: personal defaults go in user settings, repository
behavior goes in the repository, and external tools should be explicit enough
that a teammate can audit them.

## Install the Command Line Interface

Cursor also ships a terminal agent. Install it with the official installer:

```bash
curl https://cursor.com/install -fsS | bash
```

On Windows, use PowerShell:

```powershell
irm 'https://cursor.com/install?win32=true' | iex
```

The command is `agent`, not `cursor`. Run `agent` inside a repository for an
interactive session, or use print mode for automation:

```bash
agent -p "Review the staged changes for correctness."
```

File modification from print mode requires an explicit flag such as `--force` or
`--yolo`. Treat that as a real permission decision, not a convenience switch.

## First Project Setup

For a serious repository, create the project-level files before asking the agent
to edit code:

```text
.cursor/
  rules/
    architecture.mdc
    testing.mdc
  mcp.json
```

Add skills only when a workflow needs more structure than a rule can provide:

```text
.cursor/
  skills/
    release-checklist/
      SKILL.md
```

If the repository already has `AGENTS.md`, Cursor will read it as an instruction
source. I still prefer putting Cursor-specific behavior in Cursor files so the
reader can tell which tool owns which instruction.

## Verification Checklist

Before you trust a new setup, ask Cursor to perform a read-only orientation:

```text
Read this repository and summarize the build, test, lint, and release commands.
Do not edit files. Cite the files you used.
```

Then compare its answer to the repository scripts. If it invents commands, fix
the rules or context before you use Agent mode for changes.
