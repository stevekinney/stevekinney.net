---
title: Setting Up and Using the Browser
description: Turn on OpenClaw's browser, learn the start, open, snapshot, and act loop, choose the right profile, and hand real browsing tasks to your agent.
---

Plenty of the web can't be read by fetching a URL. Pages build themselves with JavaScript, hide content behind clicks, and put the useful part behind a form or a login. OpenClaw's **browser** gives your agent an actual browser to drive: it can open pages, read what's on them, click, type, take screenshots, and save PDFs.

This is different from a web search or a plain fetch, and it carries more authority. A browser can submit forms and use whatever sessions it has. The setup in this lesson keeps that authority small.

## How It Works

The agent has a single tool called `browser`, and it covers a handful of actions: checking status, starting and stopping, listing and opening tabs, taking snapshots and screenshots, navigating, and acting on the page.

Two ideas make everything else easier to follow.

**The managed browser is separate from yours.** By default OpenClaw runs its own Chrome with its own data directory, controlled by a small service inside the Gateway that listens only on loopback. It has an orange-tinted interface so you can tell it apart from your own browser, and it never touches your personal browser profile. It starts with no logins, which is the point.

**The agent works from snapshots.** Instead of guessing at pixels, it asks for a **snapshot**: a structured view of the page where each control gets a short reference like `e12`. To click a button, it says "click `e12`." If the page changes and that control disappears, the reference fails, and the fix is to take a new snapshot.

## Choose a Profile

A **profile** decides which browser the agent is talking to, and therefore whose cookies it has. There are three built in.

| Profile    | What it is                                                                                            | Use it when                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `openclaw` | A managed, isolated browser with no logins. The default.                                              | Almost always. Public pages, testing, anything login-free.   |
| `user`     | Attaches to your real, signed-in Chrome. Chrome asks "Allow remote debugging?" the first time.        | You need a signed-in session and you're at the computer.     |
| `chrome`   | Your real, signed-in Chrome through the OpenClaw extension. No prompt, and it works when you're away. | You need a signed-in session and nobody will be at the desk. |

Use `openclaw` unless a task truly can't work without a login. Attaching your real browser hands the agent your cookies, your open tabs, and every account you're signed in to, and a click can send a message or buy something.

You pick a profile on the command line with `--browser-profile <name>`, or the agent picks one with a `profile` argument. If you set nothing, you get `openclaw`.

## Step 1: Make Sure the Browser Is Available

The browser is a bundled plugin, and it's on by default. Check that it's ready:

```sh
openclaw browser doctor
openclaw browser status
```

`doctor` checks readiness. `doctor --deep` goes further and runs a live snapshot check.

If something's missing, there are three switches to check. The browser needs all of them:

1. **The plugin and the setting.** The browser plugin has to be enabled, and `browser.enabled` has to be `true`. If a change doesn't seem to take effect, restart the Gateway.

2. **The plugin allowlist.** If you've restricted plugins with `plugins.allow`, `browser` has to be on that list:

   ```json5
   {
     plugins: {
       allow: ['telegram', 'browser'],
     },
   }
   ```

   Then run `openclaw plugins enable browser`. A restart alone doesn't fix a policy exclusion.

3. **The tool policy.** The agent also has to be allowed to use the tool. If your tool profile doesn't include it, add it:

   ```json5
   {
     tools: {
       profile: 'coding',
       alsoAllow: ['browser'],
     },
   }
   ```

   To allow it for a single agent, use `agents.entries.<id>.tools.alsoAllow` instead. Allowing it for subagents is a separate setting, and it isn't enough on its own.

> [!NOTE] Some deployments turn it off
> The Railway template, for example, ships with browser control disabled and without Chromium in the image. That's a deliberate security choice. If you're on a setup like that, enabling the browser is a decision, not a default.

## Step 2: Start It and Look Around

Try the whole loop yourself, by hand, before you give it to an agent. It's the same set of actions the agent uses:

```sh
openclaw browser start
openclaw browser open https://example.com
openclaw browser tabs
openclaw browser snapshot
```

A managed Chrome window opens, tinted orange. `snapshot` prints the page as a tree, with a reference next to each control. That's what the agent reads.

A few options worth knowing:

```sh
openclaw browser start --headless      # No visible window, for this request
openclaw browser snapshot --urls       # Include link destinations
openclaw browser screenshot            # A picture of the page
openclaw browser screenshot --labels   # The picture, with snapshot references drawn on it
openclaw browser screenshot --full-page
```

The labeled screenshot is the best way to build intuition. It overlays the references from the snapshot on the page itself, so you can see exactly which control is `e12`.

