---
title: 'Patterns: Running Unattended Work'
description: 'Four patterns for agent work you are not watching: the Ralph loop, circuit breakers, human-gated autonomy, and parallel worktree swarms.'
---

Everything gets riskier when you stop watching. Nobody notices the agent going in circles, catches the destructive command, or sees the bill climbing. These four patterns let you walk away anyway: a loop shape that survives long runs, a limit the agent can't argue with, a short list of decisions that still need you, and a way to run several agents without them tripping over each other.

They assume the patterns in [Proving It Works](patterns-for-proving-it-works.md) are in place. An unattended loop with a weak "done" check doesn't save you time. It produces confident, wrong work faster.

## Ralph loop

**What it is:** Start a fresh agent, give it one small task, keep all progress on disk, check the result, and repeat until an outside check says the work is finished or the budget runs out.

**How it works:** Each pass is a brand-new agent that reads its state from files, does one item, and exits, so nothing rots across passes. The cost is that reasoning disappears unless someone writes it down, which is why it pairs with a [progress file](patterns-for-keeping-context-useful.md#progress-file). [The Ralph Loop](the-ralph-loop.md) covers why sessions rot and how to build one.

**When to use it:** For work with a machine-checkable finish line that splits into many small pieces: a migration from one test framework to another, a coverage push, porting, a backlog of well-specified features on a new codebase. It's also the natural shape for overnight runs once you've tuned the prompt by watching a few passes yourself.

**When not to use it:** When no command can tell you it's done. Judgment calls, unclear success criteria, and production debugging don't belong in a loop. Be wary of mature codebases full of unwritten conventions, where fast generation mostly generates review work. And never point it at anything irreversible, like production infrastructure, deploys, or data. A loop runs your worst iteration as confidently as your best.

When the outside check needs judgment, a [referee](exemplar-subagents.md#referee) can make the call at the end of each pass. The [project initializer skill](exemplar-skills.md#project-initializer) sets up the feature list and progress file each pass reads first, and the [session handoff skill](exemplar-skills.md#session-handoff) writes the entry each pass leaves behind.

## Circuit breaker

**What it is:** Bound every loop by something the agent doesn't control: a number of iterations, a dollar amount, a time limit, or a lack of progress.

**How it works:** There are four kinds, and they fail differently, so serious setups use more than one.

- **Count:** Stop after _n_ iterations or turns. It's the simplest and most important. Anthropic's [Ralph plugin](https://github.com/anthropics/claude-code/blob/main/plugins/ralph-wiggum/README.md) calls `--max-iterations` your primary safety mechanism, ahead of the completion check.
- **Spend:** Stop at a dollar limit. Iterations vary wildly in cost, so a count limit doesn't bound the bill. In Claude Code, `--max-budget-usd` caps a single print-mode run (`claude -p`, one non-interactive run).
- **Time:** Stop at a wall-clock limit. It matters when the loop shares a machine or a deadline.
- **Stall:** Stop when a progress measure, like failing tests remaining or features left, stops improving. It's the least common and the most useful, because on an impossible task it fires long before the count limit does.

Whichever one fires, the loop has to say which. "Finished," "ran out of turns," and "ran out of money" call for three different responses, and a bare exit code can't tell them apart.

**When to use it:** I can't think of an unattended loop I'd run without one. Any loop can meet a task the model can't solve, and you won't know in advance which tasks those are. Add a spend limit whenever subagents are involved: a count on the parent says nothing about how many subagents it starts.

**When not to use it:** Leaving it out isn't the risk. Setting it wrong is. A limit that's too low turns a solvable task into a false failure, and it trains you to raise limits on reflex until they stop meaning anything. Raise a limit only after you've worked out why the run hit it. "It needed more iterations" isn't a reason.

[Limits are on you](goals-and-loops.md#limits-are-on-you) covers which limits Claude Code enforces for you and which you have to build.

## Human-gated autonomy

**What it is:** Put people at the few decisions that are hard to undo, and let permissions and a sandbox handle everything else.

**How it works:** If every action asks for approval, you stop reading the prompts and start clicking "yes." That's worse than no gate, because it looks like oversight. Pick the gates deliberately instead. There are usually three:

1. **Intent:** What are we doing, and what's out of scope? (This is where [interview to spec](patterns-for-deciding-what-to-build.md#interview-to-spec) lives.)
2. **Plan:** Is this the right approach? Plan mode blocks edits until you approve.
3. **Irreversible action:** Merge, deploy, delete, send, pay. Anything that leaves your machine or can't be taken back.

Between the gates, the agent works inside a boundary that machinery enforces: [permission rules](https://code.claude.com/docs/en/permissions), the [sandbox](https://code.claude.com/docs/en/sandboxing), and hooks. Put each gate where you can see the actual consequences. Approving a prepared migration with the SQL in front of you is a real decision. Approving "I'll update the database" is a guess.

**When to use it:** Whenever the agent will run long enough that you wouldn't read every prompt anyway, which is most real work. It matters more with several agents, where per-action prompts multiply. The merge gate is mandatory for anything irreversible or external, however much you trust the run.

**When not to use it:** As a replacement for a sandbox on a machine with production credentials lying around. An approval policy trusts the agent's own description of what it's about to do, and a prompt injection (instructions hidden in a file or web page that the agent reads and follows) can make that description a lie. [Blast radius](the-enforcement-ladder.md#blast-radius) covers that threat. Skip the plan gate for one-line changes. And watch for gates that have gone automatic: a gate you approve without reading is just a delay.

[The Enforcement Ladder](the-enforcement-ladder.md) covers which boundary belongs in which mechanism. When the agent has to read something untrusted, like an issue or a web page, have a [bookworm](exemplar-subagents.md#bookworm) with no tools that act pull out the facts first. At the plan gate, a [junior engineer](exemplar-subagents.md#junior-engineer) tells you what the plan leaves the agent to guess. The [pull request shepherd skill](exemplar-skills.md#pull-request-shepherd) is a good example of a gate placed well: it handles CI, conflicts, and review comments on its own, and stops at "ready to merge."

## Parallel worktree swarm

**What it is:** Give each agent its own [worktree](worktrees.md) and branch, so several can work at once without tangling their edits, then integrate the results one at a time.

**How it works:** Split the work by ownership _before_ starting any agents, give each piece its own checkout, and integrate the branches one at a time with the full checks after each merge. [Worktrees and parallel agents](worktrees.md#worktrees-and-parallel-agents) covers the setup and why integration has to be serial.

The same setup runs best-of-N: several attempts at one hard problem, with the tests or a [judge](exemplar-subagents.md#judge) picking the winner.

**When to use it:** When the work splits along clean file boundaries: separate modules, separate layers, mechanical changes repeated across many files. The tell is whether you can write down who owns what before you start. If you can, the branches will probably merge cleanly.

**When not to use it:** For coupled work, where one piece needs something another piece creates. Do those in order. Worktrees only isolate files, so agents still share the database, the dev server's port, and the caches, and one agent's migration can break another's tests. Don't run more agents than you can review, because review is where the time goes. And mind the quota: parallel agents burn through a subscription in proportion to how many you run.

[Things that will bite you](worktrees.md#things-that-will-bite-you) covers what goes wrong, and the [integrator skill](exemplar-skills.md#integrator) handles the merge step. Each worker is a [line cook](exemplar-subagents.md#line-cook) with its own worktree, and a [scrumlord](exemplar-subagents.md#scrumlord) can turn the plan into one ticket for each of them. To run the whole thing from one place, start an [orchestrator](exemplar-subagents.md#orchestrator) with `--agent`, which hands off to the integrator when the line cooks are done.

Unattended work is a trade: you give up watching in exchange for limits, gates, and evidence you can check later. When those three are in place, walking away is reasonable. When any one is missing, you're not running unattended work. You're just not looking.
