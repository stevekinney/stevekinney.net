---
title: Integrating with GitHub Actions
description: >-
  Use Claude Code GitHub Actions and Cursor review automation with explicit
  prompts, secrets, permissions, and pull request verification.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) and
[Cursor](https://cursor.com/docs/integrations/github) can bring agents into
[GitHub](https://github.com/) workflows. The common pattern is simple: an event
or comment gives an agent a bounded task, and the agent reports back through a
pull request or comment.

## Claude Code GitHub Actions

Claude Code GitHub Actions are built on the Claude Agent SDK. The current
workflow uses `@anthropics/claude-code-action@v1`, a `prompt`, and optional
`claude_args`. Older beta `mode` patterns should not be copied into new lessons.

Use `/install-github-app` for guided setup when possible. For manual setup, keep
the Anthropic API key in GitHub Secrets and scope repository permissions tightly.

## Cursor Review and Automation

Cursor can participate in GitHub through Cloud Agents, automations, Bugbot, and
Security Agents. GitHub triggers can include issue comments, pull request review
comments, submitted reviews, review thread updates, and workflow run completion.

Use these integrations for bounded work:

```text
When CI fails, inspect the failing job. Open a pull request only if the fix is
confined to test configuration. Otherwise, comment with the diagnosis and the
failing command.
```

## Security Boundaries

Agent workflows in GitHub need special care:

- Do not expose broad secrets to pull request workflows from forks.
- Keep write permissions narrow.
- Require human review for generated pull requests.
- Treat MCP servers and external tools as part of the workflow's trusted
  computing base.
- Pin action versions according to the repository's security policy.

## Completion Criteria

An agent-assisted pull request is not done when the bot posts a comment. It is
done when the diff is reviewed, comments are resolved, continuous integration is
green, and the branch still merges cleanly with the base branch.
