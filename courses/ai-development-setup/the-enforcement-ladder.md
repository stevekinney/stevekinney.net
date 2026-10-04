---
title: The Enforcement Ladder
description: 'Rules sit on rungs from asking to refusing. Pick the rung a rule needs, and learn how one of my own guard hooks quietly failed open for months.'
---

Every rule you give an agent has a strength. "Please don't touch the generated files" and "the agent can't write to that directory" are both rules, and they're nowhere near the same thing.

The mistake is putting an important rule on a weak rung and assuming it's enforced. Here's a way to tell which is which.

## The rungs

The table runs from weakest at the top to strongest at the bottom. Going down, each rung refuses in more places and is harder for anyone to route around: the model, you, or a teammate. So "move a rule down" means "make it stronger."

| Rung                                  | What it can do                                     |
| ------------------------------------- | -------------------------------------------------- |
| Something you said in the chat        | Ask, until the next compaction, when it may vanish |
| Auto memory                           | Ask, on your machine only                          |
| `CLAUDE.md` (or `AGENTS.md` in Codex) | Ask, every session, assuming it actually loads     |
| A skill                               | Ask, if it activates                               |
| A permission rule                     | Refuse at the tool boundary                        |
| A hook                                | Refuse at one lifecycle event                      |
| A required CI check                   | Refuse for everyone, at the integration boundary   |
| The OS, the sandbox, or the network   | Refuse no matter what the model thinks             |

The glossary for that table:

- **Compaction**: Replacing the conversation so far with a summary, to free up context. Details can get lost. See [Managing a Long Session](managing-a-long-session.md).
- **Auto memory**: Notes the harness saves for itself between sessions. They live on your machine, so teammates don't get them.
- **`CLAUDE.md` (or `AGENTS.md` in Codex)**: The instruction file the harness loads at the start of every session. See [User and Project Instructions](user-and-project-instructions.md).
- **A skill**: Packaged instructions the agent loads when a task matches. Loading is the agent's call. See [Skills](skills.md).
- **A permission rule**: A setting that allows or denies a specific tool call. The harness enforces it whatever the model decides.
- **A hook**: A script the harness runs at a set point. See [Hooks](hooks.md).
- **A required CI check**: A check that continuous integration runs on every push and that must pass before a merge.
- **The OS, the sandbox, or the network**: Limits that live outside the harness entirely, like file permissions or a blocked network route. A sandbox is operating-system-level isolation that limits what files and network the agent's shell commands can reach, no matter what the model decides.

Everything above the permission rule is a request. Everything from the permission rule down is a refusal. That's the line.

Permission rules and hooks are neighbors, both at the harness layer. A hook is more expressive, because it can inspect content and state, which a pattern can't. A permission deny is simpler and wins any tie, because a hook's `allow` can't override it. Reach for the deny when a plain yes or no is enough, and for the hook when the decision depends on what's inside the call.

## Which rung does this one need?

For any rule, ask: _which rung does this one need?_ Put each rule on the weakest rung that reliably holds it.

- **Formatting** goes to a formatter, run by a hook or plain code. That's the hook rung.
- **Forbidden imports** go to the linter, enforced as a required CI check. That's the CI rung.
- **"Don't write to production"** goes to the credentials. The agent shouldn't _have_ them. That's the OS-and-network rung.
- **Judgment calls** are what prose is for.

If a mistake would be expensive and a sentence is your only defense, you have a rule on the wrong rung. Move it down the table, or take away the thing that makes the mistake possible.

## A hook can fail open

Hooks are strong, but they're software, and software has bugs. Here's one of mine.

I keep my notes in a vault, a folder of Markdown files. I wrote a guard hook, `vault-destructive-fs-guard.sh`, that blocks destructive file commands aimed at it. It had a test. It worked.

Then I had agents audit my sessions, and the audit found that the guard crashed whenever a line of a command began with something that looked like a flag. The classic case was a multi-line `gh pr create` (GitHub's command-line tool for opening a pull request) where one line started with `--title`. On macOS, a `basename` call inside the script rejected the option-shaped word and the script died.

Here's the part that matters. A crash exits `1`, and both Claude Code and Codex treat that as a non-blocking error. (Among exit codes, only `2` blocks. The other way to block is a JSON decision printed to stdout, as the [hooks lesson](hooks.md) explains.) The action proceeds. So the whole command went through unchecked, including a vault `rm` later in the same command.

It crashed in 135 sessions since July. The test never caught it, because the test never fed the guard a multi-line command. Your tests are exactly as good as their inputs. I fixed it on 2026-09-23 and added regression tests for exactly that case.

The lesson isn't "don't use hooks." It's three smaller ones:

- **A hook that crashes doesn't block**: If a guard has to hold, it has to fail _closed_: catch its own errors and exit `2` on purpose. [Writing Good Hooks](writing-good-hooks.md) covers choosing failure behavior.
- **A test only covers what you fed it**: Feed guards the ugly inputs: multi-line commands, odd filenames, empty strings.
- **Check the logs**: Writing a rule down is not the same as it being enforced. Make the rule executable, then go look at whether it actually stopped anything. Non-blocking hook errors show up as a notice in the session transcript, and Claude Code's debug log records hook runs. The [hooks documentation](https://code.claude.com/docs/en/hooks) covers debugging. [Hooks in Practice](hooks-in-practice.md) has more ways guards fail.

Put the rule on the rung that matches the damage, then verify it fires.
