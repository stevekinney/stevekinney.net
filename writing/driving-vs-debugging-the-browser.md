---
title: 'Playwright vs. Chrome DevTools MCP: Driving vs. Debugging'
description: >-
  Playwright and Chrome DevTools both ship official tools for letting AI agents
  drive a browser, but they're optimized for different jobs. Here's how
  Playwright CLI, Playwright MCP, and Chrome DevTools MCP actually fit together,
  and how to pick between them without guessing.
date: 2026-04-06
modified: 2026-04-07
tags:
  - ai
  - agents
  - playwright
  - chrome-devtools
  - mcp
  - tooling
---

Both [Playwright](https://playwright.dev/) and the [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) ship official tools for letting AI agents drive a browser. They are not the same tools and they are not pointed at the same job. If you're picking one because the headlines look interchangeable, you're going to pick the wrong one for at least half your workflows.

I've burned an embarrassing number of afternoons wiring these into real coding agents on real codebases, and I have opinions about which one earns its slot in your context window. So, let me share them.

## Playwright and Chrome are solving adjacent problems

The honest framing: Playwright is in the business of **driving** a browser, and Chrome DevTools MCP is in the business of **debugging** one. When Microsoft's team builds tools for agents, they tend to optimize for "make the page do the thing." When Google's team builds tools for agents, they tend to optimize for "tell me everything that's wrong with this page right now."

Both teams have crossed into each other's lanes a little. Playwright's official MCP server can do limited inspection. Chrome DevTools MCP can do limited driving—it uses [Puppeteer](https://pptr.dev/) under the hood for input automation. But, the center of gravity is still very clearly different. If you forget that, you'll choose the wrong tool for any task that _isn't_ squarely in the overlap.

> [!NOTE]
> Throughout this post, "Playwright CLI" refers to `@playwright/cli`—Playwright's purpose-built command-line tool for coding agents—_not_ `npx playwright test`, which is the regular test runner. They're related, but they are not the same product. More on that in a moment.

## The official tools that actually matter

The first-party things to actually care about: Microsoft's [`@playwright/cli`](https://playwright.dev/docs/getting-started-cli), a CLI for coding agents distinct from the test runner; Microsoft's [`@playwright/mcp`](https://playwright.dev/docs/getting-started-mcp), the official MCP server; Google's `chrome-devtools-mcp`, [maintained by the ChromeDevTools org on GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp); [Chrome DevTools AI assistance](https://developer.chrome.com/docs/devtools/ai-assistance), Gemini in the DevTools panel—an official Chrome capability, but _not_ a browser-driving CLI; and [Playwright Test Agents](https://playwright.dev/docs/test-agents)—planner, generator, healer—scoped specifically to the test lifecycle.

People confuse a few of these with first-class citizens, so they're worth flagging. [Puppeteer](https://pptr.dev/) is genuinely a Google project, and Chrome DevTools MCP uses it internally, but Puppeteer itself is a JavaScript library, not an agent-facing tool. [WebDriver BiDi](https://w3c.github.io/webdriver-bidi/) is a protocol, not a product. [Browserbase](https://www.browserbase.com/), [Stagehand](https://github.com/browserbase/stagehand), [Skyvern](https://github.com/Skyvern-AI/skyvern), [Browser Use](https://github.com/browser-use/browser-use), [agent-browser](https://github.com/vercel-labs/agent-browser), and the various "browser-using agent" frameworks from large labs are all built _on top of_ Playwright, Puppeteer, or CDP—they're not what we're talking about here. They're the next layer up, and they live or die based on whether the underlying first-party tool is good.

## What Playwright CLI is for

Playwright now ships an actual standalone CLI built for coding agents: `@playwright/cli`, invoked as `playwright-cli`. This is not the same thing as `npx playwright test`. It is a separate npm package that the Playwright team explicitly markets as the [_token-efficient_](https://playwright.dev/docs/getting-started-cli) path for agent-driven browser control.

The pitch is short: instead of loading a giant MCP tool schema and pushing accessibility-tree blobs through your context window on every action, your agent runs concise CLI commands and reads concise CLI output. The Playwright team backs this up in their own docs, where they note that for many coding-agent workflows the CLI is preferable specifically because CLI invocations avoid loading large tool schemas and verbose accessibility trees into the model context.

How it works in practice: you install it (`npm install -g @playwright/cli@latest`), optionally install **skills** with `playwright-cli install --skills`, and then your agent has access to a fairly sprawling set of subcommands. There's `open`, `goto`, `click`, `type`, `fill`, `select`, `check`, `hover`, `drag`, `upload`, plus screenshot/snapshot/PDF, navigation, tab management, network and storage routing, console, eval, tracing, and video recording—somewhere north of 40 commands across categories. (I haven't personally counted them. The docs say so, I trust the docs.) Targeting still uses Playwright's element refs—the same accessibility-tree-derived handles as Playwright MCP—so the underlying mental model is consistent across both.

The really useful bit, in my experience, isn't the action commands. It's the introspection commands. [Playwright 1.59 added](https://playwright.dev/docs/release-notes) `npx playwright test --debug=cli`, which pauses a test mid-run, prints a session ID, and lets a coding agent attach to it with `playwright-cli attach <session-id>`. Once attached, every subsequent CLI call with `-s=<session-id>` targets the paused browser—so the agent gets `snapshot`, `eval`, `click`, `console`, `network`, and the whole command surface pointed at the live paused test. It's not Node `inspect` and it's not CDP; it's Playwright's own pause-and-attach mechanism layered on top of `browser.bind()`, exposed as terminal commands instead of a GUI.

The same release added `npx playwright trace`, a trace reader that exposes four subcommands: `actions` (list every action in the trace), `action` (drill into a single action), `snapshot` (fetch the DOM state at any point), and `close`. It's one-shot invocations, not an interactive REPL—the agent issues a subcommand, pipes the output back into context, and decides what to ask next. That's the loop that actually pays off: when your coding agent can read a trace the same way you would, "fix the flaky test" stops being a coin flip. Paired with 1.59's new [live trace mode](https://playwright.dev/docs/release-notes)—traces written to an unarchived file that updates in real time rather than being zipped at the end—it also works on in-flight tests, not just postmortems.

And there's a nicety I only learned by using it: `playwright-cli show` opens a **dashboard** that lists every bound browser and its status. `playwright-cli` automatically binds every browser it launches, so if you've got multiple agents or multiple sessions in flight, the dashboard is how you see what your agents are actually doing in real time. Set `PLAYWRIGHT_DASHBOARD=1` and you also get every `@playwright/test` browser in the same view.

What Playwright CLI is _not_: it is not a DevTools replacement. You will not get a flame chart and a [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview) audit out of it. It is not a debugger for _your application code_—it's a debugger for the browser-side test code your agent is producing.

## What Playwright MCP is for

Playwright MCP is the same [Playwright underneath, exposed as an MCP server](https://playwright.dev/docs/getting-started-mcp) instead of as a CLI. It's the path you want when your agent is operating inside an MCP-aware host—[Claude Code](https://www.claude.com/product/claude-code), [Cursor](https://cursor.com), Claude Desktop, VS Code, [Windsurf](https://windsurf.com), and effectively every other MCP client—and you'd rather give it tool calls than shell commands.

The interaction model is the part that matters: Playwright MCP operates on the page's _accessibility tree_, not on screenshots. When your agent asks to click a button, what it gets back is structured data about elements, their roles, names, and refs. That gives you two things at once: deterministic targeting (the same `ref` resolves to the same element across calls) and a sensible fallback for non-vision models that can't reason about pixels at all.

It's also genuinely cross-browser. The `--browser` flag accepts `chrome`, `firefox`, `webkit`, and `msedge`. This is not a footnote. If you're building anything that has to work in Safari, this is one of the very few official, agent-facing ways to actually exercise WebKit from a model.

The tool surface is broad: navigation, click/type/fill, screenshots, keyboard and mouse primitives, dialog handling, tab management, network inspection, and a `browser_run_code` tool that lets the agent drop into raw Playwright JavaScript when the structured tools aren't enough. That escape hatch matters more than it sounds—it's the difference between an agent that can drive 90% of your app and one that hits a paywall the first time something needs `page.evaluate()`.

Worth knowing: a lot of the good stuff is gated behind **opt-in capability groups**, controlled by `--caps=<groups>`. The [auto-generated tool list in the README](https://github.com/microsoft/playwright-mcp#tools) breaks them out explicitly. A handful of them are load-bearing and easy to miss:

- **`--caps=network`** turns on `browser_route`, `browser_route_list`, and `browser_unroute`—first-class URL-pattern mocking that lets an agent stub responses with a status code, body, content type, and header overrides without dropping into `browser_run_code`. It also enables `browser_network_state_set` for offline/online toggling, which is how you test connectivity scenarios without touching your OS network stack.
- **`--caps=storage`** exposes the full save/restore dance: `browser_storage_state` and `browser_set_storage_state` write and read a full [storage-state file](https://playwright.dev/docs/auth) (cookies plus localStorage), and the granular `browser_cookie_*`, `browser_localstorage_*`, and `browser_sessionstorage_*` families let the agent get/set individual entries. This is how you pull off the "log in once, reuse the storage state" pattern Playwright Test is famous for, but from an agent loop.
- **`--caps=devtools`** adds `browser_start_tracing` / `browser_stop_tracing` and `browser_start_video` / `browser_stop_video` (with a `browser_video_chapter` tool that drops a full-screen chapter card into the video, which is adorable and occasionally useful for human review). It also enables `browser_resume` with `step` and `location` parameters—pause-and-step debugging of Playwright scripts over the MCP, not just the test runner.
- **`--caps=testing`** exposes Playwright's test-assertion primitives as tools (`browser_verify_element_visible`, `browser_verify_text_visible`, `browser_verify_list_visible`, `browser_verify_value`) plus `browser_generate_locator` for producing a reusable locator expression for any element the agent has snapshotted.
- **`--caps=vision`** flips the interaction model entirely and exposes pixel-based mouse tools (`browser_mouse_click_xy`, `browser_mouse_drag_xy`, etc.) for agents that reason over screenshots instead of the accessibility tree. The default disposition—per the README's "Key features" section—is "fast and lightweight, uses Playwright's accessibility tree, not pixel-based input." Vision is a deliberate fallback for vision-model agents, not the default.

One thing I want to flag because I had to dig to confirm it: **there is no first-class HAR recording or replay tool in `@playwright/mcp`.** Playwright Test famously ships with [`routeFromHAR`](https://playwright.dev/docs/mock#mocking-with-har-files) for replaying captured network traffic, and it's a genuinely useful pattern for isolating tests from flaky APIs—but the MCP server doesn't expose it as a tool. If you want HAR-based mocking from an agent, you either set `recordHar` in the MCP config's `browser.contextOptions` (a startup-time decision, not an agent-callable tool) or you shell out to `browser_run_code` and call `page.routeFromHAR()` yourself. That's a real gap compared to what Playwright Test gives you, and it's the kind of thing that'll bite if your plan for "isolate this test from production" assumed the MCP had a `browser_record_har` tool. It does not.

Tracing is similarly half-there. `browser_start_tracing` and `browser_stop_tracing` (both under `--caps=devtools`) record the trace to your configured output directory, but the MCP does not expose a trace-viewer or trace-analyzer tool. To actually _read_ a trace the agent has to shell out to [`npx playwright trace`](https://playwright.dev/docs/release-notes) (the CLI reader from 1.59) or open the trace in a browser. That split—"MCP records, CLI explores"—is deliberate, but worth naming up front so nobody wires up a trace-recording loop and then wonders where the analysis tool is.

[Playwright 1.59 also added](https://playwright.dev/docs/release-notes) something I've come to lean on: `browser.bind()`, an API that lets the `@playwright/mcp` server connect to an already-running browser. This is the closest Playwright gets to the "manual debugging plus agent handoff" workflow that Chrome DevTools MCP is built around—and we'll come back to this in the overlap section.

When MCP is the right choice over the CLI: when your agent is already inside an MCP host and switching to a CLI loop would mean reinventing the host's tool-orchestration plumbing; when you want self-healing flows where the agent retries based on structured snapshot diffs; or when you want exploratory automation where the agent doesn't know in advance which commands it'll need.

> [!TIP] Wiring it up
> Register the server in your MCP host's config as `npx @playwright/mcp@latest`. Claude Code users can skip the config file entirely with `claude mcp add playwright -- npx @playwright/mcp@latest`. Full setup for every host lives in the [Playwright MCP getting-started guide](https://playwright.dev/docs/getting-started-mcp).

## What Chrome DevTools MCP is for

Chrome DevTools MCP is a different animal. It's Google's official MCP server, [maintained by the ChromeDevTools org on GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp), and it [shipped to public preview in September 2025](https://developer.chrome.com/blog/chrome-devtools-mcp). It's been shipping fast ever since: [slim mode arrived in v0.18.0](https://github.com/ChromeDevTools/chrome-devtools-mcp/releases/tag/chrome-devtools-mcp-v0.18.0), [integrated Lighthouse audits landed in v0.19.0](https://github.com/ChromeDevTools/chrome-devtools-mcp/releases/tag/chrome-devtools-mcp-v0.19.0) alongside Chrome 146, and the package is at [v0.21.0](https://github.com/ChromeDevTools/chrome-devtools-mcp/releases) as I'm writing this.

The way the Chrome team frames it is the right way to read the product: instead of just scripting browser actions, this lets agents [_"see what the code they generate actually does when it runs."_](https://developer.chrome.com/blog/chrome-devtools-mcp) The fundamental shift is that the agent gets DevTools-grade introspection—not just "here's an accessibility snapshot" but "here's a performance trace with LCP/INP/CLS insights, here's a network waterfall with request and response bodies, here's a console message, here's a Lighthouse audit, here's a V8 heap snapshot."

The current tool surface is around 29 tools across six categories. (That count keeps creeping up version-over-version. Read this in six months and it'll be 30-something.) Here's the breakdown:

- **Input automation** (9 tools): `click`, `drag`, `fill`, `fill_form`, `handle_dialog`, `hover`, `press_key`, `type_text`, `upload_file`
- **Navigation** (6 tools): `close_page`, `list_pages`, `navigate_page`, `new_page`, `select_page`, `wait_for`
- **Emulation** (2 tools): `emulate`, `resize_page`
- **Performance** (4 tools): `performance_analyze_insight`, `performance_start_trace`, `performance_stop_trace`, `take_memory_snapshot`
- **Network** (2 tools): `get_network_request`, `list_network_requests`
- **Debugging** (6 tools): `evaluate_script`, `get_console_message`, `lighthouse_audit`, `list_console_messages`, `take_screenshot`, `take_snapshot`

### Lighthouse, specifically

This is the thing people keep asking about, so let's be precise. The [`lighthouse_audit` tool reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md) is very clear about what it covers: **accessibility, SEO, and best practices—and it explicitly excludes performance.** Performance audits are the domain of `performance_start_trace` and the insights engine instead. The Chrome team is routing you to the right tool on purpose: [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview) is still the canonical answer for a11y and SEO scoring, but the trace-based performance work happens in its own, far more detailed pipeline.

The parameters are minimal: `device` (`"desktop"` or `"mobile"`), `mode` (`"navigation"` reloads and audits from scratch, `"snapshot"` analyzes the current state without navigating), and an optional `outputDirPath` that writes the full Lighthouse report to disk—which is critical, because Lighthouse JSON is enormous and you absolutely do not want the whole thing inlined into your model context on every call. Throttling and locale aren't exposed on `lighthouse_audit` itself; throttling lives on the global `emulate` tool alongside CPU slowdown and network conditions, which you can set before the audit runs.

If you've ever wired a coding agent to a separate Lighthouse process and tried to round-trip the JSON yourself, you know how big a deal "Lighthouse as a tool call" is. You also get a bundled [`a11y-debugging` skill](https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/main/skills) (added in v0.18.0) that encodes the accessibility-specific workflow, so agents don't have to rediscover "run lighthouse, look at the a11y section, drill into the failures" from scratch.

### Performance tracing is the other half

The tools that matter here are `performance_start_trace`, `performance_stop_trace`, and `performance_analyze_insight`. Per the tool reference, the trace tools are explicitly advertised as capturing [Core Web Vitals](https://web.dev/articles/vitals): **LCP, INP, and CLS.** Your agent records a trace, stops it, and gets back a list of named "insights" with IDs—things like `DocumentLatency` or `LCPBreakdown`. Those are the same insight identifiers the DevTools Performance panel uses, because it's the same engine underneath.

`performance_analyze_insight` is the drill-down. You pass it an `insightName` and an `insightSetId` from the trace results, and it returns structured analysis of that one insight. So the loop is: record → enumerate insights → drill into the ones that look bad → get actionable output. The bundled [`debug-optimize-lcp` skill](https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/main/skills) is the Chrome team's reference workflow for exactly this pattern. There's no Playwright equivalent at anywhere near the same fidelity—Playwright gives you a trace viewer for _test execution_, not a web-perf insights engine on the running page.

### Memory, network, console, and emulation

The rest of the debugging surface is less flashy but worth naming because it's where Playwright genuinely cannot follow.

`take_memory_snapshot` captures a standard V8 `.heapsnapshot`—the same format Chrome's Memory panel produces—and writes it to the path you specify. The v0.21.0 release added a [`memory-leak-debugging` skill](https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/main/skills) that actually does something useful with the dump; otherwise your agent is parsing heap graphs itself, which is a real commitment.

Network inspection has two tools. `list_network_requests` preserves requests across **the last 3 navigations** (opt-in via `includePreservedRequests`), paginates with `pageIdx`/`pageSize`, and filters by `resourceTypes`. `get_network_request` will either return the body inline or spill request/response bodies to `requestFilePath` / `responseFilePath` on disk—another deliberate token-economics move. An agent can pull a 2 MB JSON response body without blowing its context window.

Console debugging is the same shape: `list_console_messages` and `get_console_message`, with the same preservation window and a `types` filter. (I'm going to stop claiming anything about source maps here, because the [tool reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md) doesn't document them. You get the message payloads as DevTools sees them.)

The single `emulate` tool is a workhorse: CPU throttling (`cpuThrottlingRate`), network throttling (`"Offline"`, `"Slow 3G"`, `"Fast 3G"`, `"Slow 4G"`, `"Fast 4G"`), viewport with DPR and mobile/touch/landscape flags, user agent override, geolocation, and color scheme. That's a meaningful chunk of DevTools' emulation panel exposed as a single tool call, and it's the difference between "run Lighthouse on a fast desktop connection" and "run Lighthouse on a throttled mid-tier Android phone in a cold market."

There's also a pair of less-obvious capabilities worth knowing about. `new_page` accepts an `isolatedContext` parameter that partitions cookies and storage—critical if you're running multiple agent flows against the same server instance and don't want logged-in sessions cross-contaminating. And `select_page` paired with `list_pages` is what makes [parallel multi-agent workflows](https://github.com/ChromeDevTools/chrome-devtools-mcp/releases/tag/chrome-devtools-mcp-v0.19.0) work: each agent picks its own `pageId` and operates against it without stepping on other agents' selected-page state. That's niche, but if you're building a coordinator over a pool of browser-using agents, it's the difference between "works" and "every agent fights over the same tab."

Slim mode is the other piece worth dwelling on. [Per the slim-tool reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/slim-tool-reference.md), `--slim` drops you to a three-tool variant—navigation, script execution, and screenshots—for token-sensitive contexts. (The fact that _both_ Microsoft and Google have built explicit token-efficiency escape hatches into their first-party tools tells you something about where the real failure mode of MCP lives. Tool schemas are heavy. Agents pay for them on every turn. Slim modes are how the platforms admit it without saying it.)

The other piece that matters: connection model. Chrome DevTools MCP can launch a fresh Chrome, connect to a running Chrome via `--browser-url` (HTTP endpoint) or `--ws-endpoint` (WebSocket), and [as of December 2025 it can request a remote debugging connection to the user's _current_ browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session) via the `--autoConnect` flag (Chrome 144 or newer, with remote debugging enabled at `chrome://inspect/#remote-debugging`). That last part is the workflow people came for. You're already signed in to staging in your normal Chrome window, you've got a network request selected in DevTools, and you can hand the whole thing—session, selection, and all—over to the agent without re-creating the state somewhere else. The Chrome team's framing is exactly right: _"you don't have to choose between automation and manual control. You can use DevTools yourself or hand over a debugging task to your coding agent."_

> [!TIP] Wiring it up
> Register the server as `npx chrome-devtools-mcp@latest` in your MCP host's config (or `claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest` from the Claude Code CLI). Add `--slim` for the three-tool token-lean variant, or `--autoConnect` to attach to your live Chrome session. Setup details for every major host live in the [project README](https://github.com/ChromeDevTools/chrome-devtools-mcp#getting-started).

What Chrome DevTools MCP is _not_: it is not cross-browser. The README is explicit—_"chrome-devtools-mcp officially supports Google Chrome and [Chrome for Testing](https://developer.chrome.com/blog/chrome-for-testing) only. Other Chromium-based browsers may work, but this is not guaranteed, and you may encounter unexpected behavior."_ No Firefox. No WebKit. If "make sure this works in Safari" is on your list, this tool cannot get you there.

## Where Chrome DevTools AI assistance fits

Chrome DevTools AI assistance is the easy one to mis-shelve, so let's be precise: it is [Gemini, integrated directly into the Chrome DevTools UI](https://developer.chrome.com/docs/devtools/ai-assistance), for human developers using DevTools by hand. It lives in the Elements, Network, Sources, and Performance panels, and you invoke it by clicking an icon when you want a styling explanation, a request diagnosis, or a performance investigation written in English.

It is _not_ a coding-agent protocol. It does not expose tool calls that other models can drive. It is not interchangeable with Chrome DevTools MCP, even though both are Google-built and both involve LLMs poking at Chrome. If you find yourself trying to plug Chrome DevTools AI assistance into your agent loop, stop—you want Chrome DevTools MCP. If you find yourself trying to use Chrome DevTools MCP from inside a DevTools panel as a human, stop—you want AI assistance.

The reason I'm spending a whole section on this is that the names invite confusion. I've watched smart engineers conflate them on the way to a planning meeting. They are adjacent, and they share a parent team, but they live in different categories of product.

## The real comparison

Here's the comparison I actually use when I'm choosing between these tools: the first table covers the three first-class citizens. AI assistance gets its own table after, because mixing it in produces fake symmetry.

|                         | **Playwright CLI**                                         | **Playwright MCP**                                                                       | **Chrome DevTools MCP**                                                                  |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Primary job**         | Token-efficient browser driving from a shell loop          | Browser driving via MCP tool calls                                                       | DevTools-grade inspection plus driving                                                   |
| **Control surface**     | CLI subcommands plus installable skills                    | MCP tool schema                                                                          | MCP tool schema (29 tools; slim mode = 3)                                                |
| **Best for**            | Coding agents fixing flaky tests; long shell-driven loops  | MCP-native agents in Cursor, Claude Code, [Copilot](https://github.com/features/copilot) | Performance, network, console, and DevTools-style debugging from agents                  |
| **Browser coverage**    | Chromium, Firefox, WebKit, Edge (via Playwright)           | Chromium, Firefox, WebKit, Edge                                                          | Google Chrome and Chrome for Testing only                                                |
| **Debugging depth**     | Trace exploration via `npx playwright trace`; CLI debugger | Snapshot, network inspection, storage state, `browser_run_code` escape hatch             | Full DevTools—traces with LCP/INP/CLS insights, Lighthouse (a11y/SEO), V8 heap snapshots |
| **Performance tooling** | Light (traces only)                                        | Light (traces only)                                                                      | First-class—insights engine plus Lighthouse (scope-limited to a11y/SEO/best practices)   |
| **Network mocking**     | `route` / `route-list` / `unroute`                         | First-class via `--caps=network` (`browser_route` and friends); no HAR tool              | None (inspection only)                                                                   |
| **Emulation**           | Via Playwright context options                             | Via Playwright context options                                                           | First-class `emulate` tool—CPU, network, viewport, userAgent, geolocation, colorScheme   |
| **Test workflow**       | Excellent—built around Playwright's test runner            | Good—code execution escape hatch via `browser_run_code`                                  | Limited—not a test runner                                                                |
| **CI fit**              | Strong—it's a CLI, it's already CI-shaped                  | Workable but heavier—needs an MCP host                                                   | Workable, but Chrome-only and DevTools-shaped                                            |
| **Manual handoff**      | Indirect—via traces and screencasts                        | Possible—via `browser.bind()` to a running browser                                       | Native—connects to your current Chrome session                                           |
| **Agent friendliness**  | High for coding agents that prefer shell loops             | High for MCP-native agents                                                               | High for inspection-heavy agents                                                         |
| **Determinism**         | High—accessibility refs, deterministic targeting           | High—accessibility refs, deterministic targeting                                         | High for input; real-browser perf traces will vary                                       |
| **Biggest limitation**  | No deep DevTools inspection                                | Tool schema cost; no DevTools-grade perf                                                 | Chrome only; not a cross-browser test tool                                               |

And the adjacent comparison, kept separate so it doesn't pretend to be in the same category:

|                                       | **Chrome DevTools AI assistance**                                                |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| **Primary job**                       | Helping a _human_ in the DevTools UI                                             |
| **Control surface**                   | A panel inside Chrome DevTools                                                   |
| **Best for**                          | Live, manual debugging with an LLM at your elbow                                 |
| **Agent-facing?**                     | No                                                                               |
| **Why it's adjacent, not comparable** | It is not a tool an external coding agent can call. It is a feature inside a UI. |

## When Playwright wins

Pick Playwright (CLI or MCP) when the job is _driving_ the browser and the agent's ground truth is "did this user flow work end to end?"

Concretely: my coding agent needs to fix a flaky test. The flake is in `auth.spec.ts`, the test runs in CI against three browsers, and the failure happens once every 40 runs. I want the agent to read the test, run it under `npx playwright test --debug=cli` so it can attach with `playwright-cli`, explore the trace via `npx playwright trace`, find the race, and ship a fix that keeps the test green for 200 consecutive runs across all three browsers. Chrome DevTools MCP cannot do that job, because it cannot drive WebKit and it does not own the test runner.

Another one: my agent needs to click through a 15-step onboarding flow repeatedly, in headless mode, on three browsers, with deterministic accessibility-tree targeting. That's Playwright MCP, full stop. The cross-browser story is real and there's no equivalent on the Chrome side.

A third: I'm generating new tests from scratch. I'd reach for [Playwright Test Agents](https://playwright.dev/docs/test-agents)—`npx playwright init-agents --loop=claude` (or `--loop=vscode` / `--loop=opencode` depending on your host) gives me planner, generator, and healer subagents whose entire purpose is exploring an app and producing maintained tests. That is a _test lifecycle_ tool, scoped tightly, and it's almost embarrassingly good at what it does compared to "ask Claude to write Playwright tests."

## When Chrome DevTools wins

Pick Chrome DevTools MCP when the job is _understanding_ what the browser is doing, and the agent's ground truth is "what is actually wrong with this page right now?"

Concrete case: my agent needs to inspect why LCP is bad on a real page. I want it to record a performance trace via `performance_start_trace`, stop it, enumerate the insight set, call `performance_analyze_insight` on `LCPBreakdown`, identify the LCP element, look at the network waterfall to see why the hero image is late, and write a fix. (Note that Lighthouse is _not_ the tool here—`lighthouse_audit` explicitly excludes performance. The trace insights engine is the path.) Playwright cannot do any of that at the same fidelity. The DevTools team has spent years building those insights into the panel, and Chrome DevTools MCP exposes them as tool calls.

Another: I'm investigating something gated behind sign-in in a real app. I'm already logged in to staging in my normal Chrome window. I select a misbehaving network request in the DevTools Network panel, and then I want my coding agent to take it from there—diagnose the request, trace it back to the code, propose a patch. That handoff workflow is the thing Chrome DevTools MCP was built for, and the [December 2025 connection-to-current-browser feature](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session) is what made it actually usable. Playwright's `browser.bind()` can connect to a running browser too, but it doesn't share DevTools selection state, and it doesn't get you a trace-grade view of the network.

A third: my agent needs to profile a page for memory leaks. I want it to take a V8 heap snapshot, compare it against a baseline after a suspect user flow, and identify retained objects. Chrome DevTools MCP exposes `take_memory_snapshot` plus a [`memory-leak-debugging` skill](https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/main/skills) that tells the agent how to actually _use_ the `.heapsnapshot` format. Playwright has no equivalent—you'd be writing heap-graph parsers yourself from inside `browser_run_code`.

## Where the overlap is real

There's a real shared area, and being honest about it matters more than picking a side.

Honestly, both servers can navigate, click, type, take screenshots, evaluate script, and read network requests. Both can be connected to a running browser instance—Chrome DevTools MCP via `--browser-url` / `--ws-endpoint` and the new "current session" feature, Playwright MCP via `browser.bind()`. Both run on Chromium just fine. Both can be invoked from Claude Code, Cursor, VS Code, and other MCP hosts.

If your agent only needs to do basic driving on Chromium and _also_ wants some inspection—say, "click through this form, take a screenshot, list any console errors"—you can get that from either server. The difference is which side of the workflow degrades when you push harder. Push Playwright MCP toward DevTools-grade performance work, and you'll feel the gap. Push Chrome DevTools MCP toward cross-browser test execution, and you'll hit the wall immediately. Build for the _direction you're going to push_, not the overlap. (For what it's worth, the agents I run day-to-day reach for Playwright MCP first and only switch to Chrome DevTools MCP when they need a real performance trace or a Lighthouse audit. Your mileage will vary based on what you're actually shipping.)

If your agent is tight on context, the right move inside the overlap is the leaner variant of whichever side you've already bought into—the CLI on the Playwright side, slim mode on the Chrome DevTools side.

## What is not actually a first-class citizen

A few things that look like they belong in this conversation, but don't:

**Community MCP servers wrapping Playwright or the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) (CDP).** There are dozens. Some are genuinely good. (None are first-party.) The day Microsoft or Google ships a feature, those wrappers either get adopted into the official path or they don't, and you're back to the choice you started with. If you're building infrastructure you intend to keep, build on the official servers.

**Cloud browser platforms** like [Browserbase](https://www.browserbase.com/), [Anchor Browser](https://anchorbrowser.io/), [BrightData](https://brightdata.com/)'s scraping browser, and similar. These are excellent at what they do—managed, scaled, fingerprint-aware browser sessions for agents—but they are _consumers_ of Playwright and CDP, not alternatives to them. They live one layer up.

**Agent frameworks and "browser-using agents"** from large labs and startups: [Stagehand](https://github.com/browserbase/stagehand), [Skyvern](https://github.com/Skyvern-AI/skyvern), [Browser Use](https://github.com/browser-use/browser-use), [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser), and the various OS-level computer-use models. Same story. These are higher-level abstractions sitting on top of Playwright or CDP. They're meaningful products in their own right, but they're not what we're comparing here, because they don't change the answer to "which underlying first-party tool should you trust?"

**Puppeteer.** [Puppeteer](https://pptr.dev/) is a real Google project, and it is genuinely the engine inside Chrome DevTools MCP. But Puppeteer is a JavaScript library, not an agent-facing tool. Telling an agent "use Puppeteer" is telling it "go write some code." Telling it "use Chrome DevTools MCP" is giving it a tool surface. Different category.

## The recommendation

Here's what I actually do:

Install both. Seriously. (Yes, I know there is a token cost for every MCP you have _enabled_. Notice—that's not the same as _installed_. I will usually have both installed and then both disabled until I need them.) They are not zero-sum. The total context cost of having Playwright MCP and Chrome DevTools MCP both registered against the same coding agent, in slim or lean configurations, is much smaller than the cost of being wrong about which one you needed for a given task—see my parenthetical above. Most coding agents will pick reasonably between them if you describe the job clearly.

For the _driving_ side, default to `@playwright/cli` if your agent is comfortable in a shell loop and you're doing test-shaped work. Shell loops are token-efficient, the CLI has the best story for trace exploration via `npx playwright trace`, and you get cross-browser testing as a side effect. Switch to `@playwright/mcp` when your agent is already inside an MCP host and wiring a CLI loop would mean reinventing the host's tool plumbing. Either way, you're on the same Playwright underneath, with the same accessibility-tree mental model.

It's worth saying that Microsoft itself has been nudging coding agents in this direction. The Playwright MCP README is unusually frank about the trade-off: _"Modern coding agents increasingly favor CLI–based workflows exposed as skills over MCP because CLI invocations are more token-efficient… MCP remains relevant for specialized agentic loops that benefit from persistent state, rich introspection, and iterative reasoning over page structure, such as exploratory automation, self-healing tests, or long-running autonomous workflows where maintaining continuous browser context outweighs token cost concerns."_ That's the right framing, from the team that ships both: **CLI for the common case, MCP when you specifically need stateful iteration.** Google isn't quite that blunt about it, but the existence of a separate experimental `chrome-devtools` CLI (shipped in [v0.20.0](https://github.com/ChromeDevTools/chrome-devtools-mcp/releases) as a more token-efficient alternative to the MCP server, with its own bundled [`chrome-devtools-cli` skill](https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/main/skills)) tells you the same story is playing out on the Chrome side.

For the _debugging and performance_ side, Chrome DevTools MCP is the only first-party answer that exists. There is no Playwright equivalent for `lighthouse_audit`, `performance_analyze_insight`, V8 heap snapshots, DevTools-grade emulation, or "hand off my current Chrome session to the agent"—and the Chrome team has been shipping into these gaps fast enough that the gap is widening, not closing.

For _test generation specifically_, use Playwright Test Agents. Don't have your general-purpose coding agent hand-roll Playwright tests. The planner / generator / healer split is genuinely better than what a single model will produce on its own, and it's right there.

For _human debugging with an LLM at your elbow_, use Chrome DevTools AI assistance. It's the right tool for the job—for the job of helping _you_, sitting at your laptop, work faster. It is not the right tool for an agent loop, and treating it as one will waste your afternoon.

The framing I started with—"Playwright on one side, Chrome DevTools on the other"—is mostly accurate, and it'll keep being accurate for a while. But, the more useful framing is the one I opened with: _driving_ versus _debugging_. That's the axis. Pick on it, not on the headlines, and the overlap stops feeling like a tie.

## Key takeaways

- **Playwright drives. Chrome DevTools debugs.** Pick on the verb, not the brand.
- **If WebKit or Firefox matters at all, you're on Playwright.** Chrome DevTools MCP is Chrome-only and isn't going to fix that.
- **For test generation specifically, use Playwright Test Agents.** Don't have your general-purpose coding agent hand-roll Playwright tests.
- **Install both first-party servers in their lean modes and let the agent pick.** It's cheaper than being wrong.
