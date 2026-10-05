---
title: Claude Code Mods
description: 'A mod is a plugin whose functions run inside Claude Code itself, so it can redraw the interface and step into tool calls. Learn the hook shape and events.'
---

Hooks, skills, and MCP servers all share a limit: they work from the outside. They can react to what Claude Code does, or hand it text, but they can't change how the interface looks or step into a request to the model. A mod can. (You still don't edit Claude Code's source. A mod changes its behavior from the inside, through the events it exposes.)

A **mod** is a [plugin](https://code.claude.com/docs/en/plugins) (a bundle of extensions you install into Claude Code) whose JavaScript or TypeScript functions run _inside_ Claude Code's own process. Settings [hooks](hooks.md) (scripts the harness runs at lifecycle events), [skills](skills.md) (folders of instructions the agent loads on demand), and MCP servers (programs that add tools to the harness over the [Model Context Protocol](https://modelcontextprotocol.io/)) all work from the outside. A mod is on the inside. Mods are on by default as of Claude Code v2.1.287, and they run in both the command-line tool and the desktop app's Code tab.

The short version: a mod is unsandboxed code running as you. It's also the only way to change Claude Code's interface, the only way to step into a model request, and the only way to answer a tool call yourself.

## What only a mod can do

- Draw its own interface: panes, or the band above the prompt.
- Redraw parts of Claude Code's interface: the spinner, tool rows, messages.
- Step into a model request. Your function sits in the path of the request, and it can pass it along, change it, or answer it itself.
- Answer a tool call yourself, so the tool never runs. A settings hook can block a call or adjust its input, but only a mod can also supply the result, step into the model request, and override the final permission decision.
- Add `/commands` that run instantly, with no Claude turn at all.

If you're just blocking, allowing, or logging with a script you already have, use a settings hook. If it's instructions Claude should read, that's a skill. If you need to reach an external system, that's an MCP server. Reach for a mod only when you need the inside.

## How a mod works

You need three files:

- `plugin.json`: The plugin manifest, which names the plugin and describes what it contains.
- `hooks/hooks.json`: Includes `"modules": ["./register.js"]`. That key is what makes the plugin a mod.
- The hooks module itself, which exports `register(on)`. Claude Code calls it once, handing you `on`, the function you use to attach hooks to events.

Every hook receives `($, e, next)`. If you've ever written [Express](https://expressjs.com) middleware (functions that each handle a request and pass it along), you basically already have the gist:

- **`$`**: The mods API. It's the _only_ way your code reaches files, processes, the network, models, or the interface.
- **`e`**: The event. It's plain data you can't change in place. To change it, pass a copy to `next`.
- **`next(e)`**: Runs the remaining mods, then Claude Code's own behavior.

A hook does one of three things:

- **Observe**: Do your work, then `return next(e)`.
- **Rewrite**: `return next({ …e, changed })`.
- **Answer**: Return a result _without_ calling `next`. Nothing after your hook runs.

Here's the shape, built from those pieces. This hook watches every prompt you submit and does nothing to it. That's the observe case.

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

- **Tools**: `tool.call` fires when Claude asks to run a tool. It can deny the call, change its arguments, or return a result itself. `tool.check` fires where the permission decision is made, and it can override that final allow, ask, or deny. (There's a catch for deny rules. [Mods in Practice](mods-in-practice.md) explains when a user's mod can't override them.)
- **Prompts**: `prompt.submit` can rewrite the prompt, add context only Claude reads, or drop the prompt entirely.
- **Turns**: `turn.step` covers each request to the model. It streams, so you write it as an async generator. `turn.complete` fires when the turn ends.
- **Session and commands**: Register commands and tools in `session.start`. Answer your commands in `command.run`.
- **Interface**: `ui.render` decides what a pane, the band, or an existing part of the interface draws.
- **Other mods**: `plugin.register` lets a policy mod refuse other mods before they load. And every `$` method is also an event (`fs.read`, `http.fetch`), so one mod can police another's calls.
- **Settings hook events**: Each one is also available as `classic.<Event>`, so a mod can handle everything your existing hooks handle.

## Developing a mod

- `claude --plugin-dir ./my-mod` loads a folder for one session and reloads it on every save.
- The fastest start is asking Claude to write it. It'll use the built-in `plugin-authoring` skill.
- `claude plugin validate ./my-mod` reads your source without running it and lists the `hooks:` it handles and the `calls:` it makes. It catches misspelled events. A module it can't read won't load.
- `claude plugin test` runs your tests with no session, no sign-in, and no network. It exits `1` on failure, so it works in CI.
- Claude Code writes TypeScript declaration files for your exact version into `.claude-plugin/types/`. When they disagree with the documentation, trust the types.

[Mods in Practice](mods-in-practice.md) covers what a mod is allowed to get away with, and the mistakes that bite first.

Start with `validate` and `--plugin-dir`, and treat every mod, including your own, as code with the keys to everything.
