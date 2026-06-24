---
title: MCP in Claude Code and Cursor
description: >-
  Compare MCP configuration, transports, OAuth, permissions, and security review
  in Cursor and Claude Code.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor](https://cursor.com/docs/mcp) and
[Claude Code](https://code.claude.com/docs/en/mcp) both support MCP, but their
configuration and permission models are not identical.

## Configuration Locations

Cursor uses JSON configuration files:

```text
.cursor/mcp.json
~/.cursor/mcp.json
```

Claude Code can use the command line interface and project configuration:

```bash
claude mcp add
claude mcp list
claude mcp get
claude mcp remove
```

Project-scoped Claude Code servers can also live in `.mcp.json`. Prefer
project-scoped configuration when the server is part of how the repository is
developed. Prefer user-scoped configuration for personal tools.

## Transports

Both tools support local `stdio` servers and remote servers. For new remote
servers, prefer HTTP where available. Claude Code still supports SSE, but its
documentation treats SSE as deprecated. Do not design new teaching material
around SSE unless you are explicitly covering migration.

## OAuth and Login

Cursor supports OAuth for remote MCP servers, including a Cursor callback flow.
Claude Code supports OAuth flows from the `claude mcp` command line interface,
including `claude mcp login` and `claude mcp logout`.

OAuth makes the integration easier for humans and more serious for security. The
server can now act with a user's delegated access.

## Permissions

Cursor generally asks before MCP tool calls unless a run mode or setting changes
that behavior. Claude Code routes MCP calls through its permission system, where
allow, ask, and deny rules can be scoped by tool.

For both tools, the safest pattern is:

- Use read-only tools by default.
- Keep write tools narrow.
- Name the server and tool in the prompt when the action is important.
- Review generated pull requests or external changes before treating them as
  complete.

## Security Review Checklist

Before enabling an MCP server for a repository or team, answer these questions:

- Who maintains the server?
- Which secrets does it receive?
- Which external systems can it read or write?
- Does it log prompts, tool arguments, or returned data?
- Can the agent use it from cloud environments?
- Can a pull request modify the configuration to add a more powerful server?

MCP is not just context. It is capability.
