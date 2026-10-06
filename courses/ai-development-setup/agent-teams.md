---
title: Agent Teams
description: "Teams let subagents message each other, but cost three to four times the tokens. Use them only when workers need to change each other's minds."
---

By default, a subagent talks only to the main agent that started it. Sometimes that's exactly the limit you hit: two workers are chasing competing theories of the same bug, and the useful move would be for one to tell the other, "that can't be it, here's why."

That's what [agent teams](https://code.claude.com/docs/en/agent-teams) are for. They're also expensive, which is the catch.

## What a team is

Agent teams are [subagents](subagents.md) (helper agents that each start with their own fresh context) that can talk to _each other_.

An ordinary subagent returns its final report to the main agent that started it. While it runs, it can exchange messages with that main agent through `SendMessage`, and the main agent can resume it later the same way. By default, that's its only conversation. (A worker explicitly given `SendMessage`, in a workflow for example, can message other agents too.)

A team makes peer messaging the default. Instead of a lead (the main agent that created the team) dispatching workers and waiting for reports, teammates share a task list, claim work from it, and message each other directly.

_TL;DR_: teams are worth their cost only when workers need to change each other's minds mid-task. If the lead only needs final answers, subagents give you the same parallelism for about half the tokens. They can also run in worktree isolation (each worker in its own checkout of the repository), but only when you set `isolation: worktree` in the definition or invocation. Otherwise they share the main session's working directory. See the [subagent configuration reference](https://code.claude.com/docs/en/sub-agents#write-subagent-files).

## Turning a team on

Teams are experimental and off by default. Set the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` environment variable in your shell or a settings file. Then ask the lead (the session you're talking to) for a team in plain language: "Spawn three teammates to review PR #142: one security, one performance, one test coverage." Each teammate starts like a fresh session: it loads your `CLAUDE.md`, MCP servers, skills, and the spawn prompt, but not the lead's conversation.

One catch: since Claude Code v2.1.233, task-tracking tools are disabled by default on Opus 4.8+, Sonnet 5+, Fable 5+, and Mythos 5+. Set `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` to restore them, as the [release notes](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#21233) specify, and check that the shared task tools are available before relying on them.

## What they cost

- A three-teammate team runs about 3–4× the tokens of one sequential session.
- Teammates in plan mode (the read-only `plan` permission mode, where an agent proposes a plan before changing anything) run about 7×.
- Teams buy you latency, not savings. [One field report](https://magarcia.io/using-claude-code-agent-teams-for-incident-investigation/) on one incident triage: about 10 minutes instead of 30–45 working solo, at roughly $8–10 instead of $2–3 in token spend.

Sometimes that's a great trade. Just make it on purpose.

## Good fits

- **Competing hypotheses**: Each teammate tries to _disprove_ the others' theories, not just defend its own.
- **Cross-layer features**: Frontend, backend, and tests working in parallel, after you've frozen the contract between them.
- **Multi-lens review**: Security, performance, and test coverage looking at the same change and arguing about severity.

## Things that will bite you

- **The setting changes your subagents, too**: In interactive sessions with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` on, a _named_ Agent call becomes a teammate unless it's a fork or passes `isolation` on the call itself, as the [team launch reference](https://code.claude.com/docs/en/agent-teams#how-claude-starts-agent-teams) explains. Headless and SDK named agents stay ordinary subagents. A converted teammate runs in the main working directory and ignores the definition's `isolation: worktree`, preloaded `skills`, and `permissionMode`, so frontmatter isolation alone won't save you. My own settings had this on globally, which may well explain a chunk of my worktree friction. Keep it off in your user settings and turn it on per repository. ([Configuring Subagents](subagent-configuration.md) explains the fields.)
- **Runaway spawns**: [In one reported case](https://github.com/anthropics/claude-code/issues/76970), a teammate with no `tools` or `model` restriction inherited the ability to spawn more agents on Opus, recursed, and burned about 77% of a five-hour usage limit in under an hour. The nesting limit for ordinary subagents didn't stop it. Give every role an explicit `tools` list and `model`, state the roster size, and require workers to return to the coordinator rather than delegate further. Codex needs the same roster and concurrency policy: its V2 runtime supports nested agents, and the older `agents.max_depth` setting is [ignored by V2](https://github.com/openai/codex/blob/main/codex-rs/config/src/config_toml.rs). Verify the active runtime's limits instead of assuming a depth-one boundary.
- **The lead does the work itself**: Instead of waiting for teammates, the lead starts implementing. Tell it to wait.
- **Idle looks dead**: The lead decides a quiet teammate has died and spawns a duplicate.
- **Plan approval is automatic**: A teammate in plan mode stays read-only until it submits a plan, which the lead then approves without reading. If you want a real review, build it in with a hook. It's the same fatigue from [You are a load-sensitive component](verification-and-evidence.md#you-are-a-load-sensitive-component).

## The real quality gate

Team-specific [hooks](hooks.md), scripts the harness runs automatically at set points, are where you get control back. Three fire at team events:

- `TaskCreated`: Fires when a task is added to the shared list.
- `TaskCompleted`: Fires when a teammate marks a task done. Exiting with code `2` (the hook's block signal) refuses the "done" until your tests actually pass.
- `TeammateIdle`: Fires when a teammate goes quiet. Exiting `2` sends the hook's stderr to the teammate as feedback, and the teammate keeps working instead of going idle. Keep a retry count so the hook gives up after a few tries instead of looping forever.

> [!NOTE] Codex doesn't have a teams feature
> You can build one out of task files, `mkdir`-based lock claims (creating a directory is an atomic way to claim a task), and a `codex exec` worker per worktree. (`codex exec` is Codex's headless mode: it runs one non-interactive session and exits.) But at that point, you're writing a [Ralph loop](the-ralph-loop.md) (a fresh agent per task, restarted in a loop) with extra steps.

Reach for a team when the workers need to argue. Otherwise, use subagents and save the tokens.
