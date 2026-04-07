---
title: Writing a Custom MCP Wrapper
description: When the off-the-shelf MCPs don't give the agent the exact probe you want, wrap your own. It's fewer lines of code than you think.
modified: 2026-04-07
date: 2026-04-06
---

Playwright MCP is generic by design. It exposes Playwright's API as tools, and the agent has to figure out which combination of primitives to call to do what you want. Most of the time this is fine—the agent is pretty good at composing primitives.

Sometimes it isn't fine. Sometimes you want the agent to have a single tool called "verify the shelf page renders correctly" that does six things under the hood and returns a structured result. You don't want the agent to have to figure out how to compose those six things from first principles every time, because it will get it slightly wrong one time in five and you'll be stuck debugging an MCP call.

The answer is to wrap your own MCP. It is not hard. It is honestly almost embarrassingly easy with the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), and the payoff—a custom verification tool shaped exactly for your codebase—is huge.

For a quick refresher on what the [Model Context Protocol](https://modelcontextprotocol.io/) is and how it works, see the spec. For this lesson, just know that an MCP server is a subprocess that exposes tools to the agent.

## What we're building

A small MCP server with a single tool called `verify_shelf_page`. When called, it:

1. Launches Playwright against `http://localhost:5173/shelf/<username>` (with storage state). The `<username>` is passed as an argument so the agent can probe any user's shelf.
2. Waits for the shelf heading to be visible.
3. Counts the books rendered.
4. Checks the console for errors.
5. Returns a structured JSON blob: `{ ok: boolean, bookCount: number, consoleErrors: string[] }`.

The agent can now call `verify_shelf_page` and get a one-shot, structured answer to "is this page in good shape?" No composition, no guessing, no "did you remember to check the console?" It's all in the tool.

## The skeleton

Here's the whole server, minus error handling for brevity. It's around fifty lines.

It uses the [Playwright API](https://playwright.dev/docs/api/class-browsertype) to launch browsers and drive pages. Everything from `chromium.launch()` onward is standard Playwright.

```ts
// tools/shelf-verification-server/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { chromium } from 'playwright';
import path from 'node:path';

const server = new Server(
  { name: 'shelf-verification', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'verify_shelf_page',
      description:
        'Open the Shelf app and verify the /shelf page renders correctly. Returns book count and any console errors.',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Username to view the shelf for' },
        },
        required: ['username'],
      },
    },
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name !== 'verify_shelf_page') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { username } = request.params.arguments as { username: string };

  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: path.resolve('playwright/.authentication/user.json'),
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(`http://localhost:5173/shelf/${username}`);
  await page.getByRole('heading', { name: new RegExp(`${username}'s Shelf`, 'i') }).waitFor();

  const bookCount = await page.getByRole('article').count();

  await browser.close();

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          ok: consoleErrors.length === 0 && bookCount > 0,
          bookCount,
          consoleErrors,
        }),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

That's the whole server. The three pieces are:

- **The tool list.** Tell the agent what tools exist and what their inputs look like. This maps directly onto what the agent sees in its tool palette.
- **The tool implementation.** When the agent calls the tool, you run whatever code you want, using whatever libraries you want, and return structured output.
- **The transport.** Stdio transport means the server talks to the agent over standard input and output. The agent runs the server as a subprocess. It's simpler than HTTP and it's the right default for local tools.

## Wiring it up to Claude Code

Claude Code's MCP config lives in `.claude/mcp.json` (for this project) or `~/.claude/mcp.json` (for your user). Add an entry:

```json
{
  "mcpServers": {
    "shelf-verification": {
      "command": "node",
      "args": ["./tools/shelf-verification-server/server.js"],
      "env": {}
    }
  }
}
```

(You'll need to compile the TypeScript to JavaScript, or use `tsx` as the command.)

Restart Claude Code. The new `verify_shelf_page` tool should appear in the tool list. Ask the agent to "verify the shelf page for alice" and it should pick the right tool automatically.

For Cursor, the equivalent config is in `~/.cursor/mcp.json` with the same shape. For Codex, it's in the `~/.codex/config.toml`. The concepts are identical; only the config path changes.

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

## CLAUDE.md rules

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
- [Lab: Wrap a Custom Verification MCP](lab-wrap-a-custom-verification-mcp.md)