## Step 3: Act on the Page

Now use those references. Take a snapshot, find the control you want, and act on it:

```sh
openclaw browser click e12
openclaw browser type e7 "hello"
openclaw browser press Enter
openclaw browser wait --text "Done"
```

Other actions follow the same pattern: `hover`, `select`, `drag`, `fill`, `scrollintoview`, and so on. Run `openclaw browser --help` for the full list on your build.

Two habits will save you a lot of grief:

- **Prefer references over coordinates.** There's a `click-coords` command, but references survive layout changes in a way that pixel positions don't.
- **Re-snapshot when something fails.** If a click has no effect or a reference stops working, the page probably re-rendered. Take a fresh snapshot and use the new reference. Don't repeat the same call.

When you're finished, shut it down:

```sh
openclaw browser stop
```

## Step 4: Let the Agent Drive

Everything you just did by hand, the agent can do in a chat. You don't write commands. You describe the goal and set the ground rules.

> Using the browser, open https://news.ycombinator.com, read the top ten stories, and give me a one-line summary of each. Use the browser, not web search. Tell me what you did, and stop if you hit a login page.

A good browser prompt does a few things:

- **Names the profile** when it matters. "Using the `openclaw` profile" is a good default to be explicit about.
- **Says to actually use the browser** instead of searching or guessing.
- **Asks for narration,** so you can see the steps it took, and for screenshots of anything interesting.
- **Says when to stop.** A login wall, a payment form, or a CAPTCHA should end the task, not become a puzzle to solve.
- **Separates looking from acting.** "Read" and "summarize" are very different from "submit" and "buy."

For ready-made prompts, including a GitHub Trending digest and a full exploratory QA pass, see [OpenClaw Browser Prompts](openclaw-browser-prompts.md).

> [!NOTE] There's a bundled skill, too
> When the browser plugin is enabled, a `browser-automation` skill comes with it. You don't have to do anything to use it, but it's worth knowing it's there when you check `openclaw skills list`.

## Create Your Own Profiles

The built-in profiles cover most needs, but you can make more. A named profile lets you keep a separate set of cookies for one purpose, or point at a different browser.

```sh
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser profiles
```

A few variations:

```sh
# Attach to a signed-in Chrome through Chrome DevTools
openclaw browser create-profile --name chrome-live --driver existing-session

# Point at a remote browser over CDP
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
```

Delete a profile you no longer need with `openclaw browser delete-profile --name work`.

Creating a profile doesn't make it the default. The agent keeps using `openclaw` unless you name the new profile in the prompt or set `browser.defaultProfile`. Leave the default alone unless you have a reason. If you set it to `user`, **every** browsing task starts in your real signed-in browser.

## Getting a Login Into the Browser

The managed profile starts empty, so a task behind a login hits a wall. You have options, from safest to riskiest:

1. **Skip the login.** Point the task at public pages.
2. **Sign in by hand to a throwaway account** inside the managed browser.
3. **Copy specific cookies in.** On a Mac, `openclaw browser import-profile` copies cookies from a Chrome-family profile into a new managed one, once. Add `--domains` to limit it to the sites you need. This copies cookies only, not passwords. If the Gateway is on another machine, use [cookie sync](syncing-cookies-to-a-remote-gateway.md) instead.
4. **Attach your real browser** with the `user` or `chrome` profiles.

If you try the `user` profile, here's a safe way to test it. Watch for `driver: existing-session`, `transport: chrome-mcp`, and `running: true` in the status:

