---
title: CLAUDE.md, Rules, and Memory
description: >-
  Use CLAUDE.md, .claude/rules, auto memory, AGENTS.md imports, and skills as
  distinct instruction layers in Claude Code.
---

[Claude Code](https://code.claude.com/docs/en/memory) has two broad memory
systems: human-written memory and Claude-written auto memory. Both are context,
not enforcement. If something must be enforced, encode it in tests, lint,
permissions, hooks, or continuous integration.

## CLAUDE.md

`CLAUDE.md` is the main human-written project instruction file. It can live at
the repository root or under `.claude/`. User-level instructions can live at
`~/.claude/CLAUDE.md`.

Use `CLAUDE.md` for durable project guidance:

```md
# Project Instructions

- Use Bun for package management.
- Run `bun run lint` and the closest test before reporting completion.
- Do not edit generated files directly.
```

Keep it short. Link to deeper documentation instead of turning the file into a
manual.

Do not rely on local-only memory for shared project policy. If the next person
needs the instruction, put it in a versioned file.

## Imports and AGENTS.md

Claude Code supports imports with `@path` references. As of the current
documentation, Claude Code does not read [`AGENTS.md`](https://agents.md/)
directly. If a repository uses `AGENTS.md`, create a `CLAUDE.md` that imports it:

```md
@AGENTS.md
```

That keeps one shared instruction source without pretending every agent discovers
files the same way.

## .claude/rules

Rules in `.claude/rules/*.md` are useful for scoped context. They can include
frontmatter such as `paths` so the rule attaches to relevant files.

Use rules for constraints:

```md
---
paths:
  - 'src/routes/api/**/*.ts'
---

API routes must validate input at the boundary and return the shared error
shape.
```

## Skills Versus Rules

Use skills for task-specific workflows. If the instruction has phases, scripts,
references, or assets, it probably belongs in `.claude/skills/<name>/SKILL.md`
instead of a rule.

Rules shape the session. Skills run a workflow.

## Auto Memory

Auto memory is Claude-written and can help carry preferences forward, but it
should not become the only place important project behavior lives. If an auto
memory captures a real team decision, move that decision into a versioned file.

## Writing It Down Isn't Enforcing It

Everything on this page so far can only _ask_. Claude reads `CLAUDE.md`, weighs it against everything else in the context window, and usually does what it says. Usually. A long session, a compaction, or a task that seems to pull the other way, and "Never read `.env` files" becomes a suggestion that lost an argument.

That's fine for most of what belongs in `CLAUDE.md`. "Run `bun run lint` and the closest test before reporting completion" is a judgment call, and prose is the right place for judgment calls. It's not fine for the rules that have to hold every time. Those need something that can _refuse_.

I think of it as a ladder. The bottom rungs ask: something you said in chat, auto memory, project instructions, and skills. The top rungs refuse: [permission rules](/courses/ai-development/claude-code-permissions), [hooks](/courses/ai-development/claude-code-hooks), required checks in continuous integration, and the operating system itself.

| Mechanism                           | Who triggers it                                                          | Can it refuse?                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Prompt in chat                      | You, once                                                                | No, and compaction can summarize it away                                             |
| `CLAUDE.md` and `.claude/rules`     | Claude Code loads them at session start, or when matching files are read | No                                                                                   |
| Skill                               | Claude, when it decides the skill is relevant, or you, by invoking it    | No, and it has to activate first                                                     |
| Permission deny rule                | Claude Code, on every matching tool call                                 | Yes. The call never runs, whatever the model wants.                                  |
| Hook                                | Claude Code, every time its event fires                                  | Yes, on events that can block, such as `PreToolUse`. Exit code `2` stops the action. |
| Required CI check                   | Your CI, on every pull request                                           | Yes, for everyone, humans included                                                   |
| Sandbox, network rules, credentials | The operating system                                                     | Yes. The agent can't use a credential it never had.                                  |

The useful question for every line in your `CLAUDE.md` is: which rung does this one need? Formatting belongs in the formatter, wired to a `PostToolUse` hook so it runs after every edit instead of whenever Claude remembers. "Never read `.env` files" belongs in a deny rule such as `Read(./.env*)`. "Don't push to `main`" belongs in branch protection. "Don't touch production" belongs in the credentials: the agent shouldn't have them.

Even the refusing rungs have edges, so pick the one that matches the risk. A `Read` deny rule covers Claude's file tools, not every shell command that could print the same file, which is why secrets ultimately belong behind the sandbox or out of the environment entirely. And a hook only refuses on the event it's attached to.

If you want to see how your own file holds up, [paste it into this checker](/experiments/mechanism-picker). It tags each line as one that can stay a request or one that should be a permission rule, a hook, or a required check. The heuristics are crude, but the question isn't: if it matters, make it executable.
