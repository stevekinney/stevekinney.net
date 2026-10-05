---
title: Configuring Skills
description: 'Frontmatter fields, invocation controls, and how context: fork really works, plus the skill anti-patterns that silently waste tokens or break /rewind.'
---

Most skill problems aren't about what the skill says. They're about when it loads, who can trigger it, and what it's allowed to do once it runs. All of that lives in a few lines of metadata. This lesson assumes you've read [Skills](skills.md).

## Frontmatter

Your `SKILL.md` starts with a block of YAML (a simple key-value format) between two `---` lines. That block is called _frontmatter_, and it's metadata about the skill. The fields come in three groups.

### Required

- `name`: 1–64 characters of lowercase letters, numbers, and hyphens. It matches the directory name, with no leading, trailing, or doubled hyphens.
- `description`: 1–1,024 characters stating the capability and the activation context. This is what the agent reads to decide whether to use the skill, so it carries most of the weight.

### Optional

- `license`: A license identifier or reference.
- `compatibility`: 1–500 characters describing environment requirements the body assumes.
- `metadata`: A string-to-string map. A version here is a record, not a dependency resolver. Nothing checks it.
- `allowed-tools`: The open standard marks this experimental, so support depends on the host. Claude Code reads it as pre-approval: the tools you list (actions like reading a file or running a shell command) don't prompt you for the turn that invokes the skill. A _turn_ is one round where the agent responds to a message and then waits. The grant clears when you send your next message. It grants permission and never restricts anything, and it can't override a deny rule. Workspace trust does not gate this field: an automatically invoked repository skill can preapprove commands even in `claude -p` in an untrusted clone. Review repository skills and their grants before running there. Organizations can set `allowManagedPermissionRulesOnly` in managed settings (v2.1.282+) to ignore project and personal skill grants; see the [skill permission reference](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill).

### Claude Code-specific

These are extensions. Other tools that read the same open standard may ignore them.

- `context: fork`: The body becomes the task for a fresh subagent (a helper agent with its own empty context). It needs a task, not guidelines. It runs in the background by default since v2.1.218, meaning you keep working while it runs and its result arrives later. More on this below.
- `agent: <type>`: Gives the fork that agent type's prompt, tools, and model. That can be a built-in type like `Explore` (a read-only search agent) or `Plan`, or one of your own [agent definitions](subagent-configuration.md). It does nothing without `context: fork`. No agent means `general-purpose` with every tool.
- `background`: Whether a fork runs in the background. Background edits land _outside_ `/rewind` checkpoints. (`/rewind` rolls the conversation, and optionally your files, back to an earlier point.)
- `model` and `effort`: Override the model or the reasoning effort while the skill runs. On a forked skill they apply to the fork. On a non-forked skill they apply to your main conversation.
- `arguments`: Names the inputs the skill accepts. In the body, `$ARGUMENTS` is everything typed after the skill name, `$0` and `$1` are positional, and `$name` is a named input.
- `argument-hint`: The placeholder text autocomplete shows, like `[version]`.
- `disallowed-tools`: Removes tools while the skill is active. It only applies then, so pair it with a permission rule (a setting that allows or denies specific tool calls) when a tool must never run.
- `hooks`: Registers [hooks](hooks.md) (scripts that run automatically at set points) when the skill is invoked. They _stay_ registered for the session unless the hook entry sets `once: true`, which runs it once and removes it.

## Configuring invocation

By default, both you and the agent can invoke a skill. You type `/skill-name`. The agent loads skills through the built-in `Skill` tool. Two fields narrow that:

- `disable-model-invocation: true`: The skill runs _only_ if you invoke it with a slash command (a command you type that starts with `/`). The agent never invokes it on its own. It also can't be preloaded into [subagents](subagents.md) or used as the prompt for a [desktop scheduled task](https://code.claude.com/docs/en/scheduled-tasks), a prompt the Claude desktop app runs on a schedule. The Codex equivalent, in `agents/openai.yaml`, is `policy.allow_implicit_invocation: false`.
- `user-invocable: false`: The opposite. _Only_ the agent can load the skill. It's useful for background knowledge that shouldn't clutter your slash-command menu.