```sh
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

Chrome shows a prompt the first time, which someone has to approve. That's also why a scheduled job that reaches for `user` will stall at the prompt with no error until you come back to the computer. The `chrome` extension profile is the one that works while you're away. To set it up, start with `openclaw browser extension setup --action inspect`, then `--action install` and `--action verify`, and check `openclaw browser extension --help` for the rest.

## Configuration Worth Knowing

You rarely need to change these, but they're good to know exist. Set them with `openclaw config set`:

| Key                          | Default                 | What it does                                                                        |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `browser.enabled`            | `true`                  | Turns browser control on or off.                                                    |
| `browser.defaultProfile`     | `"openclaw"`            | The profile used when none is named. Set to `"user"` only on purpose.               |
| `browser.headless`           | `false` (docs' example) | Launch local managed browsers without a window.                                     |
| `browser.executablePath`     | auto-detect             | The Chromium-based browser to launch. Set it if auto-detection finds the wrong one. |
| `browser.attachOnly`         | `false` (docs' example) | Never launch a browser. Attach only to one that's already running.                  |
| `browser.evaluateEnabled`    | `true`                  | When `false`, the agent can't run arbitrary JavaScript on a page.                   |
| `browser.ssrfPolicy`         | see below               | Which addresses the browser is allowed to navigate to.                              |
| `browser.tabCleanup.enabled` | `true`                  | Periodically closes idle tabs.                                                      |

For example, to point at a specific Chrome:

```sh
openclaw config set browser.executablePath "/usr/bin/google-chrome"
```

The browser control service listens on loopback (port `18791` by default, derived from the Gateway port), and local managed profiles use ports in the `18800` to `18899` range. You usually don't need to touch these, but it helps to recognize them in logs.

Many `browser.*` settings, including profiles, the default profile, and `browser.enabled` itself, apply without a Gateway restart. Some of them do it by replacing the browser control service, which cancels any pending operations. The Chrome extension relay and a few other settings do need a restart.

## Guardrails

- **Treat page content as untrusted.** Page text and page errors are external content. A web page can contain instructions aimed at your agent, and a browser makes it easy for the agent to act on them.
- **Disable JavaScript evaluation if you don't need it.** `browser.evaluateEnabled: false` removes the one action that runs arbitrary code on a page.
- **Mind the network policy.** The SSRF policy controls where the browser may navigate. Leave private-network access off unless a trusted setup requires it, and when you must open it up, prefer `allowedHostnames` with exact hosts over `dangerouslyAllowPrivateNetwork`.
- **Browser and shell are separate routes.** A browser can reach a page the shell can't, and a shell can send data out without ever using the browser. Review each one on its own.
- **Be careful with downloads.** Files the browser downloads land in OpenClaw's downloads directory (`/tmp/openclaw/downloads` by default). Treat every download as untrusted input.
- **A signed-in profile can do whatever you can.** Use a fixture account where you can, scope the agent's tools for jobs that use one, and confirm the tab and profile before anything destructive. Don't use a skill's wording as the thing that stops a purchase or a message. Remove the capability instead.
- **Keep the Gateway private.** Browser control is loopback-only, and its authentication goes through the Gateway. Don't expose the control service to the internet.

## Try It Out

1. **By hand.** Run `doctor`, `start`, `open https://example.com`, `snapshot`, `screenshot --labels`, and `stop`. Match the labels in the picture to the references in the snapshot.
2. **A public page.** Ask your agent to open a news page, read the top stories, and summarize them, using the browser and not web search. Check that it tells you what it did.
3. **A login wall.** Ask it to open a page that requires signing in and report what it sees. It should stop and tell you. If it tries to sign in, tighten your prompt.
4. **A stale reference.** Take a snapshot of a page that changes, trigger the change, and try the old reference. Then take a new snapshot and succeed. This is the most common thing you'll debug.
5. **The QA prompt.** Run the TodoMVC exploratory test from the [browser prompts lesson](openclaw-browser-prompts.md) and read the report it produces.

## Troubleshooting

Start with `openclaw browser doctor`. Then match the symptom:

| Symptom                                 | What to check                                                                                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| "Browser disabled"                      | The plugin or `browser.enabled` is off. Check both, then restart the Gateway.                                                           |
| The agent says it has no browser tool   | `plugins.allow` doesn't include `browser`, or the tool policy doesn't allow it. See Step 1.                                             |
| "Browser unavailable"                   | Look at process status, which Chrome binary was selected, whether the profile is locked, and the CDP endpoint, before blaming the page. |
| Chrome won't launch on a server         | There may be no Chromium-based browser installed. Install one and set `browser.executablePath`.                                         |
| "Navigation denied"                     | The URL was blocked by the outbound policy, possibly after a redirect. Check the SSRF policy before changing anything else.             |
| "No tab"                                | You're on the wrong profile, or the session was never attached.                                                                         |
| "Click had no effect"                   | The page re-rendered. Take a new snapshot and use the new reference.                                                                    |
| A screenshot times out                  | Wait for the capture to finish. If it stays stuck, close and reopen the tab.                                                            |
| A scheduled job using `user` just hangs | It's waiting on Chrome's attach prompt. Use `chrome` or a managed profile for unattended work.                                          |

A useful way to think about any failure is as a chain: the right profile was selected, the page it found was the right one, the action was allowed by policy, and the page afterward proves it worked. Find the first broken link.

> [!NOTE] Versions and updates
> This lesson follows OpenClaw's `2026.9.x` documentation. The docs don't show sample output for `doctor` or `status`, so the lesson doesn't either. Run `openclaw browser --help` on your build to confirm the exact commands and flags.
