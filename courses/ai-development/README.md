---
title: Developing with AI Tools
layout: page
description: >-
  Learn practical workflows for Cursor, Claude Code, MCP, and agentic software
  development with current installation, context, permission, and review
  guidance.
modified: 2026-06-23
date: 2025-07-30
---

When you give an agent the power to edit files, run commands, call
[MCP](https://modelcontextprotocol.io/) servers, create branches, and review
changes, the hard part is no longer getting it to act. The hard part is keeping
it pointed at the right target. The current core tools are
[Cursor](https://cursor.com/) and
[Claude Code](https://code.claude.com/docs/en/overview).

The course baseline was refreshed on June 23, 2026 against official Cursor and
Claude Code documentation and changelogs. Exact model menus, pricing, and version
numbers will continue to change, so model-specific claims are dated or phrased as
volatile.

The tools will change. The habits that keep you out of trouble are more durable:

- Give the agent the files, rules, and verification commands that define
  correctness.
- Use rules for always-on constraints and skills for repeatable workflows.
- Keep permissions explicit, especially for shell commands, MCP tools, cloud
  agents, and automation.
- Review diffs and run the quality gates yourself before shipping.
- Persist durable knowledge in the repository, not in a chat transcript.

You should finish this course with a working mental model for when to use inline
edits, chat, local agents, cloud agents, subagents, hooks, automations, MCP, and
continuous integration integrations.
