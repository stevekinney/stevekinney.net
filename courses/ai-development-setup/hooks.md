---
title: Hooks
description: 'Hooks run deterministic code at lifecycle events and can block actions. Learn the exit-code contract and how hooks sit relative to permissions.'
---

You wrote "always run the formatter" in `CLAUDE.md`. The agent did it nine times out of ten. The tenth time, it didn't, and you found out in code review.

A sentence in an instruction file is a request. A **hook** is code. It runs every time, whether the model remembers or not. Here's what that buys you, and what it doesn't. (Hooks exist in [Claude Code](https://code.claude.com/docs/en/hooks), and [Codex's hooks](https://developers.openai.com/codex/hooks) were modeled on them. They share the same basic contract but differ in trust, caps, and some events.)

## What hooks are

_TL;DR_: hooks are a way to run deterministic code in response to lifecycle events. A _lifecycle event_ is a set point in an agent's work, like "a session just started" or "a tool is about to run." A hook can run at a particular event and return feedback. It _cannot_ enforce paths that never pass through that event.

Hooks are best for "whenever this event happens, automatically do this specific thing." They're usually the wrong choice for "figure out what work needs doing and manage that work."

Good fits:

- Blocking writes to protected branches.
- Validating tool inputs.
- Formatting an edited file.
- Recording a bounded handoff: a short, size-capped note, like a progress file, that the next session reads to pick up where this one left off.
- Requiring fresh evidence before completion.

A few of the events you'll see throughout this course:

- `SessionStart`: A session (one conversation with the agent, from launch until you exit) begins.
- `PreToolUse`: A tool (one action the harness lets the model take, like reading a file or running a shell command) is about to run. The hook can block it.
- `PostToolUse`: A tool just ran. Too late to block, but good for feedback and cleanup.
- `UserPromptSubmit`: You just submitted a prompt. A hook can add context alongside it, but can't replace it.
- `PermissionRequest`: The agent is waiting for you to approve something.
- `Stop`: The agent is about to finish a turn (one round of responding, possibly running several tools) and wait for you.
- `SubagentStop`: A subagent (a helper agent with its own fresh context that returns only a final report) is about to finish.

There are more, including `TaskCreated`, `TaskCompleted`, and `TeammateIdle` for [agent teams](agent-teams.md), and `PreCompact` and `PostCompact` around compaction. The [hooks reference](https://code.claude.com/docs/en/hooks) lists them all.

## A caveat from someone who's used them

Almost every time I've decided to use hooks, I've eventually ripped them out because they were more annoying than helpful.

That said, the data disagrees with me a little. When I had agents audit my own sessions, the problems I fixed with a hook or a script _stayed_ fixed, and the ones I fixed with a sentence in `CLAUDE.md` didn't.

So here's where I've landed. Keep _enforcement_ hooks for the handful of rules that have to hold every single time. [The Enforcement Ladder](the-enforcement-ladder.md) is how to decide which rules those are. Lightweight hooks, like a formatter, a notification, or a context loader, are fine too, because nothing depends on them holding.

## How hooks work

The contract is refreshingly boring. The harness sends event JSON to your script on stdin, and your exit code does the talking:

- **Exit `0`**: "No objection." That's _not_ the same as approval. Permission rules still get the final say.
- **Exit `2`**: Block, where the event supports blocking. Whatever you wrote to stderr goes to Claude, so tell it why.
- **Anything else**: A non-blocking error. The action proceeds. That means a hook that crashes with exit `1` doesn't stop anything. [The Enforcement Ladder](the-enforcement-ladder.md) has a story about how that one goes.

Among exit codes, only `2` blocks. There's one other way to block: print a JSON decision to stdout and exit `0`. For a quick block with a message, exit `2` is simpler. Use JSON when you want more control, like asking you instead of denying, or modifying the tool's input. A `PreToolUse` hook can also change a tool's input before it runs, with an `updatedInput` field in that JSON.

Some details that will save you an afternoon:

- **Decision fields differ per event**: `PreToolUse` takes `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "..."}}`. `Stop` and `SubagentStop` take `{"decision": "block", "reason": "..."}`. `PermissionRequest` uses `hookSpecificOutput.decision.behavior`. JSON shaped for the wrong event does nothing, silently.
- **Not every event can block**: `PostToolUse` can't, because the tool already ran. `SessionStart` can't either. Exiting `2` there doesn't stop the session.
- **Matchers only see what they match**: A _matcher_ is the pattern that decides which tool calls trigger a hook. An `Edit|Write` matcher misses writes made through Bash. For filesystem rules, use `FileChanged` (an event that fires when a file on disk changes) or a scan on `Stop`. Both detect after the fact. `FileChanged` can't block anything. A `Stop` scan can refuse to let the agent finish until it fixes the problem.
- **Use `command` handlers for invariants**: A handler is what runs when the hook fires. `prompt` (asks a model), `agent` (runs an agent), and `http` (calls a URL) handlers are fine for advice or for calling out to a central policy, but they aren't deterministic gates. A `command` handler runs a program you wrote.
- **Injected output is capped**: Hook output that gets injected into the context (everything the model can see when it decides its next step) tops out at 10,000 characters.

## Configuring hooks

Each event holds matcher groups, and each group holds handlers. A handler has a `type`, a `command`, and a `timeout` in seconds. Most command hooks default to 600 seconds, but event-specific defaults differ: `UserPromptSubmit` and `PreModelSwitch` default to 30 seconds; `SessionEnd` defaults to 1.5 seconds and also has a shared execution budget. Check the event in the [hooks reference](https://code.claude.com/docs/en/hooks) and set an explicit timeout appropriate to the work. A timeout can cancel the hook before it returns its decision.

Here's a minimal one. It lives under the `hooks` key of `.claude/settings.json`, and it runs a script before every `Bash` call:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": ".claude/hooks/allow-lint.sh", "timeout": 10 }]
      }
    ]
  }
}
```

Here's a deliberately narrow script: it accepts only the exact command `bun run lint`. Everything else, including malformed event JSON or a missing `jq`, blocks with exit `2`.

```bash
#!/bin/bash
if ! jq -e -s '
  length == 1 and
  (.[0] | type == "object" and
    .tool_name == "Bash" and
    .tool_input.command == "bun run lint")
