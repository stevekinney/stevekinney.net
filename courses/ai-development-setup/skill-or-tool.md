---
title: Skill or Tool?
description: 'A tool is something the harness can do; a skill is instructions for how to do it well. Learn what a tool call actually is and what it costs you.'
---

You want the agent to check a package registry before upgrading a dependency. Do you write a skill? Install an MCP server (a program that adds tools to the harness)? Write a script? The question sounds like it has one right answer. It's really two questions mixed together: _can_ the agent do the thing, and does it know how to do it well?

## What counts as a tool

Your harness comes with a set of built-in **tools**: the actions the agent can take. They come in flavors like `WebFetch`, `WebSearch`, `Read`, `Write`, and `Bash`. (The harness is the program wrapped around the model. [Claude Code](https://code.claude.com/docs/en/overview) and [Codex](https://developers.openai.com/codex) are two of them.)

If you're using one of those, you can't _really_ add tools to the harness. That's only half-true, so bear with me. You can do two things:

- Install a command-line program and instruct the harness to call it through the `Bash` tool.
- Install an MCP server, which adds tools to the harness over the [Model Context Protocol](https://modelcontextprotocol.io/).

Honestly, this is mostly pedantic. A skill can include a script, and then the `Bash` tool can call that script. So when we say "tool" in this course, we mean any action the agent can take: the built-ins, plus anything you added, whether that's a command-line program run through `Bash` or a tool an MCP server provides.

## Tool versus skill

With that said, the distinction for our purposes looks a little something like this:

- **Tool**: Query package registry data.
- **Skill**: Interpret version changes, reproduce them, and report compatibility risk.

A tool is something the harness _can do_. A skill is instructions about _how_ to do that given thing well. A tool without a skill gives the agent a capability and no judgment. A skill without a tool is advice the agent has no way to act on.

If you're deciding whether a recurring piece of work should be a [skill](skills.md) or a [subagent](subagents.md), that's a different question. [Skill or Subagent?](skill-or-subagent.md) covers it.

## Anatomy of a tool call

It's worth knowing what actually happens when an agent "uses a tool," because it explains a bunch of behavior that otherwise seems arbitrary. There are four steps:

1. **Definition**: Every tool has a name, a description, and a JSON schema for its input (a machine-readable description of the arguments it accepts). These live up front with the system prompt (the harness's built-in instructions to the model), so every built-in tool, and every tool you add, costs tokens on every request, whether or not it ever gets called. MCP tools are the exception by default, as you'll see below.
2. **Call**: The model doesn't run anything. It emits a structured request: this tool, with these arguments.
3. **Execution**: The harness checks permissions and runs any [hooks](hooks.md) (scripts it runs automatically at set points), then runs the tool.
4. **Result**: The output is appended to the conversation as a tool result, and the model reads it when it decides its next step.

A few implications fall out of that:

- **The description _is_ the interface**: The model decides whether and how to call a tool based entirely on its name, description, and schema. A vague description means a tool that gets misused or never gets used.
- **Tool definitions sit in the cached prefix**: The provider caches the start of the conversation, and tool definitions are part of it. Adding or removing tools mid-session can invalidate your [prompt cache](caching-and-cost.md). That's why Claude Code defers MCP tool definitions behind tool search by default, loading each one on demand, which keeps their cost off every request.
- **The result is just more text in the context**: Context is everything the model can see when it decides its next step. A result becomes part of it, which means it costs tokens, it can get truncated, and it can contain instructions the model might follow. Content that arrives through a tool result is untrusted input. We'll look at what that means in [Blast Radius](blast-radius.md).

Install the tool for the capability. Write the skill for the judgment.
