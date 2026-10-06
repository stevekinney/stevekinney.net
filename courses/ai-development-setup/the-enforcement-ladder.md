---
title: The Enforcement Ladder
description: 'Rules sit on rungs from asking to refusing. Pick the rung each rule needs, and cut a leg of the lethal trifecta before a prompt injection finds it.'
---

Every rule you give an agent has a strength. "Please don't touch the generated files" and "the agent can't write to that directory" are both rules, and they're nowhere near the same thing.

The mistake is putting an important rule on a weak rung and assuming it's enforced. Here's a way to tell which is which.

## The rungs

The table runs from weakest at the top to strongest at the bottom. Each rung down refuses in more places and is harder for anyone—the model, you, or a teammate—to route around. So "move a rule down" means "make it stronger."

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

- **Compaction**: Replacing the conversation so far with a summary to free up context. Details can get lost. See [Managing a Long Session](managing-a-long-session.md).
- **Auto memory**: Notes the harness saves for itself between sessions. They live on your machine, so teammates don't get them.
- **`CLAUDE.md` (or `AGENTS.md` in Codex)**: The instruction file the harness loads by directory scope. Claude Code discovers files in subdirectories on demand. See [User and Project Instructions](user-and-project-instructions.md).
- **A skill**: Packaged instructions the agent loads when a task matches. Loading is the agent's call. See [Skills](skills.md).
- **A permission rule**: A setting that allows or denies a specific tool call. The harness enforces it whatever the model decides.
- **A hook**: A script the harness runs at a set point. See [Hooks](hooks.md).
- **A required CI check**: A check continuous integration runs on every push that must pass before a merge.
- **The OS, the sandbox, or the network**: Limits outside the harness entirely, like file permissions or a blocked network route. A sandbox is operating-system-level isolation that limits which files and network the agent's shell commands can reach, no matter what the model decides.

Everything above the permission rule is a request. Everything from the permission rule down is a refusal. That's the line.

Permission rules and hooks are neighbors at the harness layer. A hook is more expressive: it can inspect content and state, which a pattern can't. A permission deny is simpler and wins any tie, because a hook's `allow` can't override it. Use the deny when a plain yes or no is enough, and the hook when the decision depends on what's inside the call.

## Which rung does this one need?

Put each rule on the weakest rung that reliably holds it.

- **Formatting** goes to a formatter, run by a hook or plain code. That's the hook rung.
- **Forbidden imports** go to the linter, enforced as a required CI check. That's the CI rung.
- **"Don't write to production"** goes to the credentials. The agent shouldn't _have_ them. That's the OS-and-network rung.
- **Judgment calls** are what prose is for.

To see how your own `CLAUDE.md` holds up, [paste it into this checker](/experiments/mechanism-picker). It tags each line as one that can stay a request or one that needs a permission rule, a hook, or a required check.

If a mistake would be expensive and a sentence is your only defense, you have a rule on the wrong rung. Move it down the table, or take away the thing that makes the mistake possible.

## A hook can fail open

Hooks are strong, but they're software, and software has bugs. Here's one of mine.

I keep my notes in a vault, a folder of Markdown files, and I wrote a guard hook, `vault-destructive-fs-guard.sh`, that blocks destructive file commands aimed at it. It had a test. It worked.

Then I had agents audit my sessions. The guard crashed whenever a line of a command began with something that looked like a flag. The classic case was a multi-line `gh pr create` (GitHub's CLI for opening a pull request) with a line starting with `--title`. On macOS, a `basename` call inside the script rejected the option-shaped word and the script died.

Here's the part that matters. A crash exits `1`, and both Claude Code and Codex treat that as a non-blocking error: the action proceeds. So the whole command went through unchecked, including a vault `rm` later in the same command. Among exit codes, only `2` blocks; the other way to block is a JSON decision printed to stdout, as the [hooks lesson](hooks.md) explains.

It crashed in 135 sessions since July. The test never caught it, because the test never fed the guard a multi-line command. Your tests are exactly as good as their inputs. I fixed it on 2026-09-23 and added regression tests for exactly that case.

The lesson isn't "don't use hooks." It's three smaller ones:

- **A hook that crashes doesn't block**: If a guard has to hold, it has to fail _closed_: catch its own errors and exit `2` on purpose. [Writing Good Hooks](writing-good-hooks.md) covers choosing failure behavior.
- **A test only covers what you fed it**: Feed guards the ugly inputs: multi-line commands, odd filenames, empty strings.
- **Check the logs**: Writing a rule down isn't enforcing it. Make the rule executable, then go look at whether it stopped anything. Non-blocking hook errors show up as a notice in the session transcript, and Claude Code's debug log records hook runs. The [hooks documentation](https://code.claude.com/docs/en/hooks) covers debugging. [Hooks in Practice](hooks-in-practice.md) has more ways guards fail.

## Blast radius

Every rung from the permission rule down is a wall the agent can't talk, trick, or reason its way past. When something goes wrong, the walls limit the damage. That's the blast radius.

Simon Willison's [lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) says an agent is exploitable when it has all three of these at once: **untrusted content** (an issue, a web page, a dependency's README, a tool result), **private data** (your code, secrets, or customers' data), and **a way out** (network access, a `git push`, a public comment). The attack is **prompt injection**: someone hides instructions in content the agent reads, and the agent follows them.

A coding agent has all three by default. Your only choice is which leg to cut, and you have to cut it structurally. Telling the agent to ignore untrusted instructions is a request made to the very faculty the payload is addressing. The same goes for auto mode: Anthropic calls its classifier "a convenience feature," not a security guarantee.

- **Cut the way out**: Default-deny network egress. `Bash(curl *)` isn't a network boundary, and an allowlisted domain that accepts uploads, like `gist.github.com`, is an exfiltration channel.
- **Isolate the whole process**: A container or virtual machine, with host credentials outside it and no sensitive data in the workspace.
- **Split readers from doers**: A read-only [subagent](subagents.md) processes the untrusted content and hands back only closed values, like a fixed set of classifications. A free-text summary can still carry the payload.
- **Watch for deferred execution**: Anything the agent writes that something _outside_ the sandbox runs later is a way out. `core.fsmonitor` in a cloned repository's `.git/config` is a command Git runs with no prompt.

### Secrets

The only safe credential is one the agent can't read. A sandbox still inherits your environment, so a token you exported before launching is one `echo` away, and a `Read(**/.env*)` deny rule is friction, not a boundary. Launch the agent with a clean environment. I don't keep credentials in my shell at all: anything that needs a token goes through a wrapper that pulls it from the macOS Keychain for that one command. If something leaks, rotate first and investigate second.

Start sandboxed, raise autonomy per repository, and keep a prompt on the irreversible stuff, like `git push`, `gh pr merge`, and `npm publish`. Put each rule on the rung that matches the damage, then verify it fires.
