---
title: Developing with AI Tools
description: >-
  Learn practical workflows for Cursor, Claude Code, MCP, and agentic software
  development with current installation, context, permission, and review
  guidance.
modified: 2026-06-23
date: 2025-07-30
---

This course is about using agentic development tools without handing them the
steering wheel by accident. The current core tools are
[Cursor](https://cursor.com/) and
[Claude Code](https://code.claude.com/docs/en/overview). Both can edit files, run
commands, call MCP servers, create branches, and review changes. That power is
the point. It is also why the workflow needs structure.

The course baseline was refreshed on June 23, 2026 against official Cursor and
Claude Code documentation and changelogs. Exact model menus, pricing, and version
numbers will continue to change, so model-specific claims are dated or phrased as
volatile.

The durable lessons are:

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
