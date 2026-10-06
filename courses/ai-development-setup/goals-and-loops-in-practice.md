---
title: Goals and Loops in Practice
description: 'Configuration, prompt-writing habits, and escalation tactics for /goal and /loop, plus a table for choosing a mechanism and a checklist for walking away.'
---

[Goals and Loops](goals-and-loops.md) explained how the two commands work. This lesson is about using them without waking up to a surprise. Most of the damage comes from a handful of settings and prompt habits, so let's start there.

## Configuration

- **`loop.md`**: A file that sets the default prompt for a bare `/loop`. Put it at `.claude/loop.md` for the project or `~/.claude/loop.md` for yourself. Edits take effect on the next run, so you can steer a loop that's already going.
- **`CLAUDE_CODE_DISABLE_CRON`**: An environment variable that turns off `/loop` and scheduling entirely. Handy for locked-down machines.
- **`CLAUDE_CODE_GOAL_CHECKIN_MINUTES`**: Sets the first check-in interval for a goal that's waiting on background work. `0` disables check-ins _and_ automatic retries.
- **`ANTHROPIC_DEFAULT_HAIKU_MODEL`**: Changes the evaluator model _and_ the model for other background work. Know that before you point it at something expensive.
- **`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`**: How many times in a row a `Stop` hook can block the agent from stopping. The default is 8.

Because the evaluator _is_ a [hook](hooks.md), two settings make `/goal` unavailable: `disableAllHooks`, which turns every hook off, and `allowManagedHooksOnly`, which limits hooks to the ones an administrator installed.

## Writing goal prompts

- **Have Claude show its evidence**: The command, the exit code, and the commit, all from _after_ the final edit. The evaluator can only judge what it can see.
- **One goal per deliverable**: If one goal holds three deliverables, a blocker on any of them keeps the whole thing open.
- **Use a command when a command will do**: If a single command settles "done," a `Stop` hook that runs it is deterministic and can't be talked into anything. If "done" takes several checks, fold them into one gate script and point `/goal` at it, as in the techniques below.

## Writing loop prompts

- Say what a quiet run should do: "If nothing changed, say so in one line."
- Spell out what done, stuck, and idle look like.
- Prefer events over polling. The Monitor tool watches for an event, and [Channels](agent-communication.md) let an outside system push one into a session. Either saves you from asking over and over.
- When idle, wait 20 to 30 minutes between runs.
- Append one log line per run to a file. It's the only record that survives `/clear`, which empties the conversation and ends any `/loop` tasks in the session.

## Why `/loop` goes wrong

Pretty much every `/loop` anti-pattern is asking it for something it doesn't have:

- Letting the model decide when it's done needs an **oracle**: a check the model can't talk its way past.
- Polling something that already sends notifications needs an **event source**.
- "Leave it running overnight" needs **durability**. A `/loop` task stops firing when its session stops. Fixed-interval tasks can return on resume while unexpired; self-paced loops must be restarted. If the work has to outlive the session, use a desktop scheduled task or cloud routine.
- Looping on a shared branch needs **isolation**. See [Worktrees](worktrees.md).
- Judgment calls on every run need a **human**.

If you recognize your plan in that list, you need a different mechanism. The table at the end of this lesson has one.

## Advanced techniques

Anthropic [describes a ladder of checks](https://code.claude.com/docs/en/best-practices), from least to most setup. (This one measures how strongly you verify the work; [The Enforcement Ladder](the-enforcement-ladder.md) measures how firmly you enforce a rule.)

1. A check in a single prompt.
2. A `/goal` condition.
3. A `Stop` hook that runs a script.
4. A verification subagent that tries to refute the result.

Some techniques worth stealing:

- **Gate script plus goal**: Write one script that runs every check and prints a pass marker along with the commit. Then make the condition "this script prints PASS." Now the evaluator has exactly one authoritative thing to read.
- **Write your own evaluator**: A prompt-based `Stop` hook is what `/goal` uses under the hood. An agent-based hook (experimental) can actually run the tests and read files.
- **Guard your `Stop` hooks**: Check `stop_hook_active`, which tells the hook its last block already forced a continuation, so it can let the agent stop this time. Respect the 8-block cap, and have the script exit `0` on its _own_ errors: a bug in your script should let the agent stop, not trap it. [Writing Good Hooks](writing-good-hooks.md) covers writing hooks that fail safely.
- **Monitor plus heartbeat**: An event wakes the loop immediately. A scheduled wakeup, the heartbeat, keeps it running if the event never comes.

When a loop outgrows the session:

- To run without you, use a cloud routine or a desktop scheduled task. See [Routines and Schedules](routines-and-schedules.md).
- For hard caps, wrap `claude -p` runs in your own script.
- For an independent verdict, use `/goal`, a `Stop` hook, or a reviewing subagent.

## More on Codex's `/goal`

Codex's version only continues when the thread goes idle. Set a token budget and it asks the model to wrap up when the budget runs out, which means stop starting new work, summarize, and leave a next step. Set none and it's unbounded, so only your account's usage limits and you can stop it. It adds edit, pause, and resume commands. And it can only report "blocked" after the same blocker repeats for three turns. One catch: `/goal` doesn't exist in `codex exec`, Codex's non-interactive mode, so you can't lean on it in CI.

The model declares completion with an `update_goal` tool call, after an audit the continuation prompt spells out. Those audit rules are worth borrowing for your own prompts. They tell the model to prove completion, not merely fail to find remaining work, and not to narrow the solution just so it passes the current tests.

## Choosing a mechanism

| Situation                                       | Use                                                |
| ----------------------------------------------- | -------------------------------------------------- |
| One edit you're watching                        | A plain prompt                                     |
| A checkable outcome that takes many turns       | `/goal`                                            |
| One command decides it's done                   | A `Stop` hook                                      |
| Watching for a change while the session is open | `/loop`, ideally with a Monitor                    |
| Must run while you're away                      | A cloud routine or desktop scheduled task          |
| Hard caps or fresh context for each attempt     | An external [Ralph loop](the-ralph-loop.md) runner |

## Before you walk away

- Is the check out of the worker's reach, so it can't edit its way to a pass?
- Are side effects limited by permission mode, branch, or worktree?
- Does it need to outlive the session, and will it?
- How will you confirm it actually stopped?

If you can't answer the last one, you aren't ready to leave.
