---
title: MCP Apps and the Missing Middle of AI Tooling
description: >-
  MCP servers return data. MCP Apps let them ship a UI alongside that data—so the
  tool author, not the client, decides how results look.
date: 2026-03-10T12:00:00.000Z
modified: 2026-03-10T12:00:00.000Z
published: true
tags:
  - ai
  - mcp
  - tooling
---

If you've built an MCP server, you've run into this wall. Your tool does something useful—queries a database, fetches metrics, searches documents—and it returns structured data. The model sees that data, summarizes it, and relays the summary to the user. The user sees... a paragraph of text. Maybe some JSON if they're lucky. The tool author has zero say in how those results get presented. A monitoring tool can surface CPU usage but can't show a chart. A search tool can return ten results but can't show a filterable table. The client decides what the user sees, and most clients don't try very hard.

## The gap between tool output and user experience

This isn't just a cosmetic problem. Standard MCP servers return text, images, or structured JSON. That works fine for simple queries—fetching a weather forecast, looking up a definition. But it falls apart the moment users need to _explore_ data interactively, configure complex options, approve multi-step workflows, or view rich media. The model becomes a bottleneck: every interaction requires another prompt, another round trip, another summary.

Before MCP Apps, every attempt to solve this produced incompatible, host-specific implementations. Each client invented its own rendering layer, or didn't bother. Tool authors who wanted their output to look decent had to build integrations for each host separately—and even then, they were constrained to whatever rendering primitives that particular client happened to support.

The core tension is architectural. MCP decoupled AI tools from specific models, which was the right move. But it left tool _output_ coupled to the client's rendering decisions. The tool author ships data. What happens after that is someone else's problem.

## What MCP Apps actually are

[MCP Apps][ext-apps] are the first official extension to the Model Context Protocol. The idea is straightforward: an MCP App is an MCP server that also declares UI resources. When a client calls a tool, it gets data for the model _and_ a sandboxed HTML view for the user. The extension identifier is `io.modelcontextprotocol/ui`, and the [spec version][spec] landed on January 26, 2026.

The distinction between an MCP server and an MCP App is additive, not categorical. A server that supports MCP Apps still functions as a normal MCP server for hosts that don't understand the extension—it returns text-only output as a fallback. UI is a progressive enhancement, not a requirement.

Here's what the difference looks like in practice:

|                       | Standard MCP server           | MCP server with Apps                                  |
| --------------------- | ----------------------------- | ----------------------------------------------------- |
| **Output**            | Text, images, structured JSON | Interactive HTML in a sandboxed iframe                |
| **User interaction**  | User prompts the model again  | Direct manipulation—clicks, forms, drag-and-drop      |
| **State**             | Stateless between tool calls  | Persistent UI state across interactions               |
| **Real-time updates** | Requires re-running tools     | Live updates via persistent `postMessage` channel     |
| **Tool visibility**   | All tools visible to model    | Tools can be app-only for UI controls like pagination |

The mechanism is a `_meta.ui.resourceUri` field on the tool definition. When the host sees this field, it knows the tool has an interactive UI available:

```json
{
  "name": "visualize_sales",
  "description": "Interactive sales dashboard",
  "_meta": {
    "ui": { "resourceUri": "ui://sales/dashboard" }
  }
}
```

Hosts can prefetch the UI template before the tool is even called, so by the time the model invokes the tool, the view is ready to render.

## How the rendering works

The architecture introduces a third entity beyond the standard server-host pair. In regular MCP, the server exposes tools to the host (the chat client). With MCP Apps, a **View**—the UI running inside a sandboxed iframe—acts as an MCP client that communicates with the host, which proxies requests to the server.

<!-- TODO: Add communication chain diagram showing: Server <-> MCP Protocol (stdio/SSE) <-> Host (Chat Client) <-> JSON-RPC over postMessage <-> View (Sandboxed iframe). The two transport layers should be visually distinct. -->

