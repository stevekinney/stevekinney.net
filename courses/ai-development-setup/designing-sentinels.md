---
title: Designing Sentinels
description: 'Key markers to their inputs, write them atomically, read them defensively, and keep the agent from writing its own approval. Then audit a failed scheme.'
---

A [sentinel](sentinels.md) file is a tiny piece of infrastructure, and tiny infrastructure fails in tiny, specific ways. A half-written file. A stale approval that still looks fresh. An agent that quietly wrote its own pass. This lesson is the list of those failures and the fix for each. The examples keep sentinel files in a directory called `.agent-state/`. The name is arbitrary. What matters is that the agent can't write there.

## Keying, writing, and reading markers

- **Key the name to the inputs**: Name each marker after a hash of everything that matters: the procedure version, the inputs, the Git tree hash (the hash Git computes for the exact contents of the files in a commit), the lockfile. A stale marker then has a different name and is simply _absent_. That beats checking for staleness.
- **Never key on modification time**: Clones, [worktrees](worktrees.md), and containers scramble timestamps while the content stays exactly the same.
- **Write atomically**: Write a temp file in the same directory, then rename it into place. Writing JSON with a plain `>` redirect is how you end up with half a file.
- **Claim one-time markers with `ln` or `O_EXCL`**: Both fail if the claim already exists. `mv` overwrites silently, so it can't do this job.
- **Read defensively**: Reject symlinks, cap the file size, require a schema version, and treat anything you can't parse as absent.
- **Never `cat` a gate marker into the context**: Write your own fixed text into the context instead of the file's contents. Otherwise the file becomes a way to inject instructions. A handoff note _is_ meant to be read by the next agent, so validate it first and treat what it says as information, not as instructions.
- **Locate files with the hook's `cwd` or `git rev-parse --show-toplevel`**: `$CLAUDE_PROJECT_DIR` stays at the original project root, so parallel worktrees end up sharing one path. (Codex has no root variable at all.)

## Keeping the agent away from the marker

If the agent can write its own approval, the gate is an honor system. No clever filename changes that. The **writer** is whatever creates the marker: a hook, a CI job, or your own script. Move the writer out of the agent's reach, in layers:

- **Deny `Edit(/.agent-state/**)` in project permissions**: Put this in `.claude/settings.json` or `.claude/settings.local.json`, and start the session at the project or worktree root. The leading slash anchors to the settings source: in user settings it would protect `~/.claude/.agent-state`, not the project marker. Verify a direct file-tool write is denied in every worktree. On its own, a path deny rule is friction, not a boundary. See the [Read and Edit path rules](https://code.claude.com/docs/en/permissions#read-and-edit).
- **Add a sandbox `denyWrite` for the directory**: A sandbox is operating-system-level isolation for the agent's shell commands. This rule only covers Bash and PowerShell commands and their children, not `Edit` or `Write`.
- **Set `allowUnsandboxedCommands: false`**: Otherwise, a denied command can just be retried outside the sandbox.
- **Put the writer outside the sandbox**: That, plus the three above, is an actual boundary.

Test every gate negatively: delete the marker, attempt the action, and assert the denial. A passing run proves nothing, because a gate that allows everything passes too.

## Best practices

- **Layer the exits**: Use a cap that's always on (iterations, dollars, a stall detector, the same error repeating, the hook block cap). Add a check of the world that actually decides. Then add a sentinel that may only end the loop early when that check agrees.
- **Use distinct endings**: `COMPLETE`, cap reached, `BLOCKED`, needs a decision. Put the signal alone on the last line, give each one its own exit code, and make the loop report which one fired. These are loop endings: _why the loop stopped_. They're a different vocabulary from the marker statuses in [Sentinels](sentinels.md) (`passed`, `failed`, `blocked`, `aborted`), which record _what a check found_. The typed exit codes in [Running a Ralph Loop](running-a-ralph-loop.md) are the same idea as the endings, applied to the process. Keep each vocabulary separate.
- **Give the agent an honest way out**: [ImpossibleBench](https://arxiv.org/abs/2510.20270) builds coding tasks whose tests contradict the written spec, so any pass means the agent exploited the tests. Giving GPT-5 a `flag_for_human_intervention` option cut that cheating from 54% to 9%. "Do not lie to exit" with no `BLOCKED` path makes lying the only way out.
- **Check the cheaper alternatives first**: Before you write a sentinel file, try these in order. Each is easier to trust than a file nobody can re-derive:
  1. Re-derive the fact.
  2. A Git note, which attaches a fact to a commit without changing it.
  3. A Git tag.
  4. A real database or queue.
  5. The issue tracker.
  6. A lock, if all you need is "only one worker does this at a time."
  7. _Then_ a sentinel file.

## Anti-patterns

- **The string as the only exit**: The model controls the verdict.
- **Searching all of the output for the token**: Any mention of it, or an echoed prompt, ends the run. The bash loop in [Sentinels](sentinels.md) does a substring match too. That's only safe when the token is distinctive, it's alone on the last line, and a real check backs it up.
- **One string standing for every outcome.**
- **A cap nobody enforces**: [One run](https://github.com/anthropics/claude-code/issues/18646) made it past iteration 459 after its cap was silently ignored. (The [1,966-attempt story](running-a-ralph-loop.md#governors-are-your-problem) is another one.)
- **"Please don't cheat" in the prompt**: [METR measured](https://metr.org/blog/2025-06-05-recent-reward-hacking/) a model gaming the scorer on one task in 80% of runs. With "Please do not cheat" added, it was still 80%.
- **Committing gate sentinels**: A cloned repository can arrive with an approval already in it.
- **Using a sentinel as the only record of something irreversible**: If the file is lost or forged, you can't re-derive what happened.
- **Treating a progress file as proof.**
- **Spin loops**: Goals that never accept "done." [One Codex user found](https://github.com/openai/codex/issues/44909) that 1.4% of their goal sessions used 49% of their input tokens.
- **The four-outcomes trap**: A genuine approval, a forced approval at the round cap (a review loop's maximum number of back-and-forth rounds), a write while the reviewer was down, and a human override all produced the _same_ zero-byte file. Every path that isn't a genuine approval has to leave a distinct marker, and the gate has to deny on it.

## Advanced techniques

- **Dual condition**: The sentinel and the check have to agree. Log every premature claim, and you get a false-completion rate you can actually track.
- **Proof-carrying markers**: The marker holds a digest of the reviewer's response, a handle the gate can re-query itself, or a signature from outside the sandbox. Now a marker that exists but _doesn't_ verify is positive evidence of gaming, not just a missing approval.
- **Fallback approvals**: If there's no approval for the exact tree, fall back to one for the tree of the parent commit and review only the diff. (Nobody seems to be shipping this yet.)
- **Git notes for commit-scoped facts**: "I already reviewed this commit."
- **Validated artifacts**: The work product can serve as the record only after its contents and downstream checks satisfy the contract. An empty or partial file is not completion evidence; verify before resuming or accepting it.
- **Control channels from you to the loop**: Editing `loop.md` steers a running `/loop`. A stop file like `.ralph/STOP` is a kill switch the loop checks every iteration.

## When a scheme has already failed

Do these in order:

1. Deny the gated tool structurally.
2. Find the blast radius: which actions were approved by suspect markers?
3. Quarantine the suspect markers. Don't delete them. They're evidence.
4. Re-derive the markers. Never repair one by hand.
5. Redesign before you resume.

## The takeaway

**A persisted claim has to be independently checkable.** The string says the model _thinks_ it's done. The file says someone _once_ thought so. Only a check you run right now says it's true.
