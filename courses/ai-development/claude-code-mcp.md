---
title: Using MCP Servers with Claude Code
description: >-
  Configure Claude Code MCP servers with stdio, HTTP, OAuth login, scopes,
  permissions, and security review.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code MCP](https://code.claude.com/docs/en/mcp) connects Claude to
external tools and data. Use it when the agent needs authoritative context or
must interact with another system through a structured interface.

## Add and Inspect Servers

Use the command line interface:

```bash
claude mcp add
claude mcp list
claude mcp get
claude mcp remove
```

For OAuth-backed servers, use:

```bash
claude mcp login
claude mcp logout
```

Project-scoped servers can live in `.mcp.json`. Use project scope when the server
is part of the repository workflow. Use user scope for personal tools.

## Prefer HTTP for New Remote Servers

Claude Code supports `stdio`, HTTP, WebSocket, and SSE transports. For new remote
servers, prefer HTTP where possible. SSE remains supported for compatibility, but
the current documentation marks it as deprecated.

## Permissions

MCP tools run through Claude Code's permission model. Keep write tools behind
ask rules unless the environment is isolated and the action is low risk.

Prompt important tool use explicitly:

```text
Use the GitHub MCP server only to read the pull request checks and comments.
Do not post comments or update labels.
```

## Security Review

Before adding a server, answer:

- Which external systems can it access?
- Which credentials does it receive?
- Can it write to shared systems?
- Does it expose logs, prompts, or tool arguments?
- Can project configuration add or replace the server?

MCP is a capability boundary. Review it like one.