When the host renders a View, it initializes the iframe and passes host context—theme (light or dark), locale, timezone, display mode, container dimensions. The View then receives the tool's input arguments and results, rendering them however the tool author designed. From there, the View can call server tools, send messages into the conversation, update the model's context, and request that the host open external links. All of this happens over JSON-RPC through `postMessage`, so the host can audit every message.

Views render in three **display modes**: **inline** (embedded in the chat flow, good for charts and forms), **fullscreen** (for editors, dashboards, or anything that needs room), and **picture-in-picture** (a persistent overlay for things like music players or timers). Hosts provide CSS custom properties for visual cohesion, so apps automatically adapt to dark mode and host-specific styling without extra work from the tool author.

> [!NOTE] Sandboxing
> MCP Apps run in sandboxed iframes with no access to the host DOM, cookies,
> or storage. Communication is auditable JSON-RPC through `postMessage`. If
> the server doesn't declare external network domains via CSP metadata, no
> outbound connections are allowed.

## What you could actually build with this

The examples that click fastest are the ones where the current tool-output-as-text model is most obviously inadequate.

**Data dashboards:** A database tool that returns query results _and_ a chart. The model gets the raw data for its context window. The user gets an interactive visualization they can filter and explore without prompting again. The [ext-apps repository][ext-apps] ships a cohort heatmap example that does exactly this.

**Multi-step workflows:** A deployment tool that walks the user through a wizard—selecting environments, reviewing config diffs, confirming rollbacks—instead of dumping a wall of YAML and hoping the user knows what to do with it. The UI handles the interaction loop; the model handles the reasoning.

**Real-time monitoring:** A system monitor that streams live CPU, memory, and disk metrics instead of returning a snapshot that's stale by the time the user reads it. The official system monitor example combines a model-visible tool with an app-only polling tool—the polling doesn't clutter the model's context because it's scoped with `visibility: ["app"]`.

**Rich media:** PDF viewers, 3D scenes, shader renderers, video players—all inline in the conversation. The Three.js example in the SDK lets the model generate and preview 3D scenes interactively. None of this was possible when tool output was limited to text and static images.

That `visibility: ["app"]` detail is worth calling out. Tool authors can declare tools that are only callable by the View, not by the model. This is how you build pagination, refresh, sort controls, and other UI mechanics that would be noise in the model's context window.

## The ecosystem right now

The ecosystem is early but surprisingly broad for an extension that's been public for about six weeks.

The [`@modelcontextprotocol/ext-apps`][ext-apps] SDK is the official TypeScript package. It ships starter templates for React, Vue, Svelte, Preact, Solid, and vanilla JavaScript—so you're not locked into a framework. On the Python side, [FastMCP][fastmcp] added MCP Apps support in v3.0 with both a declarative Prefab UI system (a Python DSL for layouts, charts, and forms that compiles to JSON) and full custom HTML apps.

Client support is wider than I expected. Claude (web and desktop), ChatGPT, VS Code Insiders, Goose, Postman, and Cursor all support MCP Apps today. JetBrains and Google DeepMind have publicly expressed interest.

The spec itself is governed by the [Agentic AI Foundation][agentic-ai] under the Linux Foundation—not by a single company. MCP was donated there in December 2025, which means MCP Apps is an open standard with independent governance. That matters if you're going to build on it.

> [!TIP]
> The [official SDK and examples][ext-apps] cover everything from Three.js
> scenes to real-time system monitors. It's the best place to start if you
> want to build one.

MCP decoupled AI tools from specific models. MCP Apps decouple tool _output_ from specific clients' rendering decisions. That's the same architectural move, applied one layer up. Whether it catches on depends on whether tool authors actually adopt it—but the fact that it degrades gracefully to plain MCP output means there's very little cost to trying. You ship a UI alongside your data, and if the client supports it, the user gets a better experience. If the client doesn't, nothing breaks. That's a reasonable bet.

[ext-apps]: https://github.com/modelcontextprotocol/ext-apps
[spec]: https://apps.extensions.modelcontextprotocol.io/api/documents/Overview.html
[fastmcp]: https://github.com/jlowin/fastmcp
[agentic-ai]: https://agenticaiproject.org
