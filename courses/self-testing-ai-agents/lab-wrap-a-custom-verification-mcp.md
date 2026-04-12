---
title: 'Lab: Wrap a Custom Verification MCP'
description: Write a small MCP server that exposes a single verification tool for Shelf and wire it into the repository-local MCP configuration.
modified: 2026-04-12
date: 2026-04-06
---

Shelf ships the `verify_shelf_page` tool from the previous lesson. By the end of this walkthrough, you'll understand every decision inside it and be able to build an equivalent tool for a different verification target in your own project.

> [!NOTE] Prerequisite
> Complete [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md) first. This lab assumes you've seen the MCP server shape and know what `McpServer` / `registerTool` / `StdioServerTransport` are for.

> [!NOTE] In the starter
> The whole server ships at `tools/shelf-verification-server/server.ts` (98 lines), registered through the root `.mcp.json`, with `@modelcontextprotocol/sdk`, `zod`, and `playwright` already in `package.json`. This lab is a walkthrough — you're not installing anything or filling in a skeleton. You're opening the shipped file and understanding why each decision was made.

## 1. The registration — `.mcp.json`

Open `.mcp.json` at the repository root. Find the `shelf-verification` entry:

```json
{
  "shelf-verification": {
    "type": "stdio",
    "command": "npx",
    "args": ["tsx", "./tools/shelf-verification-server/server.ts"],
    "env": { "SHELF_BASE_URL": "http://127.0.0.1:4173" }
  }
}
```

Notice it runs under `tsx` (TypeScript directly, no build step) and passes the base URL via environment, not as a command-line argument. That matters because the same server file can point at a local preview, a staging URL, or a live dev server without a code change.

