---
title: Model Context Protocol
description: >-
  Understand MCP as the tool and data layer for coding agents, including
  transports, permissions, OAuth, tool interfaces, and security review.
modified: 2026-06-24
date: 2025-07-29
---

[Model Context Protocol](https://modelcontextprotocol.io/) is a standard way for
agents to connect to tools and data sources. Think of it as the adapter layer
between an agent and the systems it needs to inspect or change.

An MCP server might expose:

- Database queries.
- Browser automation.
- Issue tracker actions.
- Design files.
- Internal documentation search.
- Deployment status.
- Custom product tools.

The agent does not need bespoke code for each integration. It reads the server's
tool list, asks for permission when required, and calls the tool with structured
arguments.

## Transports

Current agent tools commonly support:

- `stdio` for local servers launched as subprocesses.
- `http` for remote servers.
- `sse` for older remote servers.

For new remote integrations, prefer HTTP when the client supports it. Treat SSE
as a compatibility path, especially in Claude Code where the documentation now
marks SSE as deprecated.

## Authentication

Remote MCP servers can use [OAuth](https://oauth.net/2/). That makes the
security model more like a first-party application integration than a local
editor extension. Review the scopes, callback URL, and token storage before
enabling a server for a team.

Local servers can also leak secrets through environment variables, logs, and tool
arguments. "It runs on my machine" is not a security review.

## Tool User Interfaces

Some MCP integrations can return richer user interfaces, not just text. Cursor
documents MCP Apps and tool user interfaces as part of its MCP support. That is
powerful for workflows where the agent needs a human to inspect structured
results, choose an option, or confirm an action.

The same rule applies: the prettier the tool surface, the more important the
underlying permission boundary becomes.

## Course Rule

Use MCP when the agent needs authoritative external context or a real action. Do
not use MCP to hide a shell script that should live in the repository, and do not
enable broad write access without a review path.
