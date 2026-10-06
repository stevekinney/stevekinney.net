---
title: Sentinels
description: 'A sentinel is a marker whose presence ends a loop or unlocks an action. Learn the two kinds, how to rank their strength, and how each one fails.'
---

Agents don't remember anything between sessions, and they don't know what each other are doing. At some point you need one piece of information to cross that gap: "the review finished," "this task is done," "this change was approved." The simplest way to do that is almost embarrassingly low-tech. You use some kind of external state, and it can literally be a text file.

Here's an example. A few reviewer [subagents](reviewing-agent-work.md) each read a diff. When they finish, something writes a marker that records they reviewed _this exact_ set of changes. Now anything that wants to know whether the current changes were reviewed can check for the marker instead of asking an agent.

## What a sentinel is

A slightly more formal definition: a **sentinel** is a marker whose presence ends a loop or unlocks an action. That's a string in the output or a file on disk. It inherits the classic sentinel-value flaw, too. If real data can look like the sentinel, the loop stops early.

That flaw is the whole lesson in miniature. A sentinel is only as trustworthy as the difficulty of producing it by accident, or on purpose.

## Two kinds of sentinel

- **Completion sentinel**: A string the model writes into its own output, like `<promise>COMPLETE</promise>`. The loop wrapping the agent (a bash loop or a `Stop` [hook](hooks.md), a script the harness runs when the agent finishes a turn) searches the output for it.
- **File sentinel**: A file on disk that outlives the session. A later session, a hook, or a scheduler reads it to decide whether to resume or proceed.

They fail in opposite ways. A string is easy to emit by accident, but a false one dies with the transcript. A model doesn't create a file by accident the way it can print a sentence, but a false file _persists_ and gets trusted by a reader with none of the original context. (Code can write a file for the wrong reason, too. [Designing Sentinels](designing-sentinels.md) has an example.)

## How strong is your marker?

Here's the one test that governs both: **a good marker is at least as hard to satisfy as the work it stands for.** This first list ranks _markers_, separate tokens that claim the work is done. From weakest to strongest:

1. `touch done`.
2. A promise string.
3. A `"passes": true` field in a JSON file.
4. A test suite's exit code.
5. A check of the files on disk, plus tests the agent can't edit.
6. A marker written by an independently protected writer, CI job, or human.

`touch done` is weakest because it costs the agent nothing. Any process can create a file at any time, and a later reader just finds it. Item 6 is strongest only when the agent cannot write the marker or alter the writer, its dependencies, or its configuration. A repository hook the agent can edit does not meet that condition. [Designing Sentinels](designing-sentinels.md#keeping-the-agent-away-from-the-marker) covers protecting both the marker and its writer.

The second list ranks _exit conditions_, the things that tell a loop to stop. Again from weakest to strongest:

1. A string in the output.
2. A tool call that declares completion.
3. A separate model judging the transcript.
4. An agent hook that inspects the repository.
5. A deterministic check, like an exit code, a `jq` query, or an empty diff.
6. A validated artifact: its contents satisfy the contract and its downstream checks pass.

A ported module can exist without compiling, and a generated report can be empty or partial. File presence only tells you that something was written. Validate the artifact's contents and behavior before using it as an exit condition. An empty marker written by a trusted external process can record a completed check, but it is still a claim about that check: bind it to the exact artifact and verify the evidence it represents.

Always know which one you're relying on.

## How completion sentinels work

Each harness wires this up a little differently:

- **A bash loop**: A fresh process every pass. Run the agent, do a substring match on its output for the token, and exit non-zero when the iteration cap is hit. (This is the [Ralph loop](the-ralph-loop.md).)
- **The `ralph-wiggum` plugin**: [Anthropic's Ralph loop plugin](https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/README.md). You start it with `/ralph-loop "<prompt>" --max-iterations <n> --completion-promise "<text>"`. A `Stop` hook returns `{"decision":"block","reason":<the same prompt>}` until the promise matches or the cap is reached.
- **Claude Code's `/goal`**: A small model returns met, not yet met, or impossible after each turn. See [Goals and Loops](goals-and-loops.md).
- **Codex's `/goal`**: The model declares completion through an `update_goal` tool call, after an audit spelled out in the continuation prompt. A token budget, if you set one, only asks the model to wrap up. Without one, nothing but your account's usage limits and you stops it.
- **`Stop` hooks in general**: Returning `decision: block` keeps the agent working. Checking `stop_hook_active` (a flag meaning this hook's last block already forced a continuation) lets the hook allow the stop the second time, which turns the gate into a single nudge. Read `last_assistant_message`, not the transcript, which can lag behind the current turn.

The plugin's matching is weaker than it looks. The comparison itself is strict, but it can't tell a declaration from a mention:

- It takes the _first_ promise tag pair in the last message, collapses whitespace, and compares the text inside to your `--completion-promise` exactly.
- A sentence that merely _mentions_ the promise, tags included, still matches. The plugin only looks for the tags, not for whether the model meant it.
- A bare `DONE` can match too. If the last message is just that word, the plugin's regex falls back to comparing the whole message.
- `--max-iterations` defaults to unlimited. Always set it, with a space and not `=`. `--max-iterations=5` gets silently read as part of the prompt.

Other harnesses are moving toward "finish as a tool call": OpenHands has `finish`, and Codex has `update_goal`. Claude Code's self-paced `/loop` works the same way: it re-arms itself with a `ScheduleWakeup` tool call, and calling it with `stop: true` ends the loop. The model still decides, but through a structured action that's harder to emit by accident than a sentence.

## How file sentinels work

Why disk at all? A new session needs state it can read independently of the old context. A [SessionEnd hook](https://code.claude.com/docs/en/hooks#sessionend) can save a handoff file or other external state when the session terminates. It cannot block termination or inject JSON output, and its default execution budget is only 1.5 seconds, so keep the write small and verify it completed. A `Stop` hook can instead checkpoint after each turn; label those records as intermediate so they do not overwrite a final handoff as if the task were complete. Read the saved state in `SessionStart`, whose `startup`, `resume`, `clear`, `compact`, and `fork` matchers tell you how the session began.

There are three shapes of file, and they're good at different things:

- **An empty marker**: For a gate. Its existence is the whole message.
- **A structured JSON payload**: Records the outcome.
- **A prose progress file**: Orients the next agent. Never gate on it.

The best design splits them. Use an empty marker for the gate, with a payload sitting beside it for the audit trail.

Then decide which one you're building:

- **A handoff** only orients the next agent. If it's missing or broken, carry on with less context. Handoffs _fail open_.
- **A gate** controls whether an action proceeds. If it's missing, malformed, stale, or keyed wrong, deny. Gates _fail closed_. Anything the gate can't interpret never becomes "allow." Deny it, or ask a human, depending on whether a person could resolve it.

Record the result, not just "done." Let a status field say `passed`, `failed`, `blocked`, or `aborted`. That's exactly how [Stripe's idempotency keys](https://stripe.com/blog/idempotency) work: the stored record says what happened the first time, so a retry doesn't have to guess.

[Designing Sentinels](designing-sentinels.md) covers how to name, write, and protect these files. Whatever you build, never let the agent write its own approval.