**Question:** why `stdio` instead of HTTP? (Answer: MCP's stdio transport keeps the server scoped to one client and one conversation. No port management, no authentication, no exposed network surface. The MCP host spawns the server as a subprocess and talks to it over pipes — ideal for repo-local tools like this one.)

## 2. The server file — `tools/shelf-verification-server/server.ts`

Open `tools/shelf-verification-server/server.ts`. It's 98 lines. Walk the four sections:

### Lines 13–26: imports, constants, server instance

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from 'playwright';
import { z } from 'zod';

const STORAGE_STATE_PATH = path.resolve('playwright/.authentication/user.json');
const baseUrl = process.env.SHELF_BASE_URL ?? 'http://127.0.0.1:4173';

const server = new McpServer({ name: 'shelf-verification', version: '0.1.0' });
```

Two things to notice. First, `STORAGE_STATE_PATH` points at the same file Playwright's storage-state setup writes — so the MCP tool shares an authenticated browser session with the rest of the test suite. Second, the server name (`shelf-verification`) matches the `.mcp.json` key. That's not enforced by the SDK, but keeping them aligned is the difference between a readable debugger and an indecipherable one.

### Lines 35–49: the tool contract

```ts
server.registerTool(
  'verify_shelf_page',
  {
    description:
      'Open the Shelf app and verify the public /shelf/[username] route renders correctly. ...',
    inputSchema: {
      username: z.string().min(1).describe('The reader handle, e.g. "alice" for alice@example.com'),
    },
    outputSchema: {
      ok: z.boolean(),
      bookCount: z.number().int().nonnegative(),
      consoleErrors: z.array(z.string()),
      url: z.string(),
    },
  } /* handler below */,
);
```

This is the whole contract: one input (`username`), four outputs (`ok`, `bookCount`, `consoleErrors`, `url`). The `.describe()` on the input is load-bearing — the agent reads it and uses it to decide what to pass. Without the description, a model could guess `username` means the full email address and the tool would fail to find the reader.

**Question:** why return `url` as part of the output when the agent theoretically knows what URL it asked about? (Answer: the agent only knows the `username` it passed. The server is the one that constructs the real URL — base URL plus path plus encoding. Putting `url` in the structured output means the agent can quote the exact URL in its summary to the user, which is much more useful than "I called verify_shelf_page with username alice.")

### Lines 50–95: the handler

```ts
async ({ username }) => {
  const targetUrl = `${baseUrl}/shelf/${encodeURIComponent(username)}`;
  const browser = await chromium.launch();
  try {
    // Reuse the authenticated storage state when it exists — even though
    // the /shelf/[username] page is public, the Playwright session stays
    // consistent with the rest of the workshop tooling.
    const contextOptions = fs.existsSync(STORAGE_STATE_PATH)
      ? { storageState: STORAGE_STATE_PATH }
      : {};
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(targetUrl);
    await page.getByRole('heading', { level: 1 }).waitFor();

    const bookCount = await page.getByRole('article').count();
    const result = {
      ok: consoleErrors.length === 0 && bookCount >= 0,
      bookCount,
      consoleErrors,
      url: targetUrl,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  } finally {
    await browser.close();
  }
};
```

The `finally` block is the most important line in the file. Without it, any throw above — a navigation timeout, a network error, a broken locator — leaks a Chromium process. The server stays up, the agent keeps calling the tool, and each failed call eats another 200 MB of RAM. `finally` is not optional.

The `ok` predicate is deliberately loose (`bookCount >= 0`) because the public `/shelf/[username]` route is a real page even for an empty shelf — "no books yet" is a valid render. If your domain says otherwise, tighten to `bookCount > 0`.

The return shape uses both `content` (for MCP hosts that read the text channel) and `structuredContent` (for hosts that honor the structured output schema). Returning both means the tool works against either kind of host without branching.

### Lines 97–98: the transport

```ts
const transport = new StdioServerTransport();
await server.connect(transport);
```

Wire the server to stdio. `server.connect()` is the call that starts listening for JSON-RPC messages on the process's stdin and replying on stdout. Nothing else.

**Question:** why isn't this wrapped in a `try/catch` or a shutdown handler? (Answer: when the MCP host kills the subprocess, stdin closes and the transport unwinds cleanly on its own. Adding a `SIGTERM` handler to "close gracefully" is the kind of defensive code that sounds responsible but leaks complexity. If the subprocess dies hard, the host spawns a new one.)

## 3. Using it

Ask the agent to verify the shelf for alice. Example prompt:

> Run `verify_shelf_page` for username "alice" and report the result. If `ok` is false, diagnose why.

The agent calls the tool, gets back the structured output, and acts on it.

![The public shelf route targeted by `verify_shelf_page`](./assets/lab-custom-mcp-public-shelf.png)

## Acceptance criteria

You can't copy-paste your way through this one — the code is already there. You're done when you can answer each of these without looking:

- [ ] Why does `.mcp.json` use `stdio` instead of HTTP transport?
- [ ] Why does `STORAGE_STATE_PATH` point at the same file Playwright uses?
- [ ] Why is the `describe()` on the `username` input load-bearing?
- [ ] Why does the output include `url` when the agent already passed the username?
- [ ] What happens if you remove the `finally` block and a `page.goto` throws?
- [ ] Why is the `ok` predicate `bookCount >= 0` instead of `bookCount > 0`?
- [ ] Why does the return shape include both `content` and `structuredContent`?
- [ ] Why is there no explicit shutdown handler on the transport?

Plus one mechanical check:

- [ ] Restart your MCP host. Ask the agent to run `verify_shelf_page` for username `alice`. The result should include `ok: true`, a non-negative `bookCount`, an empty `consoleErrors` array, and the constructed `url`. Now add `console.error('oops')` to `src/routes/shelf/[username]/+page.svelte`, rerun the tool, and confirm `ok` flips to `false` and `consoleErrors` contains your string.

## Stretch goals

- Add a second tool, `check_accessibility`, that runs [axe-core](https://github.com/dequelabs/axe-core) against a URL and returns the violations as structured JSON. The [axe-playwright-npm](https://github.com/abhinaba-ghosh/axe-playwright) package makes this a ~15-line implementation.
- Add a third tool, `database_snapshot`, that calls the Shelf API to read the current state of the test database (books, shelves, users) and returns it as JSON. Useful for the agent to "look at" state without reading raw SQL.
- Make your server log all tool calls to a file at `./mcp-log.txt` so you can tail the log while the agent works. Log to stderr, not stdout (stdout is the MCP protocol channel).
- Test your server standalone with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) before wiring it into the agent.

## What you should be left with

A working custom MCP, registered with Claude Code, that the agent can call to verify Shelf's primary page. A rule in `CLAUDE.md` that tells the agent to prefer it. A small but measurable reduction in the agent's need to compose Playwright primitives from scratch.

This is the tightest verification loop we're going to build today. The agent makes a change, calls `verify_shelf_page`, reads the result, and iterates. No human in the loop, no shell commands, no guessing. That's the whole bet made real.

## Additional Reading

- [Solution](wrap-a-custom-verification-mcp-solution.md)
- [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md)
- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md)
