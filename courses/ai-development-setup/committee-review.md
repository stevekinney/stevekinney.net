---
title: Committee Review
description: 'How my committee-review skill gates pull requests: parallel reviewers, a Codex second opinion, a Stop-hook loop, and the marker that unlocks gh pr create.'
---

Ask an agent whether the code it just wrote is ready for a pull request and it will say yes. It has the same context, the same assumptions, and the same blind spots that produced the code in the first place.

My `/committee-review` skill is how I get a second opinion that isn't a mirror. It puts a panel of reviewers between "the code is ready" and [`gh pr create`](https://cli.github.com/manual/gh_pr_create): a handful of [subagents](subagents.md), each reading the diff from a different angle, plus a second model from a different family. The agent fixes what they find, they look again, and the pull request opens only once everyone approves or the fifth round runs out.

It's also the most sentinel-dense thing I own. A file gates the pull request, a string ends the loop, and two more files carry state from one round to the next. So this lesson is [Sentinels](sentinels.md) applied, and it reads better if you've done that one first.

> [!NOTE] The skill is a prompt, not a program
> Claude follows the steps because it's told to. The skill leans on a pair of [hooks](hooks.md) for the only real enforcement, and the last section is about how much they can't see.

## Assembling the committee

Before any reviewer runs, the skill collects three things: the diff against the base branch (using [`git merge-base`](https://git-scm.com/docs/git-merge-base), so it sees only your branch's changes), a `--stat` file summary, and the commit log. The commands hardcode `main` with a note to substitute the real base branch, which the skill finds with `gh pr view --json baseRefName` if a pull request already exists, or by asking you. In round one, those three artifacts go into every reviewer's prompt. The conversation doesn't, which is the [fresh-context advice](verification-and-evidence.md#agent-reviewers) taken literally.

Then it looks at who's available. It lists the agent definitions in `~/.claude/agents/` and `.claude/agents/` and reads each one's `name` and `description`. When a project agent and a user agent cover the same ground, the project one wins. A project's `testing-expert` knows that project's test conventions, and the generic one doesn't.

Next it picks a roster based on what the diff touched:

| The diff touches                  | Reviewer                                                   |
| --------------------------------- | ---------------------------------------------------------- |
| TypeScript or JavaScript          | `typescript-expert`                                        |
| Tests, or new code without tests  | `testing-expert`                                           |
| Components or UI                  | `frontend-architect`, `ux-designer`                        |
| New abstractions or big refactors | `simplicity-engineer`                                      |
| Build config, CI, or dev tooling  | `dx-engineer`                                              |
| CLI tool code                     | `cli-developer`, if you have one                           |
| MCP server code                   | `mcp-specialist`, if you have one                          |
| Markdown, docs, or course content | `prose-editor`                                             |
| Anything non-trivial              | [`junior-engineer`](exemplar-subagents.md#junior-engineer) |

The rules around the table matter more than the table. The committee is at least two subagents plus [Codex](https://developers.openai.com/codex), and if only one subagent seems relevant, `simplicity-engineer` joins as the second. A bloated committee produces noise, but the skill leans toward including a reviewer when it's unsure. It logs the roster and keeps going without asking you to confirm it. It also always requests [GitHub Copilot](https://github.com/features/copilot) (`@copilot`) as a reviewer once the pull request exists.

Every reviewer is dispatched in the same turn, so the panel runs in parallel. Each one gets a role, the diff, and the same instructions: for every problem, give a location, a description, a specific fix, and a severity of `must-fix` (blocks the pull request) or `suggestion`. If the changes are fine, say `APPROVED` and say what you checked.

## Codex always has a seat

Codex is the one reviewer that never gets selected. It sits on every committee. The reason is the one from [Agent reviewers](verification-and-evidence.md#agent-reviewers): a second model family has different blind spots than the Claude-based panel, so its mistakes don't line up with theirs. The prompt asks it to be the hostile second opinion, and also not to manufacture objections to look useful.

The skill reaches Codex through its [MCP](https://modelcontextprotocol.io/) server instead of shelling out to `codex exec`. ([Claude Code and Codex, Together](claude-code-and-codex-together.md#calling-codex-from-claude-code) covers the shell route and its traps.) The call asks for the `heavy` profile (gpt-5.4 at its highest reasoning effort), a read-only sandbox, and an approval policy of `never`, with the working directory set to the repository root. When the diff has algorithms, hot paths, crypto, or recursion in it, the prompt gets an addendum telling Codex to look hard at complexity and degenerate inputs.

The prompt's hard boundaries matter more than they look. Codex returns text only: no skills, tools, agents, hooks, shell commands, plans, file edits, branches, or pull requests. Without that fence, a model that can see your repository's instructions can start acting as the workflow runner instead of the reviewer, and then you don't have a review.

Round one starts a Codex thread, and the skill saves its `threadId`. Later rounds reply on that thread with a list of what changed plus the updated diff, so Codex keeps its earlier reasoning instead of starting cold. The subagents are the opposite. Each round spawns fresh ones, so each gets its own previous feedback pasted back in.

Codex is also the only reviewer the skill has a failure plan for. If the call errors, disconnects, or hangs and then collapses into a generic rejection, the skill retries at most once, records it under `## Codex Unavailable`, puts a warning in the pull request body, and moves on. If round one's call failed, later rounds skip Codex instead of starting a thread mid-loop. Codex never blocks the pull request.

## Triage and the tiebreaker

When the reports come back, they're sorted into four piles: must-fix items, suggestions, conflicts, and approvals. Codex goes through the same sort as everyone else. It's one reviewer, not a veto and not a rubber stamp.

Each must-fix item becomes a task, and the agent works through them along with any suggestion that doesn't clash with a must-fix. It runs whatever lint, type, and test checks exist, then commits as `Address review committee feedback (round 1)`.

Reviewers will disagree, so the tiebreaker is built in: pick the simpler option, and when `simplicity-engineer` is one of the two sides, it wins. The skill never asks you to arbitrate. Ties go to the reviewer whose whole job is cutting machinery.

## Keeping the loop alive

One round almost never finishes the job. After round one, the skill writes two files into `tmp/` (adding `tmp/` to `.gitignore` if it isn't there) and then stops.

- `tmp/committee-state.md`: The memory. The roster, the Codex thread ID, every round's feedback per reviewer, the conflict decisions, the post-creation reviewers, and a `## Codex Unavailable` section if Codex failed. Every later round starts by reading it.
- `tmp/committee-review-loop.local.md`: The control file. Frontmatter, then the prompt to feed back each round.

The frontmatter is the loop's configuration, though the hook only reads `iteration`, `max_iterations`, and `completion_promise`:

```text
---
active: true
iteration: 1
max_iterations: 5
completion_promise: "Committee consensus reached and PR opened"
started_at: 2026-10-06T14:02:11Z
---

You are running a review round for the committee-review skill. Read
`tmp/committee-state.md` for the committee roster, previous feedback, and user decisions.
```

Stopping is the trigger. The skill ships a `Stop` hook, `scripts/stop-hook.sh`, meant to run whenever the agent tries to end its turn. Roughly in order, it:

- **Finds no control file**: Allows the stop. No loop is running.
- **Finds a different `session_id`**: Allows the stop and leaves the file alone. The file the skill writes doesn't record one, so this branch never fires.
- **Can't make sense of the state**: Counters that aren't numbers, a transcript it can't read, or no prompt in the file. Deletes the file and allows the stop.
- **Sees `iteration` at `max_iterations`**: Deletes the file and allows the stop.
- **Finds the promise**: The first `<promise>` pair in the agent's last message holds exactly the `completion_promise` text. Deletes the file and allows the stop.
- **Anything else**: Increments `iteration` and blocks the stop, handing the stored prompt back as the reason.

That last branch is the whole trick. A blocked stop with a prompt attached makes the agent carry on in the same session. This is the stop-hook flavor of [the Ralph loop](the-ralph-loop.md), not the fresh-process kind. The conversation continues, which is why the state file exists: the reviewers are new each round and need their last feedback handed back.

Each re-review round regenerates the diff, then sends every subagent its own previous feedback, the changes made since, and any conflict decisions. Their job is to acknowledge what's fixed, re-raise what isn't, and look for new problems. Codex gets the same questions on its existing thread. Then the agent decides what happens next:

- **All approved**: Open the pull request and print the promise.
- **Must-fix items remain**: Fix them, commit as `Address review committee feedback (round N)`, update the state file, and stop _without_ the promise. The hook sees no promise and feeds the prompt back.
- **The cap**: When `iteration` equals `max_iterations` and must-fix items remain, the agent writes a summary of what's unresolved into the state file and opens the pull request anyway. It never asks.

Five rounds means round one, which runs inline, plus four more that the hook feeds back.

## Opening the pull request

The pull request opens in a fixed order. The agent writes the approval marker, pushes the branch, and drafts the body: a summary, the roster, the number of rounds, a test plan, and a warning if Codex was down. Then it runs `gh pr create`. After that it saves the pull request number to `tmp/last-pr.txt` for whatever pipeline step comes next, requests `@copilot` with `gh pr edit --add-reviewer`, and finishes with the promise string as its final output.

The marker is the sentinel that turns this from a suggestion into a gate:

```sh
MARKER="/tmp/committee-review-$(echo "$(git rev-parse --show-toplevel):$(git rev-parse --abbrev-ref HEAD)" | shasum -a 256 | cut -c1-16)"
touch "$MARKER"
```

The skill relies on a `PreToolUse` hook (one that runs before a tool call and can block it) that looks for this file whenever it sees `gh pr create`. No marker, no pull request. The name is a hash of the repository root and the branch, so two [worktrees](worktrees.md), or two branches, never share an approval. The file lives in `/tmp`, outside the repository, so it can't be committed and show up pre-approved in someone's clone.

The marker and `gh pr create` have to be two separate Bash calls. The hook inspects the filesystem _before_ the command runs, so a combined `touch "$MARKER" && gh pr create` gets blocked the first time: the marker doesn't exist yet at the moment of the check. It's a small gotcha that shows what a gate is. It checks the world at one instant.

## Steering it

The loop serves you, so you can interrupt it at any point:

- `Skip [agent]`: Remove a reviewer and update the state file.
- `Add [agent]`: Add one.
- `I disagree with [agent]`: Dismiss that reviewer's remaining feedback for this pull request.
- `Just open it` (or `override`): Skip the review, write the marker, and open the pull request.

The skill stops and tells you when there's nothing to review, when it finds no agents in either location, or when `gh` isn't installed or authenticated. It also stops if you cancel.

## Where the sentinels are

Four artifacts do the work:

| Artifact                                    | Kind                  | Written by                     | Read by                                      |
| ------------------------------------------- | --------------------- | ------------------------------ | -------------------------------------------- |
| `/tmp/committee-review-<hash>`              | File sentinel, a gate | The agent                      | The `PreToolUse` hook, before `gh pr create` |
| `<promise>…</promise>`                      | Completion sentinel   | The agent                      | The `Stop` hook                              |
| `max_iterations: 5`                         | Cap                   | The skill, in the control file | The `Stop` hook and the loop prompt          |
| `tmp/committee-state.md`, `tmp/last-pr.txt` | Handoff files         | The agent                      | The next round, the next pipeline step       |

That's the layered exit from [Best practices](sentinels.md#best-practices): a cap that's always on, plus a sentinel that can end the loop early. The gate fails closed, because a missing marker blocks the pull request. The handoff files are only memory, and nothing gates on them.

## What gets harder

This design has sharp edges, and I'd rather you hear about them from me:

- **The agent writes its own approval**: The marker is a `touch`. On the [Sentinels ranking](sentinels.md#how-strong-is-your-marker), that's the weakest kind, one that costs the agent nothing. No second condition has to agree with it (Sentinels calls that the [dual condition](sentinels.md#advanced-techniques)). The closest thing to a check is the agent's own reading of the reviewers' replies, and the agent is the one writing the marker. [Keeping the agent away from the marker](sentinels.md#keeping-the-agent-away-from-the-marker) is the fix, and this skill can't use it, because the agent is the writer by design.
- **Four outcomes, one file**: A genuine consensus, a forced approval at round five, a `Just open it` override, and a Codex outage all end in the same `touch`. That's the [four-outcomes trap](sentinels.md#anti-patterns) nearly word for word, and I walked right into it. The paper trail is thinner than the marker. At the cap, the unresolved items go only into the gitignored state file, while the pull request body still says "All must-fix items addressed." A `Just open it` override leaves no record at all, and only a Codex outage reaches the pull request body. A marker name per outcome (`approved`, `forced-at-cap`, `overridden`, `reviewer-down`) would let the hook allow all four and still know which one happened.
- **The name tracks the branch, not the content**: Push another commit after approval and the old marker still opens the gate. Nothing in the skill ever deletes it, either. [Keying on the Git tree hash](sentinels.md#keying-writing-and-reading-markers) would make a stale approval simply absent.
- **The promise is only a string**: The hook compares the first `<promise>` pair in the last text block it finds in the transcript, so a final message that quotes the full tag counts as a promise, whether or not the agent meant it. Reading `last_assistant_message` is safer, because [the transcript can lag](sentinels.md#how-completion-sentinels-work). The cap is the real backstop. It's always on and doesn't care what the model printed.
- **The control file isn't scoped to a session**: The hook can compare a `session_id`, but the frontmatter the skill writes doesn't include one, so that check never fires. Any session that stops in that checkout while the file exists gets handed the review prompt, and each of those stops also bumps `iteration`, burning through the real loop's rounds.
- **Nobody hands the reviewers the contract**: In round one they get the diff, the file list, and the commit log. Later rounds add their own previous feedback and a list of changes. Nothing gives them the requirements or the test output. The subagents have file tools and can go look, but nothing points them at the task. That's enough to catch sloppy code and not enough to catch code that solves the wrong problem. Hand them both. [Agent reviewers](verification-and-evidence.md#agent-reviewers) covers why.
- **It's slow and it isn't cheap**: Every round is a full panel plus a Codex call at its highest reasoning effort. Even a unanimous approval in round one doesn't skip the loop, because the pull request only opens from the loop prompt. The minimum is two rounds, and a pull request that goes five will make you feel the cap.

I'm fine with all of that for one reason: the door this guards is a pull request. A pull request is a proposal, a human still reads it, and Copilot is requested as one more reviewer. A `touch`-grade marker is a reasonable lock for a door that cheap to open and close. Point the same design at a merge or a deploy and it stops being reasonable. That's where the marker needs a writer the agent can't reach, and an approval that can tell its four outcomes apart.