' >/dev/null; then
  echo "Blocked: expected one Bash event for exactly bun run lint" >&2
  exit 2
fi
exit 0
```

This compares the whole command instead of trying to parse shell syntax. `bun run lint && rm -rf x`, leading whitespace, and wrappers all fail the comparison. The lint script and the hook must themselves be trusted: an exact command still runs whatever that script contains. Before installing it, feed the hook valid and malformed events and verify both exits.

For ordinary command restrictions, use Claude Code's documented [compound-command matching](https://code.claude.com/docs/en/permissions#compound-commands) instead of a homemade prefix test. A deny rule for `Bash(rm *)` catches `cd /tmp && rm -rf x`, but alternate invocations such as `/bin/rm` still need their own rules. Use sandbox filesystem controls when the boundary is what can be deleted, regardless of command spelling.

Hooks can live in a bunch of places. Hooks from all of them are merged, and every matching hook runs, in parallel, with no guaranteed order:

- Settings files: `~/.claude/settings.json` for you across projects, `.claude/settings.json` for the project (committed, so your team gets it), and `.claude/settings.local.json` for you in this project only. If the same setting conflicts across levels, precedence runs user, then project, then local, then command-line flag, then policy.
- Managed policy (settings an organization pushes to every machine), where `allowManagedHooksOnly` ignores everything else.
- Skill and agent frontmatter, the YAML block at the top of those files. (See [Configuring Skills](skill-configuration.md) and [Configuring Subagents](subagent-configuration.md).)
- A plugin's `hooks/hooks.json`. (A plugin is a bundle of skills, hooks, and agents you install together.)

A few fields worth knowing:

- `args`: Runs the command in exec form, with no shell in between. That's safer when inputs contain odd characters.
- `if`: Filters using permission-rule syntax. It's best-effort, so don't rely on it for a hard allow or deny.
- Anchor your matchers for MCP and plugin names, like `^mcp__x__y$`. (An MCP server is a program that adds tools to the harness over the [Model Context Protocol](https://modelcontextprotocol.io/).) Otherwise a short name can match more than you meant.

## Hooks and permissions

Think of it as each side having the last word on something different. A hook has the last word on _blocking_: exit `2` (or a JSON deny) stops the call even if permission rules would allow it. Permission rules (settings that allow, ask about, or deny specific tool calls) have the last word on _allowing_.

So a hook can't grant what a permission rule denies. Permission rules resolve deny first, then ask, then allow, and the first match wins. A deny at any level beats every other level. A `PreToolUse` hook that returns `allow` doesn't bypass a matching deny or ask rule. That makes "allow `Bash`, then block specific commands with a hook" a documented pattern. See the [permissions documentation](https://code.claude.com/docs/en/permissions) for the full rules.

Use a hook when "usually" isn't good enough. Use a permission rule when it's a hard yes or no.