Use the first for anything expensive or side-effectful, like a release pipeline.

## How `context: fork` works

The name is misleading. A skill with `context: fork` does not run in a fork of your conversation. Instead, the skill's body becomes the task prompt for a brand-new [subagent](subagents.md), a helper agent with its own empty _context_, which is everything the model can see when it decides its next step.

Here's what follows from that:

- **The fork doesn't see your conversation.** It sees the skill body and its arguments, and your `CLAUDE.md` (your instruction file) too, unless its agent type is `Explore` or `Plan`, which skip it. Write the body so it stands on its own.
- **The body must be a task.** A skill of guidelines like "use these API conventions" returns without meaningful output, because the fork has nothing to do. Invoked with no arguments, a skill that expects some is a fork with no task.
- **`agent:` picks the worker.** With no `agent:`, the fork runs as `general-purpose` with every tool. That's why a read-only investigation skill pairs well with `agent: Explore`.
- **Background forks get fewer tools.** One reported side effect is that a fork meant to fan out into its own workers silently loses the ability to spawn them. Set `background: false` if the skill needs that.
- **Background edits aren't covered by `/rewind`.** If the skill writes files, set `background: false` on purpose.
- **It doesn't fan out.** Invoking a forked skill while an earlier invocation of the same skill is still running makes the harness wait. For parallel copies, use subagents.
- **The result comes back summarized.** In the background, the result arrives as a notification that the main agent paraphrases. A fork whose final message _is_ the deliverable can lose detail, so have it write the deliverable to a file.

So, when should you fork? Fork a self-contained task that doesn't need your conversation, when you want its noise out of your context. _Don't_ fork a skill that orchestrates other work. It needs your request and conversation to make routing decisions, and a fork throws exactly that away. [Skill or Subagent?](skill-or-subagent.md) goes deeper on the choice.

## Anti-patterns

Most of these fail silently, which is what makes them expensive:

- **Near-duplicate descriptions**: Two or more skills whose descriptions overlap. The agent picks between them unpredictably.
- **Critical exclusions buried in the body**: The agent decides whether to load a skill from the description alone. Anything that only appears in the body is read too late.
- **"Read _all_ of the references"**: Sure, it will listen to you. But is that what you want? Describe the conditions under which it should read a given reference instead.
- **`agent` without `context: fork`**: The field is inert and silently ignored. You almost certainly meant to fork.
- **`model` or `effort` on a frequently invoked skill that doesn't fork**: Every invocation can force a cache-miss turn on your main conversation, meaning the provider can't reuse its saved copy of the conversation and charges full price for it. `model` always does. `effort` does only where changing effort invalidates the cache. See [Prompt Caching and Cost](caching-and-cost.md).
- **Arguments declared but never referenced**: If the body never uses `$ARGUMENTS` or a named placeholder, the input is appended to the end of the body, which is probably worse than not having it at all.
- **Arguments with no `argument-hint`**: Without it, autocomplete shows the user nothing to type.
- **`context: fork` on a file-editing skill without `background: false`**: Background fork edits land outside session checkpoints, so `/rewind` won't undo them.

## Denying access to particular skills

You have three levers:

- Deny the `Skill` tool, the built-in tool the agent calls to load a skill, to forbid it from loading _any_ skills.
- Deny a specific skill with `Skill(name)`.
- Hide a particular skill from the agent everywhere with `disable-model-invocation`.

One thing that trips people up: listing skills under a subagent's `skills:` field only _preloads_ them (loads their full text at startup). It doesn't restrict which skills that agent can reach. If you want a fence, use one of the three options above.

Set `disable-model-invocation` on anything with side effects. Fork only what's a task.
