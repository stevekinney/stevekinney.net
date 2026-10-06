---
title: Sentinels
description: 'A sentinel is a marker whose presence ends a loop or unlocks an action. The two kinds, how to rank them, and how to key, write, and protect them.'
---

Agents don't remember anything between sessions, and they don't know what each other are doing. Sooner or later you need one fact to cross that gap: "the review finished," "this task is done," "this change was approved." The simplest fix is almost embarrassingly low-tech: external state, which can literally be a text file.

Here's an example. A few reviewer [subagents](verification-and-evidence.md#agent-reviewers) each read a diff. When they finish, something writes a marker recording that they reviewed _this exact_ set of changes. Anything that needs to know whether the current changes were reviewed checks the marker instead of asking an agent.

## What a sentinel is

More formally, a **sentinel** is a marker whose presence ends a loop or unlocks an action: a string in the output or a file on disk. It inherits the classic sentinel-value flaw. If real data can look like the sentinel, the loop stops early.

That flaw is the whole lesson in miniature. A sentinel is only as trustworthy as the difficulty of producing it by accident, or on purpose.

## Two kinds of sentinel

- **Completion sentinel**: A string the model writes into its own output, like `<promise>COMPLETE</promise>`. The loop wrapping the agent searches the output for it. That loop is a bash script or a `Stop` [hook](hooks.md), a script the harness runs when the agent finishes a turn.
- **File sentinel**: A file on disk that outlives the session. A later session, a hook, or a scheduler reads it to decide whether to resume or proceed.

They fail in opposite ways. A string is easy to emit by accident, but a false one dies with the transcript. A model doesn't create a file by accident the way it can print a sentence, but a false file _persists_ and gets trusted by a reader with none of the original context. (Code can write one for the wrong reason, too. See [the four-outcomes trap](#anti-patterns).)

## How strong is your marker?

One test governs both: **a good marker is at least as hard to satisfy as the work it stands for.** This first list ranks _markers_, the tokens that claim the work is done, from weakest to strongest:

1. `touch done`.
2. A promise string.
3. A `"passes": true` field in a JSON file.
4. A test suite's exit code.
5. A check of the files on disk, plus tests the agent can't edit.
6. A marker written by an independently protected writer, CI job, or human.

