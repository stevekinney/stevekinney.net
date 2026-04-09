---
title: 'Lab: Wrap a Custom Verification MCP'
description: Write a small MCP server that exposes a single verification tool for Shelf and wire it into the repository-local MCP configuration.
modified: 2026-04-09
date: 2026-04-06
---

You're going to build the `verify_shelf_page` tool from the previous lesson. By the end, the agent will be able to call a single tool and get back a structured report on the state of `/shelf`.

> [!NOTE] Prerequisite
> Complete [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md) first. This lab assumes you're starting from that lesson's server shape and only filling in the repo-specific details.

## Setup

From the Shelf repository root:

```sh
mkdir -p tools/shelf-verification-server
npm install @modelcontextprotocol/sdk zod
npm install -D tsx
```

Create `tools/shelf-verification-server/server.ts` with the skeleton from the lesson. We're using the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) to build the server. In the local Shelf repository, the server uses the newer high-level `McpServer` API instead of the older low-level `Server` request-handler example.

> [!NOTE]
> **Third dry run validation**: The current Shelf starter keeps this server in `tools/shelf-verification-server/server.ts` and registers it through the repository-local `.mcp.json`. The tool reads storage state from `playwright/.authentication/user.json` and defaults to `http://127.0.0.1:4173` unless `SHELF_BASE_URL` is set.

## The task

Implement `verify_shelf_page` so it:

1. Accepts a `username` parameter.
2. Launches Chromium with the storage state from `playwright/.authentication/user.json`.
3. Navigates to `http://127.0.0.1:4173/shelf/<username>` by default. Make the base URL overrideable with `SHELF_BASE_URL` so you can also point it at a live dev server.
4. Waits for the page-level shelf heading to be visible.
5. Counts the number of `article` elements (each book is an article).
6. Collects any console errors emitted during the page load.
7. Closes the browser.
8. Returns `{ ok: boolean, bookCount: number, consoleErrors: string[] }` as the tool result.

`ok` is `true` when there are zero console errors and at least one book. Adjust the definition if your Shelf has an explicit empty state for "no books yet."

## Wiring into your MCP client

In the validated Shelf workshop repo, MCP config lives in `.mcp.json` at the root. Add an entry there:

```json
{
  "mcpServers": {
    "shelf-verification": {
      "type": "stdio",
      "command": "npx",
      "env": {
        "SHELF_BASE_URL": "http://127.0.0.1:4173"
      },
      "args": ["tsx", "./tools/shelf-verification-server/server.ts"]
    }
  }
}
```

Restart your MCP host. In the tool list, you should now see `verify_shelf_page` available.

Ask the agent to verify the shelf for alice. Example prompt:

> Run `verify_shelf_page` for username "alice" and report the result. If `ok` is false, diagnose why.

The agent should call the tool, get back structured output, and act on it.

![The public shelf route targeted by `verify_shelf_page`](./assets/lab-custom-mcp-public-shelf.png)

## Acceptance criteria

- [ ] `tools/shelf-verification-server/server.ts` exists and contains a working MCP server.
- [ ] Running `npx tsx tools/shelf-verification-server/server.ts` starts the server without crashing. If your shell does not have `timeout`, use a short Node wrapper that keeps stdin open for two seconds and then sends `SIGTERM`.
- [ ] `.mcp.json` registers the server and the path resolves.
- [ ] After restarting the MCP host, `verify_shelf_page` appears in the agent's available tools.
- [ ] When you call the tool against a running Shelf dev server, it returns a JSON result with `ok`, `bookCount`, and `consoleErrors` keys.
- [ ] The tool correctly reports `ok: true` when the shelf has books and no console errors.
- [ ] The tool correctly reports `ok: false` when you deliberately break something—for example, add `console.error('oops')` to the shelf page and re-run.
- [ ] The tool closes its browser context cleanly; no zombie Chromium processes (`pgrep -f chromium` returns nothing unexpected after the call completes).
- [ ] `CLAUDE.md` has been updated with a rule pointing the agent at `verify_shelf_page` as the preferred way to check `/shelf`.

## Stretch goals

- Add a second tool, `check_accessibility`, that runs [axe-core](https://github.com/dequelabs/axe-core) against a URL and returns the violations as structured JSON. The [axe-playwright-npm](https://github.com/abhinaba-ghosh/axe-playwright) package makes this a ~15-line implementation.
- Add a third tool, `database_snapshot`, that calls the Shelf API to read the current state of the test database (books, shelves, users) and returns it as JSON. Useful for the agent to "look at" state without reading raw SQL.
- Make your server log all tool calls to a file at `./mcp-log.txt` so you can tail the log while the agent works. Log to stderr, not stdout (stdout is the MCP protocol channel).
- Test your server standalone with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) before wiring it into the agent.

## What you should be left with

A working custom MCP, registered with Claude Code, that the agent can call to verify Shelf's primary page. A rule in `CLAUDE.md` that tells the agent to prefer it. A small but measurable reduction in the agent's need to compose Playwright primitives from scratch.

This is the tightest verification loop we're going to build today. The agent makes a change, calls `verify_shelf_page`, reads the result, and iterates. No human in the loop, no shell commands, no guessing. That's the whole bet made real.

## Additional Reading

- [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md)
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md)
