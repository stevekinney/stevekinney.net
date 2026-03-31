---
title: 'The Ralph Loop: How a Bash One-Liner Changed How I Think About AI Coding Agents'
description: >-
  A while-true loop, a prompt file, and a clean context window on every
  iteration. The Ralph Loop is the dumbest-sounding technique that actually
  works—and the reason it works will change how you think about programming
  LLMs.
date: 2026-03-31
modified: 2026-03-31
tags:
  - ai
  - agents
  - tooling
---

A few weeks ago, I wrote about [my ridiculous agentic coding setup](/writing/ai-assisted-development-workflow). I spend _a lot_ of time planning and then I spend a lot of time in Github's pull request review UI. Between the up-front work of planning and writing detailed product requirements and acceptance criteria and the line-by-line review: The actual writing of the code is the least interesting part—and I don't want to have to babysit and nudge it along. What I _want_ to do is spend a bunch of time working on the plan and then when it's time to pickup my kid from school, I want to kick off the execution segment of the show and then review everything when I get back. I don't want to leave the house and have it just stop surreptitiously just because it was feeling like being difficult today.

![Ralph Wiggum](assets/ralph-wiggum.png)

When Claude first dropped thier [Skills](https://code.claude.com/docs/en/skills) functionality, one of the ones that they publushed was based on [the Ralph Wiggum Loop](https://ghuntley.com/ralph/). Having grown up in the 1990s, I could make some assumptions about what this did, but I didn't immediately understand how to use it—until last week when I decided to sit down and learn a little bit more about it. And like, most things: I'm writing this post that you're reading in an attempt to solidify the concept in my brain. Welcome to another episode of **Steve Turns Around and Teaches Something in Order to Make Sure He Learned It™**.

In its purest form, it's this:

```bash
while :; do cat PROMPT.md | claude -p; done
```

That's the whole thing. A `while true` loop that feeds the same prompt file into an AI coding agent, over and over and over. The agent reads your codebase, does some work, commits, and exits. Then it starts fresh with a clean context window and does it again.

I know. I had the same reaction you're probably having right now. But stay with me—the reason this works is actually the interesting part, and it'll change how you think about working with these tools even if you never run the loop yourself.

## The problem with long conversations

Here's a thing that anyone who has spent real time with AI coding agents knows but doesn't love to talk about: they get worse the longer you talk to them. They keep telling us that it's no longer about **prompt engineering** and now it's all about **context engineering**.

You start a session. You describe the feature. The agent makes a first attempt. It doesn't quite work. You say "actually, try it this way." It tries again. You point out an edge case. It fixes it but breaks something else. You debug together for a while. And somewhere around the 15th exchange, you notice the agent is making suggestions that contradict things you told it 10 minutes ago, or it's hallucinating a function signature from three attempts back.

This is **context rot** and I know it all too well. It's why I feel so productive first thing in the morning and then I feel like all of my tools have gotten stupider than I have by the end of the day. Every failed attempt, every tangent, every correction stays in the conversation history. The model has to process all of that noise—the good, the bad, and the "actually, forget I said that"—before it can think about the current problem. After enough iterations, the context window is basically a junk drawer of stale information, and the model's output quality degrades accordingly.

The Ralph Loop's answer to this is almost aggressively simple: throw away the context after every iteration. Start fresh. Every time.

## Why that actually works

The key insight—and this is the part that took me a minute to internalize—is that _your files and git history are a better memory layer than the LLM's context window_.

Think about it. When the agent commits its work at the end of an iteration, it's writing to disk. The codebase, the test results, the progress file, the git log—all of that persists with perfect fidelity. The next iteration starts with a clean context window, reads the current state of the repo, and picks up where the last one left off. It doesn't need to remember the conversation. It just needs to read the files.

This is what Huntley means when he calls the technique "deterministically bad in a nondeterministic world." Any single iteration might not produce perfect output. But the failures are predictable and informative, the progress is durable, and the next iteration starts clean.

In [an interview with LinearB](https://linearb.io/blog/ralph-loop-agentic-engineering-geoffrey-huntley), he explains the deliberate inefficiency this way: Ralph "mallocs arrays" repeatedly, allocating the full specification on every iteration. It sounds wasteful, but it's a trade-off—you're spending tokens to avoid compaction events and context rot, which are failure modes that are much harder to recover from than a few redundant reads.

## "But what about multi-agent?"

You might be wondering why we'd use a single dumb loop instead of some sophisticated multi-agent system with coordinator nodes and reviewer agents and agent-to-agent communication protocols.

Huntley has a sharp take on this in [everything is a ralph loop](https://ghuntley.com/loop/). He draws an explicit analogy to microservices: "Consider what microservices would look like if the microservices themselves are non-deterministic—a red hot mess." And I have to say, having lived through the microservices era at scale, this resonated with me more than I'd like to admit.

Ralph is intentionally monolithic. A single process. One task per loop. No coordination overhead, no message-passing failure modes, no distributed state. All of the complexity budget goes into the prompt and the verification—not into making unreliable agents talk to each other reliably.

That doesn't mean multi-agent is never the right call. But most people reaching for it are introducing distributed systems complexity before they've exhausted what a single well-tuned loop can do. Get good at programming one agent before you try to coordinate five. (This is advice I wish someone had given me about microservices in 2016, but I digress.)

## The economics

I'd be remiss not to mention the cost argument, because it's hard to ignore. One wrong move and you can blow through a sizable chunk of your weekly rate limit on a Friday night. Ask me how I know. And we'll get at how to make sure you don't have a runaway loop, but let actually look at it from the other angle.

Running Claude on a bash loop costs roughly $10 an hour in API credits. Huntley shared a field report—with permission—from an engineer who delivered a $50,000 contract using Ralph. Tested. Reviewed. Shipped. Total API cost: $297.

Your mileage will, of course, vary. Not every task is that well-suited to autonomous execution. But the math is compelling even in more modest scenarios. One hour of autonomous development at full token burn versus a day of manual back-and-forth? For well-defined execution work, the API cost is a rounding error compared to the engineering time.

If you're on the $20/month Claude Code tier, a single Ralph session can eat your weekly limit. The $100/month tier or higher is where this gets practical for regular use.

## The four components

A Ralph Loop has four parts, and they're all simple. The interesting bit is how they interact.

**The bash script** is the orchestrator. It runs the loop, checks for the completion signal, enforces an iteration limit, and handles cleanup. It's deliberately the dumbest part of the system—which is exactly what you want from the thing that's running unsupervised.

**`PROMPT.md`** is the brain. This is where your engineering effort actually goes. It tells the agent what to work on, how to verify its work, what "done" looks like, and what to do when it's stuck. It gets re-read from disk on every iteration, which means you can edit it mid-run to adjust behavior without restarting. (This is one of those things that sounds minor but is actually a huge ergonomic win when you're tuning.)

**The filesystem** is the memory layer. Progress files, task lists, git history—everything the agent needs to orient itself lives on disk. The prompt tells the agent where to find this state and how to update it. When the next iteration starts with a clean context, it reads the filesystem and picks up from the current state. Not from the last conversation. From the current files.

**The completion signal** is the exit condition. Most implementations use a distinctive string—`<promise>COMPLETE</promise>` is the convention—that the bash script greps for in the agent's output. When it sees it, the loop stops. When it doesn't, another iteration begins.

Here's a minimal working version:

```bash
#!/bin/bash
set -e

MAX_ITERATIONS=${1:-10}
PROMPT_FILE="PROMPT.md"
iteration=0

while [ $iteration -lt $MAX_ITERATIONS ]; do
  iteration=$((iteration + 1))
  echo "=== Iteration $iteration / $MAX_ITERATIONS ==="

  output=$(cat "$PROMPT_FILE" | claude -p)
  echo "$output"

  if echo "$output" | grep -q '<promise>COMPLETE</promise>'; then
    echo "Task complete at iteration $iteration"
    exit 0
  fi
done

echo "Hit max iterations without completion"
exit 1
```

You run it with `./ralph.sh 20` and go make coffee. Or, if you're feeling ambitious, go to sleep.

**One thing I want to be really clear about: always set an iteration limit.** Running this without `MAX_ITERATIONS` is how you wake up to a $500 API bill and a repo full of increasingly unhinged commits. The completion promise uses exact string matching, which means the agent might accidentally output it mid-work or—more likely—never output it at all if it gets confused. The iteration cap is your actual safety net. The promise is just the happy path.

For a more detailed setup walkthrough, the [Getting Started with Ralph](https://www.aihero.dev/getting-started-with-ralph) guide on AI Hero is a good companion piece.

## The funnel: you don't start with the loop

Before we talk about prompt craft, I want to be explicit about something: the Ralph Loop is an _execution_ tool, not a _discovery_ tool. If you don't know what you're building, the loop isn't going to figure it out for you. It'll just burn tokens being confused.

Huntley's workflow has three distinct phases, and they matter:

**Phase 1: Discovery.** This is where you use your AI coding tool interactively. Explore the problem. Have a conversation. Try things. This is the "figure out what to build" phase, and it should happen in a normal Claude Code session, not a loop. Plan mode is great for this—you can iterate on a requirements document until you're actually happy with it.

**Phase 2: Specification.** Take what you learned in discovery and turn it into a concrete artifact—a PRD, a task list, a standards document. This is the thing the loop will execute against, and its quality is the single biggest predictor of whether the loop succeeds or fails.

**Phase 3: Execution.** _Now_ you run the loop. `PROMPT.md` references the specification, the agent picks tasks from it, and the loop grinds through them.

The critical mistake—and I've watched people make it—is skipping straight to phase 3 with a vague idea and hoping the loop will sort it out. One practitioner described writing a half-page outline, having the loop generate requirements without reviewing them, then having it build the code without reading the requirements. The requirements were bad. The code was useless. Garbage in, garbage out—and the loop amplifies the quality of your spec in both directions.

## Writing a good prompt

This is where people's Ralph Loops live or die. The bash script is 15 lines. The prompt is everything.

A good prompt has four elements: scope, backpressure, a completion signal, and stuck behavior. Miss any one of them and you're going to have a bad time.

**Scope** is one unit of work. "Pick the next incomplete task from `ROADMAP.md` and implement it"—good. "Build the entire application"—not good. Each iteration should target something a single agent session can realistically finish. If the scope is too broad, the agent will thrash between subtasks and complete none of them. If you've ever watched someone try to do five things at once and accomplish nothing, you know this failure mode. LLMs are not immune to it.

**Backpressure** is the mechanical verification that rejects bad work. Name the actual commands—`bun test`, `npm run typecheck`, `eslint .`—and instruct the agent to run them after every change. If any command fails, the agent has to fix the issue before it can proceed. Without backpressure, the loop will cheerfully commit broken code and tell you it's done. I cannot overstate this: if you don't have tests, add backpressure through a type checker at minimum. The agent needs _something_ that can tell it "no, that's wrong" without requiring human judgment.

**The completion signal** is the string the bash script greps for. Wrap it in `<promise>` tags to avoid accidental matches—you don't want the model casually outputting "COMPLETE" in a progress message and killing the loop early.

**Stuck behavior** is what the agent should do when it can't make progress. This is the part everyone forgets, and it's the difference between a productive 20-iteration run and a token bonfire. Tell the agent: "If you can't make progress, document what's blocking you in `progress.txt`, commit what you have, and output `<promise>STUCK</promise>`." This way the outer loop can detect it and either move to the next task or alert you.

Here's a concrete example:

````markdown
## Task

Read `ROADMAP.md` for the full project context. Pick the next
incomplete task and implement it.

## Instructions

1. Read the task file and understand the scope of this specific task
2. Write a failing test for the expected behavior
3. Implement until the test passes
4. Run ALL verification commands:
   ```bash
   bun test
   bun run typecheck
   bun run lint
   ```
5. Fix any failures — do not proceed until all pass
6. Update `progress.txt` with what you completed
7. Commit your changes

## When done

If the task is fully implemented and all verification commands exit 0:

    <promise>WORK_COMPLETE</promise>

## If stuck

If you cannot make progress after a genuine attempt:

- Document what's blocking you in `progress.txt`
- Commit what you have
- Output: <promise>WORK_STUCK</promise>
````

Notice what's _not_ here: no framework assumptions, no prescribed file structure, no ambient knowledge about the project. The agent reads `ROADMAP.md` and the codebase to figure all of that out. This is what makes the prompt durable across iterations—each fresh agent can orient itself from the filesystem alone.

## How to persist state (it's a design decision)

The prompt above uses `progress.txt` as its state file—just a text log where the agent records what it did. But how you persist state between iterations is an actual architectural choice, not a default you should copy without thinking. (I say this as someone who has cargo-culted more patterns than I'd like to admit.)

A few common approaches:

**Append-only log (`progress.txt`).** Simple. Each iteration adds what it did. The next reads the file to see what happened. Works well for linear task lists.

**JSON with pass/fail flags.** The [snarktank/ralph](https://github.com/snarktank/ralph) implementation uses a `prd.json` where each user story has a `passes: false` field that gets flipped when the agent completes it. The agent picks the highest-priority story that's still false. Structured, but requires the task list to be in a specific format.

**Pure git history.** No state file at all. The agent runs `git log` and reads the codebase to figure out what's done and what's left. This is the most minimal approach and works when your task list is a markdown checklist that gets updated through normal commits.

**Steering files (`AGENTS.md`, `CLAUDE.md`).** These aren't state files exactly—they're more like configuration that shapes agent behavior across iterations. An `AGENTS.md` might say "don't use the `utils` module, it's deprecated" or "the project uses Bun, not Node." Each iteration reads it. You can update it between iterations to course-correct. These are, in my opinion, the most underappreciated part of the whole system. If you find yourself correcting the same behavior over and over, stop telling the agent and start writing it in one of these files.

Start simple. Add structure when you see the agent making bad decisions about what to do next.

## Anti-patterns (things I've seen go wrong)

**"Build a todo API and make it good."** No verification, no completion criteria, no definition of "good." The agent will either claim success immediately or loop forever. Both outcomes are useless.

**"Build a complete e-commerce platform."** In one prompt. The agent can't hold the entire scope of an e-commerce platform in a single context window, so it'll bounce between the cart system and the auth system and the payment integration without finishing any of them. Break it into phases. Each phase gets its own completion criteria.

**No backpressure.** I mentioned this already, but it's worth repeating because it's the most common failure mode I see. Without mechanical verification that the code actually works, the agent is just vibes-checking its own output. It will commit plausible-looking code that is subtly broken, and the next iteration will build on top of a broken foundation. Tests. Type checking. Linting. Pick at least one.

**No stuck escape.** Without explicit instructions for what to do when stuck, the agent will spend every remaining iteration attempting the same impossible thing. I've seen this burn through 50 iterations on a task that needed a human decision after iteration 3.

**Copy-pasting someone else's prompt.** Huntley himself [warns about this](https://ghuntley.com/ralph/): "Whilst it might be tempting to take the prompt from CURSED, it won't make sense unless you know how to wield it." His prompts evolved through months of watching the loop and adding guardrails. Yours need to go through the same process. Taking his prompt verbatim is like copying someone else's `.vimrc`—it only makes sense to the person who built it incrementally.

## Tuning is where the skill lives

Here's the thing nobody tells you about the Ralph Loop: writing the initial prompt is maybe 20% of the work. The other 80% is watching the loop run and adjusting based on what you see.

And that watching part? That's not idle time. Huntley is explicit about this in [everything is a ralph loop](https://ghuntley.com/loop/)—sitting on the loop, not in it, studying the agent's failure patterns and decision-making, is where your learning as an engineer comes from. You're not just building software. You're learning to program a new kind of computer. The loop is where that happens.

His metaphor for the tuning process is tuning a guitar: instead of prescribing everything upfront, observe and adjust reactively. When the agent fails a specific way, add a "sign" to help it next time. The [Ralph Playbook](https://github.com/ClaytonFarr/ralph-playbook) by Clayton Farr—assembled from Huntley's posts, videos, and the [how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum) repository—documents this in detail. Signs aren't just prompt text. They're anything the agent can discover:

**Prompt guardrails.** Explicit instructions like "don't assume this function doesn't exist—check first." You add these after you watch the agent make that specific mistake.

**Steering files.** `AGENTS.md` or `CLAUDE.md` with project-specific operational knowledge. The agent reads these on every iteration. If you're correcting the same behavior repeatedly, the correction belongs in a file, not in your head.

**Patterns in the codebase itself.** This one's subtle but powerful. If the agent keeps generating the wrong code pattern, don't just tell it to stop—add the correct pattern to the codebase as an example. The next fresh-context iteration will discover it and follow it. The codebase becomes a form of steering.

One of my favorite examples from the Ralph community: an engineer spent 30 minutes writing coding standards with Claude, another 30 minutes reviewing those standards with a senior engineer, then ran the loop with one prompt: "Make sure the codebase matches the standards." The agent built a refactor plan on its own and worked through it in six hours. The prompt was short. The standards document did the heavy lifting.

Huntley also emphasizes something I think about a lot: "Always look for opportunities to loop Ralph back on itself." What this means in practice is structuring your work so the agent can evaluate its own output. Tests are the most natural form of this—the test result is structured feedback the model can read and act on. But it extends to anything that produces checkable output. In Huntley's compiler project, he had the agent compile the application and then examine the LLVM IR. The agent could see whether its own output was correct. That self-referential feedback loop is what makes TDD and Ralph such natural companions.

## The plugin vs. the bash loop

If you're using Claude Code, there's an [official plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum) that wraps this pattern:

```bash
/ralph-loop "Your task description" --max-iterations 20 --completion-promise "DONE"
```

It works. It's convenient. But there's an architectural difference worth understanding: the plugin runs inside a single session using a stop hook. When the agent tries to exit, the hook intercepts it and feeds the same prompt back. Context accumulates across iterations.

The raw bash loop spawns a new process every time. Each `claude -p` invocation gets a completely clean context window. This is the entire point of the technique—avoiding context rot by deliberately starting fresh.

For short, focused tasks where you _want_ the agent to see its prior attempts (debugging a flaky test, iterating on a single function), the plugin's accumulated context is a feature. For longer autonomous runs—multi-story PRD execution, overnight work, anything past about 10 iterations—the fresh-context bash loop is what you actually want.

The people who've spent the most time with both tend to prefer the bash loop. It's more composable—you can wrap it in other scripts, chain it with CI, customize the flow however you want. The plugin is the on-ramp. The bash loop is the destination.

There are also community implementations that add real guardrails to the raw loop. [snarktank/ralph](https://github.com/snarktank/ralph) adds PRD-driven task management. [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) adds intelligent exit detection, rate limiting, and circuit breakers. The [Goose Ralph Loop](https://block.github.io/goose/docs/tutorials/ralph-loop/) does something particularly interesting—it uses one model for the work and a _different_ model for reviewing it. Cross-model review is a compelling extension of the pattern.

## How to actually get started

Here's the progression I'd recommend. It's designed to build intuition before you automate anything:

**Step 1: Write a PRD.** Before you touch the loop, figure out what you're building. Use Claude Code interactively. Plan mode. Iterate until you have a clear spec. Remember the funnel—discovery and specification happen outside the loop.

**Step 2: Write your `PROMPT.md`.** Start minimal. Task file, verification commands, completion signal, stuck signal. Resist the urge to add guardrails for problems you haven't seen yet.

**Step 3: Run it once, manually.** `cat PROMPT.md | claude -p`. Watch everything. Did it pick the right task? Did it run the tests? Did it commit something sensible? This single execution teaches you more than any amount of reading. (Including this blog post. Go try it.)

**Step 4: Run it a few more times.** Still manually. Now you're watching for patterns. Does it go in circles? Does it pick tasks in a sensible order? Does it handle failures well? Each failure is a sign to add—either in the prompt, in `CLAUDE.md`, or in the codebase itself.

**Step 5: Wrap it in the loop.** Only now. Start with a cap of 5–10 iterations and watch the output. Increase the cap as your confidence grows.

**Step 6: Add git commits per iteration.** If you're not already committing after each iteration, start. Rollback points. Auditability. And the next fresh-context agent can `git log` to see what happened before it showed up.

**Step 7: Go AFK.** Run it overnight. Come back to commits. Review them like you'd review any pull request—the output is a draft, not a deployment.

## It's not just for building forward

Most of the examples so far have been about greenfield work—writing new code from a PRD. But the loop works just as well in reverse.

Huntley demonstrated this pretty dramatically. He took BSL-licensed source code from projects like HashiCorp Nomad and Tailscale, had the loop clean-room it into specifications—reading the code, generating detailed functional descriptions, discarding the original—and then ran a separate loop to regenerate functionally equivalent implementations from those specifications. Days, not years.

The general pattern is: any task shaped like "look at this repo, understand something, produce an artifact, verify the artifact is correct" can be looped. Auditing a codebase against standards. Generating documentation from code. Extracting API specifications. Producing test suites. If you can define "correct" mechanically, it's a loop candidate.

## The existence proof

If you're skeptical about the ceiling—and healthy skepticism is warranted—consider this: Huntley ran Ralph for three months straight to build [a complete programming language](https://ghuntley.com/ralph/) with an LLVM compiler that produces binaries for macOS, Linux, and Windows.

The language didn't exist in any LLM training data. The model had to learn to program in a language it had never seen, using a compiler it was simultaneously building.

That's not a todo app. That's a production-grade compiler, built by a bash loop and a well-tuned prompt.

## Beyond code

One more thing, and I think it's the most interesting implication of the whole technique.

Ralph isn't just for writing code. In [everything is a ralph loop](https://ghuntley.com/loop/), Huntley describes putting an entire infrastructure deployment under a Ralph loop for system verification—identifying faults, resolving them through forward loops, and verifying the fixes. Autonomously. While he was (and I love this detail) DJing.

The pattern generalizes. Deployment validation. Performance benchmarking. Security auditing. Content migration. Data pipeline testing. If you can define "correct" mechanically and the work fits in bounded iterations, it's a loop candidate. The technique isn't about bash scripting. It's about a model for how to program LLMs as general-purpose computers.

## When it works

**Greenfield features from a PRD.** Each iteration picks the next task, implements it, runs tests, commits. The PRD is the roadmap, the tests are the backpressure, the loop is the persistence.

**TDD workflows.** The natural complement. Write a failing test, implement until it passes, and the test result mechanically tells the agent whether it succeeded. No ambiguity.

**Mechanical refactors.** "Make the codebase match these standards" across hundreds of files. Each iteration tackles a bounded set without accumulating cognitive debt.

**Migration and porting.** A team at a YC hackathon [ran Ralph overnight to port codebases between languages](https://github.com/repomirrorhq/repomirror/blob/main/repomirror.md). Well-scoped, mechanically verifiable, benefits from iteration.

**Standards enforcement on a cron.** Run the loop once overnight, review the small change set in the morning. Low risk, easy to review, immediately valuable. This is the best entry point for existing codebases.

## When it doesn't

**Architectural decisions.** If the task requires judgment about system structure—abstractions, decomposition, interfaces—that's discovery, not execution. Use your coding agent interactively.

**Ambiguous requirements.** If "done" requires subjective evaluation ("make the UI feel polished"), the agent can't converge. You'll burn iterations without progress.

**Tightly coupled changes.** If the work requires coordinating changes across many files where a partial commit would break the build, the one-task-per-iteration model breaks down. The agent needs to hold the whole thing in one context window.

**Deep existing codebases.** If understanding the change requires reasoning about thousands of lines of context, a fresh-context agent might not have room for both the existing code and the new work. This is where the plugin's accumulated context has a genuine advantage.

## The actual lesson

Huntley [puts it bluntly](https://ghuntley.com/ralph/): "Success depends on writing good prompts, not just having a good model. LLMs are mirrors of operator skill."

The prompt is the program. The bash loop is the runtime. The filesystem is the state store. The LLM is the execution engine. And your job as the engineer is what it's always been—defining what "correct" looks like clearly enough that a system can verify it.

The engineers who get the most out of this aren't the ones with the best prompts on day one. They're the ones who sit on the loop—watching, tuning, learning how this new kind of computer actually behaves—and build the intuition that compounds over time.

That's the real takeaway. It's not about the bash script. It's about the discipline of defining "done" precisely enough that a machine can get there on its own.

And honestly? That's a skill worth developing regardless of how you feel about AI-assisted development. Precise specifications, mechanical verification, clear acceptance criteria—these have been good engineering practices since long before anyone put an LLM in a `while` loop.

The loop just makes it very obvious, very quickly, when you haven't done them well enough.

## Further reading

- [Ralph Wiggum as a "software engineer"](https://ghuntley.com/ralph/) — Huntley's original post introducing the technique
- [Everything is a ralph loop](https://ghuntley.com/loop/) — The follow-up on the mindset shift and the generalization beyond code
- [Getting Started with Ralph](https://www.aihero.dev/getting-started-with-ralph) — Step-by-step setup guide from AI Hero
- [The Ralph Playbook](https://github.com/ClaytonFarr/ralph-playbook) — Comprehensive guide assembled from Huntley's methodology
- [how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum) — Huntley's own repository with detailed tuning guidance
- [Official Claude Code Plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum) — Anthropic's plugin implementation
- [snarktank/ralph](https://github.com/snarktank/ralph) — PRD-driven autonomous loop for Claude Code and Amp
- [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) — Community implementation with intelligent exit detection
- [Goose Ralph Loop](https://block.github.io/goose/docs/tutorials/ralph-loop/) — Cross-model review variant for Goose
- [Ralph Wiggum: Autonomous Loops for Claude Code](https://paddo.dev/blog/ralph-wiggum-autonomous-loops/) — Technical analysis of the stop hook mechanism
- [Mastering Ralph Loops](https://linearb.io/blog/ralph-loop-agentic-engineering-geoffrey-huntley) — LinearB's deep-dive interview with Huntley