`touch done` is weakest because it costs the agent nothing: any process can create it at any time. Item 6 is strongest only when the agent cannot write the marker or alter the writer, its dependencies, or its configuration. A repository hook the agent can edit does not meet that condition. [Keeping the agent away from the marker](#keeping-the-agent-away-from-the-marker) covers protecting both the marker and its writer.

The second list ranks _exit conditions_, the things that tell a loop to stop, in the same order:

1. A string in the output.
2. A tool call that declares completion.
3. A separate model judging the transcript.
4. An agent hook that inspects the repository.
5. A deterministic check, like an exit code, a `jq` query, or an empty diff.
6. A validated artifact: its contents satisfy the contract and its downstream checks pass.

File presence only tells you something was written. A ported module can exist without compiling, and a generated report can be empty or partial, so validate an artifact's contents and behavior before you treat it as an exit condition. Even an empty marker from a trusted external process is still a claim about a check: bind it to the exact artifact and verify the evidence behind it.

Always know which one you're relying on.

## How completion sentinels work

Each harness wires this up a little differently:

- **A bash loop**: A fresh process every pass. Run the agent, do a substring match on its output for the token, and exit non-zero when the iteration cap is hit. (This is the [Ralph loop](the-ralph-loop.md).)
- **The `ralph-wiggum` plugin**: [Anthropic's Ralph loop plugin](https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/README.md). You start it with `/ralph-loop "<prompt>" --max-iterations <n> --completion-promise "<text>"`. A `Stop` hook returns `{"decision":"block","reason":<the same prompt>}` until the promise matches or the cap is reached.
- **Claude Code's `/goal`**: A small model returns met, not yet met, or impossible after each turn. See [Goals and Loops](goals-and-loops.md).
- **Codex's `/goal`**: The model declares completion through an `update_goal` tool call, after an audit spelled out in the continuation prompt. [More on Codex's `/goal`](goals-and-loops-in-practice.md#more-on-codexs-goal) covers its budget.
- **`Stop` hooks in general**: Returning `decision: block` keeps the agent working. `stop_hook_active` means this hook's last block already forced a continuation. Checking it lets the hook allow the second stop, which turns the gate into a single nudge. Read `last_assistant_message`, not the transcript, which can lag behind the current turn.

The plugin's comparison is strict, but it can't tell a declaration from a mention:

- It takes the _first_ promise tag pair in the last message, collapses whitespace, and compares the text inside to your `--completion-promise` exactly.
- A sentence that merely _mentions_ the promise, tags included, still matches.
- A bare `DONE` can match too. If the last message is just that word, the plugin's regex falls back to comparing the whole message.
- `--max-iterations` defaults to unlimited. Always set it, with a space and not `=`. `--max-iterations=5` gets silently read as part of the prompt.

Other harnesses are moving toward "finish as a tool call": OpenHands has `finish`, and Codex has `update_goal`. Claude Code's self-paced `/loop` works the same way: it re-arms itself with a `ScheduleWakeup` tool call, and calling it with `stop: true` ends the loop. The model still decides, but through a structured action that's harder to emit by accident than a sentence.

## How file sentinels work

Why disk at all? A new session needs state it can read without the old context. A [SessionEnd hook](https://code.claude.com/docs/en/hooks#sessionend) can save a handoff file when the session terminates. It can't block termination or inject JSON output, and its default execution budget is only 1.5 seconds, so keep the write small and verify it completed. A `Stop` hook can checkpoint after each turn instead. Label those records as intermediate so they don't overwrite a final handoff. Read the saved state in `SessionStart`, whose `startup`, `resume`, `clear`, `compact`, and `fork` matchers tell you how the session began.

Files come in three shapes:

- **An empty marker**: For a gate. Its existence is the whole message.
- **A structured JSON payload**: Records the outcome.
- **A prose progress file**: Orients the next agent. Never gate on it.

The best design pairs an empty marker for the gate with a payload beside it for the audit trail. Then decide which one you're building:

- **A handoff** only orients the next agent. If it's missing or broken, carry on with less context. Handoffs _fail open_.
- **A gate** controls whether an action proceeds. If it's missing, malformed, stale, or keyed wrong, deny. Gates _fail closed_: anything the gate can't interpret is a denial, or a question for a human if a person could resolve it.

Record the result, not just "done": a status field that says `passed`, `failed`, `blocked`, or `aborted`. That's how [Stripe's idempotency keys](https://stripe.com/blog/idempotency) work: the stored record says what happened the first time, so a retry doesn't have to guess.

## Designing sentinel files

A sentinel file is a tiny piece of infrastructure, and tiny infrastructure fails in tiny, specific ways. A half-written file. A stale approval that still looks fresh. An agent that quietly wrote its own pass. What follows is each failure and its fix. The examples keep sentinel files in `.agent-state/`. The name is arbitrary; what matters is that the agent can't write there.

### Keying, writing, and reading markers

- **Key the name to the inputs**: Name each marker after a hash of everything that matters: the procedure version, the inputs, the Git tree hash (the hash Git computes for the exact contents of the files in a commit), the lockfile. A stale marker then has a different name and is simply _absent_. That beats checking for staleness.
- **Never key on modification time**: Clones, [worktrees](worktrees.md), and containers scramble timestamps while the content stays exactly the same.
- **Write atomically**: Write a temp file in the same directory, then rename it into place. Writing JSON with a plain `>` redirect is how you end up with half a file.
- **Claim one-time markers with `ln` or `O_EXCL`**: Both fail if the claim already exists. `mv` overwrites silently, so it can't do this job.
- **Read defensively**: Reject symlinks, cap the file size, require a schema version, and treat anything you can't parse as absent.
- **Never `cat` a gate marker into the context**: Write your own fixed text instead, or the file becomes a way to inject instructions. A handoff note _is_ meant for the next agent, so validate it and treat its contents as information, not instructions.
- **Locate files with the hook's `cwd` or `git rev-parse --show-toplevel`**: `$CLAUDE_PROJECT_DIR` stays at the original project root, so parallel worktrees end up sharing one path. (Codex has no root variable at all.)

### Keeping the agent away from the marker

If the agent can write its own approval, the gate is an honor system, and no clever filename changes that. The **writer** is whatever creates the marker: a hook, a CI job, or your own script. Move it out of the agent's reach, in layers:

- **Deny `Edit(/.agent-state/**)` in project permissions**: Put this in `.claude/settings.json` or `.claude/settings.local.json`, and start the session at the project or worktree root. The leading slash anchors to the settings source: in user settings it would protect `~/.claude/.agent-state`, not the project marker. Verify a direct file-tool write is denied in every worktree. On its own, a path deny rule is friction, not a boundary. See the [Read and Edit path rules](https://code.claude.com/docs/en/permissions#read-and-edit).
- **Add a sandbox `denyWrite` for the directory**: A sandbox is operating-system-level isolation for the agent's shell commands. This rule only covers Bash and PowerShell commands and their children, not `Edit` or `Write`.
- **Set `allowUnsandboxedCommands: false`**: Otherwise, a denied command can just be retried outside the sandbox.
- **Protect the writer and its configuration**: Command hooks run with the user's full permissions, as the [hook security reference](https://code.claude.com/docs/en/hooks#security-considerations) explains. Running outside the sandbox doesn't help if the executable lives in the agent-writable repository. Keep the writer, its dependencies, and its configuration outside every agent-writable root, protected from both file tools and subprocesses. If they must stay in the repository, deny edits and OS-protect those paths too. The gate is a boundary only when the agent can alter neither the marker nor the code and configuration that write it.

Test every gate negatively: delete the marker, attempt the action, and assert the denial. Then try to modify the writer and its configuration through both file tools and a subprocess. Every attempt must fail. A passing run proves nothing, because a gate that allows everything passes too.

### Best practices

- **Layer the exits**: Use a cap that's always on (iterations, dollars, a stall detector, the same error repeating, the hook block cap). Add a check of the world that actually decides. Then add a sentinel that may only end the loop early when that check agrees.
- **Use distinct endings**: `COMPLETE`, cap reached, `BLOCKED`, needs a decision. Put the signal alone on the last line, give each one its own exit code, and make the loop report which one fired. Endings say _why the loop stopped_; the marker statuses in [How file sentinels work](#how-file-sentinels-work) say _what a check found_. Keep the two vocabularies separate. A Ralph loop's [typed exit codes](the-ralph-loop.md#the-oracle-is-load-bearing) are the same idea as endings, applied to the process.
- **Give the agent an honest way out**: [ImpossibleBench](https://arxiv.org/abs/2510.20270) builds coding tasks whose tests contradict the written spec, so any pass means the agent exploited the tests. Giving GPT-5 a `flag_for_human_intervention` option cut that cheating from 54% to 9%. "Do not lie to exit" with no `BLOCKED` path makes lying the only way out.
- **Check the cheaper alternatives first**: Each of these is easier to trust than a file nobody can re-derive, so try them in order:
  1. Re-derive the fact.
  2. A Git note, which attaches a fact to a commit without changing it.
  3. A Git tag.
  4. A real database or queue.
  5. The issue tracker.
  6. A lock, if all you need is "only one worker does this at a time."
  7. _Then_ a sentinel file.

### Anti-patterns

- **The string as the only exit**: The model controls the verdict.
- **Searching all of the output for the token**: Any mention of it, or an echoed prompt, ends the run. The bash loop in [How completion sentinels work](#how-completion-sentinels-work) does a substring match too. That's only safe when the token is distinctive, it's alone on the last line, and a real check backs it up.
- **One string standing for every outcome.**
- **A cap nobody enforces**: [One run](https://github.com/anthropics/claude-code/issues/18646) made it past iteration 459 after its cap was silently ignored. (The [1,966-attempt story](the-ralph-loop.md#governors-are-your-problem) is another one.)
- **"Please don't cheat" in the prompt**: [METR measured](https://metr.org/blog/2025-06-05-recent-reward-hacking/) a model gaming the scorer on one task in 80% of runs. With "Please do not cheat" added, it was still 80%.
- **Committing gate sentinels**: A cloned repository can arrive with an approval already in it.
- **Using a sentinel as the only record of something irreversible**: If the file is lost or forged, you can't re-derive what happened.
- **Treating a progress file as proof.**
- **Spin loops**: Goals that never accept "done." [One Codex user found](https://github.com/openai/codex/issues/44909) that 1.4% of their goal sessions used 49% of their input tokens.
- **The four-outcomes trap**: A genuine approval, a forced approval at the round cap (a review loop's maximum number of back-and-forth rounds), a write while the reviewer was down, and a human override all produced the _same_ zero-byte file. Every path that isn't a genuine approval has to leave a distinct marker, and the gate has to deny on it. My [committee-review skill](committee-review.md#what-gets-harder) is a working example of walking into this one.

### Advanced techniques

- **Dual condition**: The sentinel and the check have to agree. Log every premature claim, and you get a false-completion rate you can actually track.
- **Proof-carrying markers**: The marker holds a digest of the reviewer's response, a handle the gate can re-query itself, or a signature from outside the sandbox. Now a marker that exists but _doesn't_ verify is positive evidence of gaming, not just a missing approval.
- **Fallback approvals**: If there's no approval for the exact tree, fall back to one for the tree of the parent commit and review only the diff. (Nobody seems to be shipping this yet.)
- **Git notes for commit-scoped facts**: "I already reviewed this commit."
- **Validated artifacts**: The work product can serve as the record, but only after its contents and downstream checks satisfy the contract. An empty or partial file is not completion evidence; verify it before resuming or accepting it.
- **Control channels from you to the loop**: Editing `loop.md` steers a running `/loop`. A stop file like `.ralph/STOP` is a kill switch the loop checks every iteration.

### When a scheme has already failed

Do these in order:

1. Deny the gated tool structurally.
2. Find the blast radius: which actions were approved by suspect markers?
3. Quarantine the suspect markers. Don't delete them. They're evidence.
4. Re-derive the markers. Never repair one by hand.
5. Redesign before you resume.

**A persisted claim has to be independently checkable.** The string says the model _thinks_ it's done. The file says someone _once_ thought so. Only a check you run right now says it's true. Whatever you build, never let the agent write its own approval.
