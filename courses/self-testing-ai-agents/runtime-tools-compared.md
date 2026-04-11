---
title: 'Runtime Tools Compared: Playwright MCP, Chrome DevTools MCP, and Claude in Chrome'
description: Three ways to let an agent drive a browser, what each one is actually good at, and when to reach for which.
modified: 2026-04-11
date: 2026-04-06
---

We spent the morning making the scripted test suite something an agent can rely on. That's the slow, durable, repeatable loop. This lesson is about the fast, interactive loop: letting the agent _drive_ a browser in real time during development, poke at the page, read the console, and figure out what's going on.

There are three tools in this space that you should know about, and they are different enough that choosing between them matters.

- [**Playwright MCP**](https://playwright.dev/)—exposes Playwright's browser automation as MCP tools
- [**Chrome DevTools MCP**](https://github.com/ChromeDevTools/chrome-devtools-mcp)—exposes Chrome DevTools Protocol as MCP tools
- [**Claude in Chrome**](https://www.anthropic.com/news/claude-for-chrome)—an actual browser extension that puts the agent inside your live browser session

> [!NOTE]
> As of April 9, 2026, Playwright also ships a dedicated CLI for coding-agent workflows in addition to Playwright MCP. This workshop still uses MCP as the primary runtime tool because the later lessons depend on MCP-style tool calls, accessibility snapshots, and custom MCP wrappers. Also note that current Playwright MCP defaults to a persistent browser profile; use `--isolated` or an explicit storage state when you want clean-room reproduction.

They all let the agent interact with a browser. They are not interchangeable. This lesson is a field guide to which one to reach for.

## The short version

If you want a table to glance at:

| Tool                | Runs                                                           | Best at                                                                 | Worst at                                              |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Playwright MCP      | A Playwright-controlled browser session, persistent by default | Repeatable probes, scripted exploration, "can you reproduce this bug"   | Interactive work against your real logged-in accounts |
| Chrome DevTools MCP | A Chrome instance you point it at                              | Reading the console, inspecting network, performance profiling          | Writing tests, driving workflows                      |
| Claude in Chrome    | Inside your live Chrome session                                | Real user accounts, complex state, "the thing I'm looking at right now" | Clean-room repro, deterministic scripting             |

That's the whole lesson compressed. The rest is why.

## Playwright MCP: the scripted browser for agents

Playwright MCP wraps Playwright's automation API as MCP tools. The agent says "open this URL, click this button, read this text," and under the hood, Playwright launches and controls a browser for it. In current releases that browser profile is persistent unless you opt into isolation, which is great for ongoing work and the wrong default for reproducible debugging unless you configure it intentionally.

What this gives you:

- **Controllable state.** You can run isolated for clean repro, or persistent when the task benefits from keeping session state around.
- **Full Playwright API.** Locators, assertions, waits, network interception, screenshots. Everything we covered in the [Playwright](locators-and-the-accessibility-hierarchy.md) lessons is available to the agent directly.
- **Reproducibility.** The agent's actions are effectively Playwright calls. If something works, you can often translate it directly into a scripted test.

What this does _not_ give you:

- **Your real accounts.** The agent is not logged into Gmail as you. It's logged into nothing, unless you set up [storage state](storage-state-authentication.md) the way we did earlier.
- **Your real environment.** Extensions, devtools tweaks, the experimental feature flags you've enabled—none of those are present.
- **Your real tabs.** The agent can't look at what you have open.

This is the tool I reach for when I want the agent to _reproduce_ something. "Here's a bug report, can you open the app, try to reproduce, and report what you see?" is a perfect Playwright MCP task. The agent opens a browser it controls, clicks through the steps, and tells you what happened. If you need a clean-room repro, run it isolated or with a known storage state. If it can reproduce, you now have a script you can harden into a test. If it can't, you learn something about the bug report.

I also reach for it when I want the agent to _explore_ a UI I'm building. "Open localhost:5173, navigate to /shelf, tell me what happens if you click Add Book without being logged in." The agent pokes around, reports back, and you get a quick sanity check without switching context yourself.

## Chrome DevTools MCP: the diagnostic layer

Chrome DevTools MCP is different. Instead of spinning up a fresh browser, it connects to a running Chrome instance over the Chrome DevTools Protocol (CDP) and exposes the protocol's capabilities as MCP tools. The headline capabilities are the ones you'd expect from the DevTools panel:

- Read the console.
- Read network requests and responses, including timing.
- Take performance traces.
- Inspect the DOM.
- Evaluate JavaScript in the page context.

Notice what's not in that list: "drive a scripted test suite." Chrome DevTools MCP isn't really about navigation and clicks, even though it can do those. It's about _diagnosing_ what's happening in a page, the same way you'd open DevTools as a human developer.

This is the tool I reach for when the question is "why is this slow?" or "what's in the console?" or "which request is failing?" The agent can pull the network tab, find the failing request, show you the response body, and tell you whether the 500 is in the request or the response. For performance issues, it can take a profile, parse the trace, and tell you where the time went.

It is not what I'd use for "please click through the checkout flow." That's what Playwright MCP is for.

A good mental model: Chrome DevTools MCP is for the agent to _observe_. Playwright MCP is for the agent to _act_.

## Claude in Chrome: the agent in your browser

Claude in Chrome is the most different of the three. It's a browser extension that injects the agent into your actual Chrome session. The agent sees what you see, uses the tabs you have open, and—if you grant it—can click around inside apps you're already logged into.

This is the one I reach for when the task depends on state that only exists in my real browser. "Please find all the Linear tickets assigned to me this week that mention 'flaky test' and summarize them." That task needs me to be logged into Linear, which means it needs my actual session, which means Playwright MCP is the wrong tool because it starts from zero. Claude in Chrome is right here.

The tradeoff is that you lose everything that comes from a clean room. The agent might be looking at a stale tab. Your browser extensions might be interfering with the page. The state you're seeing is the state _right now_, which is not reproducible for anybody but you. For the specific class of tasks where that's what you want, it's magical. For testing and verification, it's the wrong shape.

It's also the tool that needs the most user judgment because the agent is interacting with your real accounts on your real services. The rules in your head about "don't let the agent click on this email link" apply in full. Claude in Chrome has a safety model that's thoughtful about this, but the responsibility doesn't disappear—it shifts to you.

## So which one for this workshop

For today, Playwright MCP is the primary runtime tool, because today is about verification and the verification loop needs to be reproducible. When a lesson says "the agent probes the UI at runtime," assume Playwright MCP in an isolated or explicitly-configured state unless I specify otherwise.

Chrome DevTools MCP comes in when we talk about [failure dossiers](failure-dossiers-what-agents-actually-need-from-a-red-build.md)—reading the console and network is exactly what DevTools MCP is for, and a dossier that includes a captured console log is much more valuable than one that doesn't.

Claude in Chrome is an honorable mention. I'll call it out in a couple of places where the task genuinely needs your real session. It's not the default for anything in this workshop, but it's the right tool for a narrow class of "look at the thing I'm already looking at" problems, and knowing it exists is part of being well-equipped.

## The bigger point

All three of these tools exist to give the agent a runtime reality check. Static analysis tells the agent "your code compiles." Tests tell the agent "your code behaves in the ways I thought to check." Runtime tools tell the agent "the code actually runs in a real browser and here's what happened." They're the layer between writing code and shipping code, and until recently they didn't exist for agents at all.

(This entire ecosystem is built on the [Model Context Protocol](https://modelcontextprotocol.io/), which is how agents discover and call tools. If you're curious about the plumbing, go read the spec.)

The thing I want to flag before we move on: **the runtime loop is where agents currently add the most marginal value per minute.** A unit test catches mistakes before runtime. A runtime probe catches mistakes the test didn't think of. And because runtime probes are slower and more expensive than unit tests, the agent is a much better fit for them than a developer—the agent doesn't mind running the probe eight times in an afternoon. You would.

## Additional Reading

- [Runtime Probes in the Development Loop](runtime-probes-in-the-development-loop.md)
- [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md)
