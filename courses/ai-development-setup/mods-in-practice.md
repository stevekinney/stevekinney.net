---
title: Mods in Practice
description: 'What a mod can read, spend, and get past, how admins restrict mods, and the guard, storage, and prompt-cache mistakes that bite first.'
---

A [mod](claude-code-mods.md) runs with your permissions and inside Claude Code's process, so mistakes in one are more expensive than mistakes in a script. This lesson covers what mods can do to you, how to restrict them, and what experience says to avoid.

## Security and governance

A mod can read your files and secrets, see every prompt and tool call, approve tool calls on your behalf, and spend your usage. Before installing one, run `claude plugin validate` and actually read the `calls:` and `hooks:` lines. They tell you what the mod can reach and what it listens to.

When the built-in guard (`sec-default`) loads, a user's mod _can't_ get past deny rules, managed `PreToolUse` hooks, or managed instructions. That includes a mod's `tool.check` hook. `sec-default` loads outermost on a machine with managed settings, or for a Team or Enterprise organization, unless managed `prependPlugins` says otherwise. On a personal machine with neither, the documentation describes no such protection, so assume a mod you install can override your own deny rules. ("Managed" means set by an administrator, in settings the user can't override.) And no mod can change what the permission prompt shows.

What a mod _can_ get past:

- `ask` rules, the permission rules that make Claude Code prompt you.
- `PreToolUse` [hooks](hooks.md) that don't come from managed settings.
- The auto-mode classifier, for calls the mod approves.
- **Your deny rules, for the mod's own `$.fs` and `$.process` calls.**

That last one is the surprising one. Deny rules restrict Claude. They don't restrict a mod that reads files on its own.

For admins, in managed settings:

- `allowManagedModsOnly`: Stops users' own mods from loading.
- `prependPlugins` and `appendPlugins`: Set where your organization's mods run relative to users'.
- `disableSideloadFlags`: Blocks `--plugin-dir`.
- `disableAllHooks`: Stops all mods _and_ all hooks.

For you: `--safe-mode` for one session, or `"disableAllHooks": true` in your settings for every session.

## Best practices

- **Make guards fail closed**: A hook that throws or times out gets skipped, so a guard lets the call through. Attach a `.catch()` and return `{ deny }`.
- **Write deny text as an instruction**: Claude reads it as the tool's result, so tell it what to do instead.
- **Keep waiting inside `$` calls**: A hook gets 10 seconds of its own running time. Waiting on `next()` or `$.ui.ask` doesn't count. Awaiting your own promises does.
- **Choose storage by how long a value has to last**: A module variable is lost on every reload. `$.state` lasts the session, and writing to it redraws whatever depends on it for you. `$.store` persists across sessions and is shared by all of them.
- **Reload `$.state` after `/clear`**: `/clear`, `/resume`, and `/branch` (the commands that empty, reopen, or fork a conversation) reset it, so copy saved values back from `$.store` in `classic.SessionStart`.
- **Redraw explicitly for everything else**: When something other than `$.state` changes what should be on screen, like a module variable or a value from `$.store`, call `$.ui.invalidate('ui.render')`, give every control a `key`, and check `e.surface`, because some elements only draw in the terminal or only in the desktop app.
- **Open panes only when the user asks**: A pane your mod opens on its own needs a 144-column terminal. Use `$.ui.toast` (a brief on-screen notification) to announce things instead.

## Anti-patterns

- **Code the validator rejects**: Aliasing or destructuring `$`, non-literal event names, two `session.start` hooks with no matcher, and dynamic `import()`.
- **Reaching for the usual JavaScript tools**: `setTimeout`, `fetch`, and the Node APIs don't exist in a mod. Use `$.clock`, `$.http`, `$.fs`, and `$.process`.
- **Editing the installed copy**: It's cached by version. Develop against `--plugin-dir`.
- **Treating a regular-expression guard as security**: A pattern written for `--force` misses `git push -f`. See [The Enforcement Ladder](the-enforcement-ladder.md) for ways to enforce a rule more reliably.
- **Assuming deny rules restrict the mod itself**: They don't. See above.
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

If you want to learn from real code, start with the built-in mods (`diff`, `agents-md`, `sec-default`, `telemetry`) in [`anthropics/claude-code/mods`](https://github.com/anthropics/claude-code/tree/main/mods). Then try Anthropic's samples: token-weather, blast-radius, and replay-theater.

From the community, there's [OneWave's ten example mods](https://github.com/OneWave-AI/claude-code-mods), and [paddo's ccseats write-up](https://paddo.dev/blog/claude-code-mods) on real-world gotchas.

Read the `validate` output before you install any mod, and learn from the built-in ones first.
