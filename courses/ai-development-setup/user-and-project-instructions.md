---
title: User and Project Instructions
description: 'Instruction files should cut ambiguity, not become a second spec. Write operational facts, know the scopes, and use permissions for real boundaries.'
---

Every project eventually grows an instruction file. It starts as five useful lines. A year later, it's four hundred lines of history, opinions, and half-obsolete advice, and nobody, human or agent, can say which of them still matter.

The fix is keeping that file small, specific, and honest about what it can't do.

## What the files are

Claude Code reads a Markdown file called `CLAUDE.md` at the start of every session. ([Codex](https://developers.openai.com/codex), OpenAI's coding harness, reads [`AGENTS.md`](https://developers.openai.com/codex/guides/agents-md) the same way. Recent Claude Code versions also fall back to `AGENTS.md`, but only when there's no `CLAUDE.md` or `CLAUDE.local.md` in your working directory or above it.) I'll call whichever one your harness reads the _instruction file_. The harness is the program wrapped around the model, and a _session_ is one conversation with the agent. Anything in those files is loaded into the model's context before you type a word. Claude Code's [memory documentation](https://code.claude.com/docs/en/memory) has the loading rules.

They should reduce ambiguity. They should _not_ become a second, drifting specification.

## Scopes

You have a few layers to work with, from broad to narrow:

- **User scope**: Personal defaults across all your projects.
- **Repository scope**: Shared architecture and commands for everyone working in this codebase.
- **Directory scope**: Local rules for one subtree. You can nest an instruction file in a subdirectory.
- **Task prompt**: The immediate goal and, ideally, the acceptance test.

You can also keep private preferences out of the shared file. In Claude Code, `CLAUDE.local.md` is loaded alongside `CLAUDE.md`, and you add it to `.gitignore`. In Codex, `AGENTS.override.md` _replaces_ `AGENTS.md` at its level, so it has to carry everything from the file it hides.

What happens when two scopes disagree? Codex puts the files closest to your working directory last, and later guidance wins. Claude Code concatenates the files instead of overriding, and its documentation says that when two conflict, Claude may pick one arbitrarily. So don't write a conflict and trust precedence to settle it. Keep the scopes from contradicting each other.

## Write operational facts

You've probably heard this before, but just in case: prefer operational facts.

- "Run `pnpm test:billing` from `apps/api`" is a usable instruction.
- "Maintain high quality" is difficult to test and difficult to act on.

A good shape to think in is three parts:

> When `$trigger`, do `$action`, then verify `$result`.

A more practical version:

> When editing invoice serialization, update the contract fixture and run its check.

Even better is a short list:

> - Before editing billing code, read `docs/billing-invariants.md`.
> - Run `pnpm test:billing` after changes.
> - Do not change public invoice fields without updating the API contract.

Notice how specific these are. Each one tells the agent what to do, and most tell it how to know it worked. That's the same idea as a [task contract](planning-and-task-contracts.md), just scoped to a whole area of the codebase.

## Instructions are not security boundaries

"Never read `.env`" is an instruction. It's not a guarantee. The model usually follows it, and the one time it doesn't, nothing stops it.

When you need a real boundary, use permissions: settings that allow or deny specific tool calls, which the harness enforces whatever the model decides. We'll sort out when to use each in [The Enforcement Ladder](the-enforcement-ladder.md), and [Blast Radius](blast-radius.md) covers the damage an agent can do when a boundary is missing.

## The giant living wiki

The _giant living wiki_ is what an instruction file turns into when everything gets dumped in it and nobody prunes it. You don't want to put _everything_ in the instruction file. Too much always-loaded detail hides the few rules that _do_ matter.

Instead, tell the agent how and where to look for project documentation, and how to decide whether it should go looking for more. A short pointer ("billing rules live in `docs/billing-invariants.md`; read it before touching billing code") beats pasting the document in.

If a block of instructions only applies to one kind of task, that's a signal. It might belong in a [skill](skills.md), which loads on demand instead of every time.

## Personal configuration in a shared repository

Instruction files are Markdown the model reads. _Settings_ files are different: they're JSON (TOML in Codex) that configure the harness itself, including permission rules, hooks, and environment variables. Sometimes you want settings that are yours alone, on top of whatever's checked into the repository. Claude Code gives you `.claude/settings.local.json` for that, and it keeps the file out of Git when it creates it. Here's how the pieces line up across the two tools:

| Claude Code                   | Codex                  | Purpose                                                      |
| ----------------------------- | ---------------------- | ------------------------------------------------------------ |
| `.claude/settings.local.json` | `.codex/config.toml`   | Project-level settings (the Claude Code file is yours alone) |
| `CLAUDE.local.md`             | `AGENTS.override.md`   | Personal project instructions                                |
| `CLAUDE.md`                   | `AGENTS.md`            | Shared project instructions (the instruction file)           |
| `~/.claude/settings.json`     | `~/.codex/config.toml` | User and global configuration                                |
| `~/.claude/CLAUDE.md`         | `~/.codex/AGENTS.md`   | User and global instructions                                 |

The [Claude Code settings documentation](https://code.claude.com/docs/en/settings) lists where each file is read from.

> [!TIP] Repository-scoped skills without committing them
> If you're working in a shared repository and want your own repository-scoped skills or configuration, add them to `.git/info/exclude`. It works like `.gitignore`, except the file lives inside your local `.git` directory, so it's never checked in and nobody else sees it.

The best instruction file is the shortest one that still prevents the mistakes you keep seeing.
