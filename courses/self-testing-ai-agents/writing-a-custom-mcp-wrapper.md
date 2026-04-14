---
title: Writing a Custom MCP Wrapper
description: When the off-the-shelf MCPs don't give the agent the exact probe you want, wrap your own. It's fewer lines of code than you think.
modified: 2026-04-14
date: 2026-04-06
---

Playwright MCP is generic by design. It exposes Playwright's API as tools, and the agent has to figure out which combination of primitives to call to do what you want. Most of the time this is fine—the agent is pretty good at composing primitives.

Sometimes it isn't fine. Sometimes you want the agent to have a single tool called "verify the shelf page renders correctly" that does six things under the hood and returns a structured result. You don't want the agent to have to figure out how to compose those six things from first principles every time, because it will get it slightly wrong one time in five and you'll be stuck debugging an MCP call.

The answer is to wrap your own MCP. It is not hard. It is honestly almost embarrassingly easy with the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), and the payoff—a custom verification tool shaped exactly for your codebase—is huge.

For a quick refresher on what the [Model Context Protocol](https://modelcontextprotocol.io/) is and how it works, see the spec. For this lesson, just know that an MCP server is a subprocess that exposes tools to the agent.

## What we're building

A small MCP server with a single tool called `verify_shelf_page`. When called, it:

1. Launches Playwright against `http://127.0.0.1:4173/shelf/<username>` by default. The `<username>` is the lower-cased portion of the reader's email address before the `@`, so alice@example.com becomes `alice`. `SHELF_BASE_URL` can override the host when needed.
2. Waits for the page's level-one shelf heading to be visible.
3. Counts the books rendered as `<article>` elements.
4. Captures any console errors emitted during page load.
5. Returns a structured JSON blob: `{ ok: boolean, bookCount: number, consoleErrors: string[], url: string }`.

The agent can now call `verify_shelf_page` and get a one-shot, structured answer to "is this page in good shape?" No composition, no guessing, no "did you remember to check the console?" It's all in the tool.

Shelf registers the server in a repository-local `.mcp.json` and resolves the target URL from `SHELF_BASE_URL`, defaulting to `http://127.0.0.1:4173`. The `/shelf/[username]` route is public, so the server does not strictly need authentication—but it reuses the existing `playwright/.authentication/user.json` storage state when present so the browser session stays consistent with the rest of the workshop tooling.

In the current starter, that target route is still the real `src/routes/shelf/[username]/+page.svelte`, but the custom verification server itself is something you add later in the course. That is the pattern to copy: real route, repo-local registration in `.mcp.json`, one sharply-shaped probe.

## The skeleton

Here's the whole server, minus error handling for brevity. It's around fifty lines.

It uses the [Playwright API](https://playwright.dev/docs/api/class-browsertype) to launch browsers and drive pages. Everything from `chromium.launch()` onward is standard Playwright.

```ts
// tools/shelf-verification-server/server.ts
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from 'playwright';
import { z } from 'zod';

const STORAGE_STATE_PATH = path.resolve('playwright/.authentication/user.json');
const baseUrl = process.env.SHELF_BASE_URL ?? 'http://127.0.0.1:4173';

const server = new McpServer({ name: 'shelf-verification', version: '0.1.0' });

server.registerTool(
  'verify_shelf_page',
  {
    description:
      'Open the Shelf app and verify the public /shelf/[username] route renders correctly.',
    inputSchema: {
      username: z.string().min(1),
    },
    outputSchema: {
      ok: z.boolean(),
      bookCount: z.number().int().nonnegative(),
      consoleErrors: z.array(z.string()),
      url: z.string(),
    },
  },
  async ({ username }) => {
    const targetUrl = `${baseUrl}/shelf/${encodeURIComponent(username)}`;
    const browser = await chromium.launch();
    try {
      const contextOptions = fs.existsSync(STORAGE_STATE_PATH)
        ? { storageState: STORAGE_STATE_PATH }
        : {};
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();

      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      const response = await page.goto(targetUrl);
      const heading = page.getByRole('heading', { level: 1, name: /shelf/i });
      await heading.waitFor();

      const bookCount = await page.getByRole('article').count();
      const status = response?.status() ?? 0;
      const headingVisible = await heading.isVisible();

      const result = {
        ok: status >= 200 && status < 300 && headingVisible && consoleErrors.length === 0,
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
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

That's the whole server. The three pieces are:

- **The tool list.** Tell the agent what tools exist and what their inputs look like. This maps directly onto what the agent sees in its tool palette.
- **The tool implementation.** When the agent calls the tool, you run whatever code you want, using whatever libraries you want, and return structured output.
- **The transport.** Stdio transport means the server talks to the agent over standard input and output. The agent runs the server as a subprocess. It's simpler than HTTP and it's the right default for local tools.

> [!TIP]
> Notice what's missing from the example: `waitUntil: 'networkidle'`. The server waits on the shelf heading because that is the actual success signal for this probe. The same waiting rules from the Playwright lesson apply inside your custom MCPs.

## Wiring it up to your local MCP host

In the local Shelf repository for this course, MCP config lives in `.mcp.json` at the repository root. Add an entry:

```json
{
  "mcpServers": {
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

Restart your MCP host. The new `verify_shelf_page` tool should appear in the tool list. Ask the agent to "verify the shelf page for alice" and it should pick the right tool automatically.

If your editor or agent host uses a different config path, the concept is the same even if the file moves. The only thing that changes is where the subprocess registration lives.

## Why this beats "compose it yourself"

Here's the thing about having a custom verification tool. It's not that the agent _couldn't_ open Playwright, navigate, count books, and read the console by composing primitive MCP tools. It could. The issue is that every time it does, it makes small decisions—which selector to use for the heading, whether to wait for the articles, how long to wait, whether to normalize the console text before comparing. Each of those decisions is a chance to get the answer subtly wrong.

A custom tool encodes the _right_ answer once, in code, where you can test it. The agent stops making those decisions and starts consuming a known-good result. And because the result is structured (`bookCount: number`), the agent can reason about it with the same reliability it has for any JSON it gets from an API. No hallucination about what "successfully verified" means—the tool returned `{ ok: true }` or it didn't.

I think of custom MCP tools as the opposite of prompting. Prompting says, "dear LLM, please do this thing correctly." A custom tool says, "I already wrote this thing correctly. Here it is as a function."

## What to wrap and what to leave alone

Not everything needs a custom wrapper. Here's my heuristic.

**Wrap it if:** the check is specific to your codebase, it's run more than a few times a day, and you've had the agent get it wrong at least once. These are the things where the agent's marginal error rate times your annoyance rate is high enough that a custom tool pays back quickly.

**Don't wrap it if:** the off-the-shelf MCP tools do it well, the check is generic ("click a button, read the result"), and you're only going to run it a few times. Wrapping takes an hour. A generic one-off task doesn't earn that hour.

Examples I've wrapped:

- `verify_shelf_page` (this lesson)
- `check_accessibility`—runs axe-core against a URL and returns violations as JSON, so the agent can act on them without parsing HTML reports
- `database_snapshot`—dumps the current state of the test database as JSON, so the agent can reason about state between API calls

Examples I haven't wrapped:

- "Click this button and read the response." Playwright MCP handles this fine.
- "Take a screenshot." Already a primitive.
- "Run the tests." The shell tool is the right tool; there's no wrapping to do.

## Debugging custom MCPs

Custom MCPs are subprocesses that talk over stdio. When they break, they break silently and the agent just says "tool call failed." A few things to know:

- Log to stderr. Anything you write to stdout will be interpreted as an MCP message and will crash the protocol. Use `console.error(...)` for logging.
- Write logs to a file. `fs.appendFileSync('./mcp-log.txt', ...)` is a useful debug crutch. Tail the file in another terminal while you develop.
- Test the server standalone with the MCP inspector tool before wiring it into an agent. Takes thirty seconds, saves hours.

## The agent rules

Add to the file:

```markdown
## Custom MCP tools

When verifying UI changes, prefer custom tools over composing primitives.
Specifically:

- Use `verify_shelf_page` instead of hand-rolling a Playwright probe of
  `/shelf`. It checks book count and console errors in one call.
- Use `check_accessibility` to run axe-core against a URL and get
  structured violations back.
- If you find yourself composing the same three primitive tool calls
  more than twice in a conversation, flag it—it's probably worth a
  new custom tool.
```

The last rule is my favorite. It pushes the cost of wrapping back onto the agent's working loop—if it notices the pattern, it can ask for a new tool, and you can write one during the next break.

## The one thing to remember

Off-the-shelf MCPs are generic. Custom MCPs encode your specific verification logic once, in code, and give the agent a reliable, structured answer. Every hour you spend writing one saves the agent an hour of composing primitives badly. Wrap the checks that matter most to you.

## Additional Reading

- [Runtime Probes in the Development Loop](runtime-probes-in-the-development-loop.md)
- [Structured CLI Output as Pipeline Glue](structured-cli-output-as-pipeline-glue.md)
- [Lab: Wrap a Custom Verification MCP](lab-wrap-a-custom-verification-mcp.md)
