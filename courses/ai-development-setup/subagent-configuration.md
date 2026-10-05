---
title: Configuring Subagents
description: 'Every subagent frontmatter field in one line, the gotchas that fail silently, how to pick a model per stage, and how Claude Code differs from Codex.'
---

A subagent definition looks like a few lines of YAML. Most of the ways it goes wrong are silent: a misspelled field is ignored, a "read-only" agent can write files, a permission setting gets overridden by the parent. None of those produce an error.

This is the reference for the definition file. If you haven't yet, [Subagents](subagents.md) explains what one is for.

## Where definitions live

A definition is a Markdown file with YAML frontmatter (a block of key-value settings between two `---` lines) followed by the agent's instructions. It can live in:

- `.claude/agents/` for the project.
- `~/.claude/agents/` for you, across projects.
- The session-level `--agents` command-line option, which takes JSON.
- A plugin, which is a bundle of skills, hooks, and agents you install together.

Only `name` and `description` are required. The [subagent documentation](https://code.claude.com/docs/en/sub-agents) is the authority for the rest.

## Fields

- `name`: Must be unique. It can't contain `:` or start with `-`. Project and user agent files must declare it; without it, Claude Code treats the file as adjacent documentation and skips registration. Only plugin agents fall back to the filename.
- `description`: Tells Claude when to delegate to this agent. You need it for automatic delegation, which means it works like a routing rule.
- `tools`: An allowlist, as a comma-separated string or a YAML list. Listing `Agent` (the tool that starts subagents) lets the agent delegate. Writing `Agent(researcher, analyst)` limits it to those agents, but only when the agent is running the whole session with `--agent`. In an ordinary subagent definition, the parenthesized list is ignored.
- `disallowedTools`: Removes tools from the inherited set. A name pattern like `mcp__*` (every tool an MCP server supplies) works. A pattern with a specifier, like `Bash(git push *)`, removes the _whole_ tool, not just that command. For command-level blocks, use a deny rule in your settings instead.
- `permissionMode`: How much the agent may do without asking. `default` asks before edits and commands. `acceptEdits` auto-approves file edits. `plan` is read-only planning. `auto` lets a classifier (a background model check) approve actions it judges safe. `bypassPermissions` skips prompts entirely. `dontAsk` auto-denies any call that would otherwise prompt. If you don't set the field, the agent uses the session's mode. Heads up: if the parent is in `auto`, `acceptEdits`, or `bypassPermissions`, the subagent runs in that mode and ignores its own setting. A `plan` reviewer isn't read-only under `auto`. See the [permissions documentation](https://code.claude.com/docs/en/permissions) for what each mode does.
- `model`: `sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit` to use the parent's.
- `effort`: How hard the model thinks: `low`, `medium`, `high`, `xhigh`, or `max`.
- `maxTurns`: Stops the agent after N agentic turns, where each agentic turn is one request to the model plus the tool calls it makes. Output is marked partial if it hits the cap.
- `background`: `true` forces the agent to run in the background. With fork mode on, which is the interactive default, subagents normally run in the background. Where fork mode is off, including headless (`claude -p`) and SDK defaults, Claude usually runs them in the background but chooses foreground when it needs the result before continuing. Set `background: true` when a worker must stay in the background; see the [scheduling rules](https://code.claude.com/docs/en/sub-agents#run-subagents-in-foreground-or-background).
- `isolation`: `worktree` runs the agent in its own git worktree (an extra checkout of the same repository, in its own directory). By default it branches from your default branch, not your current `HEAD`. Set `worktree.baseRef` to `"head"` in your Claude Code settings to branch from your current commit instead, or name the exact commit in the assignment and have the worker check it out first. ([Worktrees in Practice](worktrees-in-practice.md) covers this trap.)
- `initialPrompt`: Auto-submits the first message when the agent runs as the main session with `--agent`.
- `skills`: [Skills](skills.md) to preload at startup. This preloads them. It doesn't restrict which others the agent can reach.
- `mcpServers`: MCP server names or inline definitions scoped to this agent. (An MCP server is a program that adds tools to the harness over the [Model Context Protocol](https://modelcontextprotocol.io/).)
- `hooks`: Lifecycle [hooks](hooks.md) scoped to this agent.
- `memory`: Gives the agent a persistent memory directory. Set it to `user`, `project`, or `local`:
  - `user` stores it under `~/.claude/agent-memory/<agent-name>/`.
  - `project` stores it under `.claude/agent-memory/<agent-name>/`, which can be committed to the repository.
  - `local` stores it under `.claude/agent-memory-local/<agent-name>/`, which stays out of version control.
- `omitClaudeMd`: Skips loading `CLAUDE.md` files.
- `color`: Terminal display color, such as `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, or `cyan`.
- `experimental.cacheTtl`: `5m` or `1h`, the lifetime of this one agent's [prompt cache](caching-and-cost.md). The `subagentPromptCacheTtl` setting does the same job session-wide for everything outside your main conversation. Per Claude Code's [prompt caching documentation](https://code.claude.com/docs/en/prompt-caching), that setting is checked first, so it wins when both are set.

## Gotchas

- **Omitting `tools` inherits everything**: The subagent gets whatever the parent has. To make a leaf worker that can't delegate any further, list `tools` explicitly and leave `Agent` out.
- **Bash is the soft spot**: A shell can write files, so a "read-only" agent with `Bash` isn't. Back it with a settings deny rule, a `PreToolUse` hook (a script that runs before a tool call), or the sandbox (operating-system-level isolation that limits what files and network the agent's shell commands can reach, no matter what the model decides).
- **Model selection takes the first match**: The model passed when spawning, then the definition's `model`, then the `CLAUDE_CODE_SUBAGENT_MODEL` environment variable, then the parent's model. Forks (subagents that start with a copy of your conversation) always run on the parent's model. Check `/tasks`, the command that lists your session's tasks and the model each subagent actually ran on.
- **Unknown fields fail silently**: Write `max_turns` instead of `maxTurns`, and it's ignored without so much as a warning.
- **Plugin agents drop fields**: `hooks`, `mcpServers`, `permissionMode`, and `initialPrompt` all get dropped from agents that ship in a plugin.
- **Background by default**: With fork mode enabled, as it is by default in interactive sessions, subagents run in the background. Where fork mode is off, foreground execution is available; `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` forces foreground execution. Some tools are unavailable in the background. In an interactive session, a permission request is shown in the main session with the requesting subagent identified, and the worker waits for your answer. In an unattended run, nobody may be present to answer; define how that run reports a blocked action instead of granting broader access to avoid the prompt.
- **Limits**: 20 subagents running at once and three layers of nesting by default (a subagent starting subagents, which start more). Four children per agent across three layers is 4 + 16 + 64 = 84 workers. (Please don't.)

## Choosing a model per stage

Not every stage of a workflow needs the same model. What matters is the cost of a mistake at that stage:

| Stage      | Examples                                                   | Cost of a mistake                                     | Claude Code `model` | Codex-side equivalent |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------------- | ------------------- | --------------------- |
| Mechanical | Listing files, extracting fields, grepping a known pattern | Low: checkable by hand in seconds                     | `haiku`             | Luna                  |
| Discovery  | "Find bugs in this module"                                 | High and invisible: a miss never reaches verification | `sonnet`            | Sol                   |
| Judging    | Refuting a finding, scoring competing approaches           | High: nothing checks the checker                      | `opus`              | Sol                   |
| Synthesis  | Merging findings, writing the final report                 | Highest: it's the version someone acts on             | `opus`              | Sol                   |

For narrow but careful work, raise the `effort` field before moving to a bigger model. Compare cost per accepted result, not per run. [Prompt Caching and Cost](caching-and-cost.md) has the prices behind these names.

## Claude Code versus Codex

The biggest difference is who decides to delegate.

Claude Code treats delegation as something the model does on its own. It reads each agent's `description`, so descriptions work like routing rules, and you can also force a choice with an @-mention or `--agent`. In Claude Code, you tune the model's judgment.

[Codex](https://developers.openai.com/codex/subagents) delegates when you ask directly or when applicable `AGENTS.md` or skill instructions request it. You can name the agents and roster in the prompt, but also inspect those standing instructions: they can trigger parallel work without a new delegation request each turn. Codex runs the agents and gathers their results; every worker adds token usage and concurrency.

Next, [Delegating Well](delegating-well.md) covers how to write the assignment these definitions get handed.

Set `tools`, set `model`, and check `/tasks`. Don't trust the defaults.
