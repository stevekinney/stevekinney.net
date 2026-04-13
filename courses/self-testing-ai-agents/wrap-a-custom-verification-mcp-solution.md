---
title: 'Wrap a Custom Verification MCP: Solution'
description: Walkthrough of the MCP verification server you add in the lab and the steps to prove it works end-to-end.
modified: 2026-04-10
date: 2026-04-10
---

The whole premise of this lab is: what if your agent could _look at the running app_ instead of just reading test output? Not in a hand-wavy "AI vision" sense, but concretely -- launch a browser, navigate to a page, count the elements, collect errors, return structured JSON. The current Shelf starter does not ship this helper, so this solution is the code you add during the lab.

## What to add

Install the missing packages first:

```sh
npm install -D @modelcontextprotocol/sdk zod
```

### `tools/shelf-verification-server/server.ts`

This is a self-contained MCP server. It registers one tool, `verify_shelf_page`, that takes a username and returns a structured report about the state of that user's shelf page.

The server setup is minimal:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from 'playwright';
import { z } from 'zod';

const server = new McpServer({
  name: 'shelf-verification',
  version: '0.1.0',
});
```

`McpServer` from the SDK handles the JSON-RPC framing. `StdioServerTransport` means the server communicates over stdin/stdout -- the agent process spawns it as a child and pipes messages back and forth. No HTTP, no ports, no CORS headaches.

The tool registration is where the real work happens:

```ts
server.registerTool(
  'verify_shelf_page',
  {
    description:
      'Open the Shelf app and verify the public /shelf/[username] route renders correctly.',
    inputSchema: {
      username: z.string().min(1).describe('The reader handle, e.g. "alice" for alice@example.com'),
    },
    outputSchema: {
      ok: z.boolean(),
      bookCount: z.number().int().nonnegative(),
      consoleErrors: z.array(z.string()),
      url: z.string(),
    },
  },
  async ({ username }) => {
    // ...
  },
);
```

Both `inputSchema` and `outputSchema` use Zod. The SDK serializes them to JSON Schema for the agent's tool listing, so the agent knows exactly what it's getting back before it calls the tool. This is the structured contract that makes MCP tools composable -- the agent doesn't have to parse prose from a tool description to understand the response shape.

Inside the handler, the tool launches Chromium, navigates, and collects data:

```ts
const browser = await chromium.launch();
try {
  const contextOptions = fs.existsSync(STORAGE_STATE_PATH)
    ? { storageState: STORAGE_STATE_PATH }
    : {};
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await page.goto(targetUrl);
  await page.getByRole('heading', { level: 1 }).waitFor();

  const bookCount = await page.getByRole('article').count();

  const result: VerifyShelfPageResult = {
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
```

A few things worth noting:

- **Storage state reuse.** If the Playwright authentication state file exists (from a previous test run), the tool reuses it. The `/shelf/[username]` route is public, so this isn't strictly necessary -- but it keeps the tool's session consistent with the rest of the workshop tooling.
- **Console error collection.** The `page.on('console')` listener captures every `console.error` call from the running app. This is the "did something blow up that the page didn't visually show?" check. The tool reports `ok: false` when there are console errors, even if the page rendered correctly.
- **`finally` closes the browser.** This is the zombie-process prevention. If the navigation throws, if the page times out, if the count fails -- the browser still gets closed. Without this, you'd leak Chromium processes on every error.
- **Structured return.** The MCP SDK supports both `content` (for agents that read text) and `structuredContent` (for agents that parse JSON). Returning both means the tool works with any MCP client.

### `.mcp.json`

```json
{
  "mcpServers": {
    "svelte": {
      "type": "stdio",
      "command": "npx",
      "env": {},
      "args": ["-y", "@sveltejs/mcp"]
    },
    "shelf-verification": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "./tools/shelf-verification-server/server.ts"],
      "env": {
        "SHELF_BASE_URL": "http://127.0.0.1:4173"
      }
    }
  }
}
```

The `.mcp.json` file lives at the repo root and tells Claude Code (or any MCP-aware agent) how to start the server. The `type: "stdio"` entry means the agent spawns `npx tsx ./tools/shelf-verification-server/server.ts` as a child process and communicates over pipes. `SHELF_BASE_URL` points at the preview server -- the same one Playwright targets.

The `svelte` entry was already there. The `shelf-verification` entry is what this lab adds.

## What you still need to run

### Start the preview server

The verification tool needs a running app to hit. Build and preview:

```sh
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
```

Leave this running in a separate terminal.

### Verify the server starts

In another terminal, confirm the MCP server boots without crashing:

```sh
npx tsx ./tools/shelf-verification-server/server.ts
```

You should see it hang waiting for stdin (that's correct -- it's waiting for JSON-RPC messages from an MCP client). Kill it with Ctrl+C.

### Test it through the agent

Restart Claude Code in the Shelf repo directory. After restart, you should see `shelf-verification` listed in the available MCP servers. The `verify_shelf_page` tool should appear in the agent's tool list.

Ask the agent:

> Verify the shelf page for the user "alice".

The agent should call `verify_shelf_page` with `username: "alice"` and return something like:

```json
{
  "ok": true,
  "bookCount": 5,
  "consoleErrors": [],
  "url": "http://127.0.0.1:4173/shelf/alice"
}
```

### Test the failure path

To confirm the tool catches errors, add a deliberate `console.error` to one of the Shelf routes. For example, in `src/routes/shelf/[username]/+page.svelte`, add:

```svelte
<script>
  console.error('Deliberate error for MCP verification test');
</script>
```

Rebuild, restart preview, and ask the agent to verify again. This time the result should show `ok: false` with the error message in `consoleErrors`.

Remove the deliberate error when you're done.

### Check for zombie processes

After running the tool a few times, confirm no Chromium processes are hanging around:

```sh
ps aux | grep -i chromium | grep -v grep
```

The `finally` block in the handler should prevent leaks, but it's worth confirming. If you see orphaned processes, something in the error path isn't cleaning up.

## Patterns to take away

- **Structured in, structured out.** The Zod schemas on both input and output mean the agent never has to guess at the response format. This is what separates an MCP tool from "run a script and parse the stdout."
- **Stdio is the simplest transport.** No server to configure, no ports to manage, no authentication to wire up. The agent spawns the process, sends JSON-RPC over pipes, and gets JSON-RPC back. For local dev tools, this is almost always the right choice.
- **Browser automation inside a tool is powerful.** The tool doesn't screenshot and OCR. It navigates with Playwright, counts DOM elements by role, and collects console errors. The agent gets precise, structured data about the actual running app.
- **`finally` is load-bearing.** Browser cleanup in a `finally` block isn't defensive programming -- it's the difference between a tool that works once and a tool that works reliably. Leaked Chromium processes will eat your machine's memory and eventually cause mysterious failures.
- **One tool, one question.** `verify_shelf_page` answers "does this user's shelf page render correctly?" It doesn't also check performance, or run accessibility audits, or validate the API layer. Keeping tools narrow makes them composable.

## Additional Reading

- [Lab: Wrap a Custom Verification MCP](lab-wrap-a-custom-verification-mcp.md)
- [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md)
