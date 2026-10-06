---
title: Claude Code Mods
description: 'A mod is a plugin whose functions run inside Claude Code itself. The hook shape, key events, what a mod can get past, and the mistakes that bite first.'
---

Settings [hooks](hooks.md) (scripts the harness runs at lifecycle events), [skills](skills.md) (folders of instructions the agent loads on demand), and MCP servers (programs that add tools over the [Model Context Protocol](https://modelcontextprotocol.io/)) all work from the outside. They can react to what Claude Code does or hand it text, but they can't change the interface or step into a request to the model.

A **mod** can. It's a [plugin](https://code.claude.com/docs/en/plugins) (a bundle of extensions you install into Claude Code) whose JavaScript or TypeScript functions run _inside_ Claude Code's own process. You still don't edit Claude Code's source; a mod works through the events it exposes. Mods are on by default as of Claude Code v2.1.287, in both the command-line tool and the desktop app's Code tab.

The short version: a mod is unsandboxed code running as you.

## What only a mod can do

- Draw its own interface: panes, or the band above the prompt.
- Redraw parts of Claude Code's interface: the spinner, tool rows, messages.
- Step into a model request. Your function sits in the path of the request, and it can pass it along, change it, or answer it itself.
- Answer a tool call yourself, so the tool never runs. A settings hook can block a call or adjust its input; only a mod can supply the result or override the final permission decision.
- Add `/commands` that run instantly, with no Claude turn at all.

Blocking, allowing, or logging with a script you already have? Settings hook. Instructions Claude should read? Skill. Reaching an external system? MCP server. Reach for a mod only when you need the inside.

## How a mod works

You need three files:

- `plugin.json`: The manifest, which names the plugin and describes what it contains.
- `hooks/hooks.json`: Includes `"modules": ["./register.js"]`. That key makes the plugin a mod.
- The hooks module, which exports `register(on)`. Claude Code calls it once, handing you `on` to attach hooks to events.

Every hook receives `($, e, next)`. If you've ever written [Express](https://expressjs.com) middleware (functions that each handle a request and pass it along), you basically already have the gist:

- **`$`**: The mods API. It's the _only_ way your code reaches files, processes, the network, models, or the interface.
- **`e`**: The event, as plain data you can't change in place. To change it, pass a copy to `next`.
- **`next(e)`**: Runs the remaining mods, then Claude Code's own behavior.

A hook does one of three things:

- **Observe**: Do your work, then `return next(e)`.
- **Rewrite**: `return next({ …e, changed })`.
- **Answer**: Return a result _without_ calling `next`. Nothing after your hook runs.

Here's the observe case: a hook that watches every prompt you submit and leaves it alone.

```ts
export function register(on) {
  on('prompt.submit', ($, e, next) => {
    // Do your work here, using $ for anything outside the mod.
    return next(e);
  });
}
```

Matchers narrow when a hook runs: `{ tool: 'Bash' }`, `{ component: 'Pane' }`, an array of values, or a regular expression.

## Key events

- **Tools**: `tool.call` fires when Claude asks to run a tool. It can deny the call, change its arguments, or return a result itself. `tool.check` fires where the permission decision is made, and it can override that final allow, ask, or deny. (Deny rules have a catch; [Security and governance](#security-and-governance) explains when a user's mod can't override them.)
- **Prompts**: `prompt.submit` can rewrite the prompt, add context only Claude reads, or drop the prompt entirely.
- **Turns**: `turn.step` covers each request to the model. It streams, so you write it as an async generator. `turn.complete` fires when the turn ends.
- **Session and commands**: Register commands and tools in `session.start`. Answer your commands in `command.run`.
- **Interface**: `ui.render` decides what a pane, the band, or an existing part of the interface draws.
- **Other mods**: `plugin.register` lets a policy mod refuse other mods before they load. And every `$` method is also an event (`fs.read`, `http.fetch`), so one mod can police another's calls.
- **Settings hook events**: Each one is also available as `classic.<Event>`, so a mod can handle everything your existing hooks handle.

## Developing a mod

- `claude --plugin-dir ./my-mod` loads a folder for one session and reloads it on every save.
- The fastest start is asking Claude to write it. It'll use the built-in `plugin-authoring` skill.
- `claude plugin validate ./my-mod` reads your source without running it, lists the `hooks:` it handles and the `calls:` it makes, and catches misspelled events. A module it can't read won't load.
- `claude plugin test` runs your tests with no session, no sign-in, and no network. It exits `1` on failure, so it works in CI.
- Claude Code writes TypeScript declaration files for your exact version into `.claude-plugin/types/`. When they disagree with the documentation, trust the types.

A mod runs with your permissions inside Claude Code's process, so its mistakes cost more than a script's.

## Security and governance

A mod can read your files and secrets, see every prompt and tool call, approve tool calls on your behalf, and spend your usage. Before installing one, run `claude plugin validate` and actually read the `calls:` and `hooks:` lines: what the mod can reach and what it listens to.

When the built-in guard (`sec-default`) loads, a user's mod _can't_ get past deny rules, managed `PreToolUse` hooks, or managed instructions, not even with `tool.check`. ("Managed" means set by an administrator, in settings the user can't override.) `sec-default` loads outermost on a machine with managed settings, or for a Team or Enterprise organization, unless managed `prependPlugins` says otherwise. On a personal machine with neither, the documentation describes no such protection, so assume a mod you install can override your own deny rules. No mod can change what the permission prompt shows.

What a mod _can_ get past:

- `ask` rules, the permission rules that make Claude Code prompt you.
- `PreToolUse` [hooks](hooks.md) that don't come from managed settings.
- The auto-mode classifier, for calls the mod approves.
- **Your deny rules, for the mod's own `$.fs` and `$.process` calls.**

That last one surprises people. Deny rules restrict Claude, not a mod that reads files on its own.

For admins, in managed settings:

- `allowManagedModsOnly`: Stops users' own mods from loading.
- `prependPlugins` and `appendPlugins`: Set where your organization's mods run relative to users'.
- `disableSideloadFlags`: Blocks `--plugin-dir`.
- `disableAllHooks`: Stops all mods _and_ all hooks.

For you: `--safe-mode` for one session, or `"disableAllHooks": true` in your settings for every session.

## Best practices

- **Make guards fail closed**: A hook that throws or hits the host timeout gets skipped, so the guard lets the call through. Return a denial from `.catch()`, and race any pending operation against your own deadline, since `.catch()` can't settle a promise that hangs. Use `$.clock.sleep` for that, for example a five-second wait mapped to `{ deny: "Guard deadline exceeded" }` for `tool.call`, comfortably inside the host's 10-second deadline. Test success, rejection, and a never-settling operation. No internal timer survives a crashed or unloaded mod runtime, so enforce invariants that must survive that with an external permission rule, managed hook, sandbox, or OS boundary.
- **Write deny text as an instruction**: Claude reads it as the tool's result, so tell it what to do instead.
- **Keep waiting inside `$` calls**: A hook gets 10 seconds of its own running time. Waiting on `next()` or `$.ui.ask` doesn't count. Awaiting your own promises does.
- **Choose storage by how long a value has to last**: A module variable is lost on every reload. `$.state` lasts the session, and writing to it redraws whatever depends on it. `$.store` persists across sessions and is shared by all of them.
- **Reload `$.state` after `/clear`**: `/clear`, `/resume`, and `/branch` (the commands that empty, reopen, or fork a conversation) reset it, so copy saved values back from `$.store` in `classic.SessionStart`.
- **Redraw explicitly for everything else**: When something other than `$.state` changes what should be on screen, like a module variable or a value from `$.store`, call `$.ui.invalidate('ui.render')`, give every control a `key`, and check `e.surface`, because some elements only draw in the terminal or only in the desktop app.
- **Open panes only when the user asks**: A pane your mod opens on its own needs a 144-column terminal. Use `$.ui.toast` (a brief on-screen notification) to announce things instead.

## Anti-patterns

- **Code the validator rejects**: Aliasing or destructuring `$`, non-literal event names, two `session.start` hooks with no matcher, and dynamic `import()`.
- **Reaching for the usual JavaScript tools**: `setTimeout`, `fetch`, and the Node APIs don't exist in a mod. Use `$.clock`, `$.http`, `$.fs`, and `$.process`.
- **Editing the installed copy**: It's cached by version. Develop against `--plugin-dir`.
- **Treating a regular-expression guard as security**: A pattern written for `--force` misses `git push -f`. See [The Enforcement Ladder](the-enforcement-ladder.md) for ways to enforce a rule more reliably.
- **Assuming deny rules restrict the mod itself**: They don't. See [Security and governance](#security-and-governance).
- **Busy loops**: They crash the shared worker thread that runs installed mods, and repeated crashes unload _all_ of them.
- **Changing system-prompt text on every request**: It breaks the [prompt cache](caching-and-cost.md) (the provider's cache of a conversation prefix it has already processed, which makes resending that prefix much cheaper), so every request pays full price. Every. Single. Time.

## Advanced levers

- `turn.step` to route individual requests to another model, or to log cache hits.
- `$.tool.register` to give Claude a new tool.
- `$.model.complete` for a model call of your own, with no conversation history.
- `$.model.fork` to ask a question over the current conversation, mostly served from cache. Handy for writing a handoff brief.
- Timers (`$.clock.every`), plus `$.prompt.submit` to start a turn from background work.
- `$.session.send` to message another session.
- `session.append` to rewrite conversation rows before they're stored, for redaction, say.
- `Raster` and `$.ui.blit` for grids and animation in the terminal.
- Policy mods: `plugin.register` to refuse other mods, plus hooks on `$` methods to audit them.

## Learn from real code

Start with the built-in mods (`diff`, `agents-md`, `sec-default`, `telemetry`) in [`anthropics/claude-code/mods`](https://github.com/anthropics/claude-code/tree/main/mods). Then try Anthropic's samples: token-weather, blast-radius, and replay-theater.

From the community, there's [OneWave's ten example mods](https://github.com/OneWave-AI/claude-code-mods), and [paddo's ccseats write-up](https://paddo.dev/blog/claude-code-mods) on real-world gotchas.

Start with `validate` and `--plugin-dir`, learn from the built-in mods first, and treat every mod, including your own, as code with the keys to everything.
