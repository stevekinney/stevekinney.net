---
title: Claude Code Subagents
description: >-
  Use Claude Code subagents for isolated exploration, planning, implementation,
  background work, memory, and specialized tool access.
---

[Claude Code subagents](https://code.claude.com/docs/en/sub-agents) are agents
with their own context, tools, model, permissions, and optional memory. They are
useful when one part of the task can be isolated from the main conversation.

I use them when isolation makes the main thread simpler, not when I want the task
to look more advanced than it is.

## Built-In Agents

Claude Code includes built-in agents such as Explore, Plan, and
general-purpose. Explore is useful for read-only investigation. Plan is useful
for design. The general-purpose agent can take on broader work when you need a
helper with tool access.

Pick the agent by job, not by novelty.

## Custom Agents

Project agents can live in `.claude/agents/`:

```md
---
name: regression-finder
description: Find the closest missing regression test for a described bug.
tools:
  - Read
  - Grep
  - Glob
model: sonnet
permissionMode: plan
---

Inspect the changed files and closest tests. Return missing coverage with file
references. Do not edit files.
```

Agent frontmatter can also control disallowed tools, MCP servers, hooks, maximum
turns, skills, effort, background behavior, and isolation.

## Background Subagents

Background subagents are useful for independent research. Current Claude Code
surfaces background subagent permission prompts in the main session, which makes
their actions easier to audit.

Give background agents a tight return contract:

```text
Return only confirmed findings, file references, and whether the main task
should stop.
```

## Agent Memory

Subagents can maintain memory. Use that for repeated specialist behavior, not for
facts that should be committed to the repository. If the memory affects future
correctness, move it into a rule, skill, test, or documentation file.

## Which Model a Subagent Runs On

The `model: sonnet` line in the custom agent above doesn't guarantee Sonnet. Four
sources can set a subagent's model, and the order between them changed in
Claude Code 2.1.251. From 2.1.251 on, for a custom agent, the first one set wins:

1. The model passed when the subagent is spawned.
2. The definition's `model:` field. `model: inherit` means the main model.
3. The `CLAUDE_CODE_SUBAGENT_MODEL` environment variable. Setting it to
   `inherit` is the same as leaving it unset.
4. The main conversation's model.

Before 2.1.251, the environment variable sat at the top and overrode everything
else. Same files, opposite answer, and no warning either way:

| `CLAUDE_CODE_SUBAGENT_MODEL=haiku`, plus... | Before 2.1.251 | 2.1.251 and later    |
| ------------------------------------------- | -------------- | -------------------- |
| A definition with `model: opus`             | Haiku          | Opus                 |
| A model passed at spawn time                | Haiku          | The spawn-time model |
| Nothing else                                | Haiku          | Haiku                |
| The variable unset, nothing else            | The main model | The main model       |

If you want the old behavior back, 2.1.257 added
`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`. It applies the environment variable's
model, or the main model if the variable isn't set, to every subagent and
ignores definitions and spawn-time models. Forks and skills running with
`model: inherit` are exempt. On 2.1.251 through 2.1.256 the flag doesn't exist,
so it silently does nothing.

The built-in agents follow their own rules:

- **Explore**: inherits the main model, capped at Opus on a subscription, a
  Console account, or an LLM gateway. Before 2.1.198 it always ran on Haiku.
- **Plan**: runs on the main model.
- **Either one**: the environment variable alone doesn't move it. With
  `FORCE` on, the variable's model applies.

A project or user agent with the same name as a built-in replaces it, and from
then on it follows the custom-agent order above.

Don't trust the order; check it. From 2.1.243, `/tasks` shows the model each
subagent actually ran on.

Last verified: 2026-10-04 against Claude Code 2.1.289.
