---
title: 'Sentinels: The Quiet Power of a Touched File'
description: >-
  How I use sentinel files to gate the risky moves my coding agents make—exiting
  plan mode, opening a pull request, addressing review feedback, backing off a
  rate-limited model. The whole mechanism is a file on disk and a hook that
  checks for it.
date: 2026-06-01
modified: 2026-06-01
tags:
  - ai
  - agents
  - tooling
---

You know what's really annoying? When you write some instructions in `AGENTS.md` or `CLAUDE.md` and then the agent ignores them. Absolutely rage-inducing.

I spend a lot of time thinking about the architecture and design of a given project, defining the tasks, adding acceptance criteria and all of that fun stuff. In a perfect world, if I do all of that planning up front, I should be able to let agents do a lot of unsupervised work. They plan, they write code, they open pull requests, they grind through review feedback until CI goes green. Most of that is fine to run on autopilot. But, a handful of moves are the kind you don't get to take back cleanly. Exiting plan mode and committing to an approach. Running `gh pr create` and putting a half-baked PR in front of a human who trusts me. Hammering a model's API right after it told me to slow down. Those are the moments where I want a gate—something that says "you may not do this yet, and here's exactly what has to be true first." Ask me how many times I've watched an agent cheerfully open a PR the second I looked away.

The thing I keep reaching for to build those gates is almost embarrassingly simple (or, at least it took _me_ way too long to arrive at this station). It's a file. An empty one, usually. The presence of the file means "the precondition was met"; its absence means "not yet, go do the work." We call these **sentinels**, and once you start seeing them as a coordination primitive instead of a hack, they show up everywhere in my setup.

> [!NOTE] A confession about scope
> This is how _I_ wired up my own [Claude Code](https://code.claude.com/docs/) skills and hooks. It's not a framework or a thing you install. It's a pattern, and the pattern is what I want you to walk away with—not my exact file paths. Also, I am constantly tweaking all of this stuff and whatever I include here will be woefully out of date in a matter of weeks—or days, possibly. If y'all hassle me enough, maybe I'll add a [gist](https://gist.github.com) or something.

## What a sentinel actually is

Here's the thing the fancy word is hiding: a sentinel is just a piece of state that lives outside the conversation. The agent's context window is volatile—it gets summarized, compacted, thrown away between iterations. Disk doesn't. So when I need one step to leave a durable signal that a _later_ step can check, I write a file. The check is a [hook](https://code.claude.com/docs/en/hooks): a small script the harness runs at specific moments in the agent's lifecycle—before a tool call, when the agent exits plan mode, when it tries to stop—and which can look at the filesystem and decide whether to let that moment proceed. Crucially, a hook runs in the harness, not in the agent, so it's a check the agent can't simply reason its way past.

That's the whole shape of it. One side produces the file, the other side blocks until it exists. If you've ever used a `.lock` file, a `PID` file, or a CI job that won't deploy until a `build-succeeded` artifact shows up, you basically already have the gist. The novelty here isn't the mechanism—it's pointing it at a non-deterministic agent.

Here's why that matters. I can't trust the agent to _remember_ that it ran a review three messages ago, because three messages ago might not exist anymore. But I can absolutely trust that a file is on disk. The sentinel moves the proof out of the model's head and into a place the model can't accidentally forget.

## Don't leave plan mode until Codex signs off

The first place this earned its keep is my plan-review gate. When an agent is in plan mode, it's drafting an approach but hasn't been allowed to touch anything yet. Exiting plan mode is the commitment—the moment it stops planning and starts doing. I don't want that to happen until a second model—[Codex](https://developers.openai.com/codex/), a different model family I call out to from my own skills—has adversarially picked the plan apart and grudgingly approved it.

So there's a hook on the `ExitPlanMode` tool. Before the agent is allowed to exit, the hook hashes the plan text and looks for a file named for that hash:

```text
tmp/plan-review/plan-<hash>.approved
```

The hash is based on the current contents of the plan. If the plan changes, the approval is no longer good.

No file, no exit. The hook blocks the call and routes a message back to the model: here's the plan hash I computed, here's the sentinel I'm waiting for, go run the review skill. The skill then runs the actual loop—Codex reviews, the agent addresses the feedback, Codex re-reviews, around and around until Codex emits a bare-line `APPROVED` or the loop hits its cap. Only then does the skill `touch` the sentinel. The agent retries `ExitPlanMode`, the hook finds the file, and the gate opens.

The detail I'm proudest of—and the one that bit me before I got it right—is that the hook hashes the plan text **byte-for-byte**. The sentinel is named after the hash of the _exact plan that got approved_. If the agent edits the plan after approval, even by a single trailing newline, the hash changes and the old sentinel no longer matches.

That sounds annoying. It's the point. An edited plan is a different plan, and a different plan hasn't been reviewed. The byte-for-byte hash means you can't approve a plan, quietly "clean up the markdown," and sneak the edited version past the gate. The most common way I tripped this myself was a smart-quote autocorrect on paste, or a CRLF sneaking in—one invisible byte, totally different hash, gate slams shut. So the hook is helpful about it: when it blocks, it lists the hashes it _does_ have approvals for, so the agent can spot a near-miss and realize the plan drifted by one character between approval and exit.

## Don't open the PR until the committee agrees

The second gate is the same trick on a different door. My committee-review skill puts a panel of subagents—architecture, testing, types, simplicity, developer experience—plus Codex in front of every pull request _before_ a human ever sees it. The rule is blunt: do not run `gh pr create` until the committee reaches consensus.

There's a `PreToolUse` hook watching for commands that match the shape of `gh pr create`. It checks for an approval marker before letting the call through, and the skill only writes that marker after the committee has actually signed off. Same idea as the plan gate—the proof of "we did the review" lives on disk, not in the agent's increasingly suspect memory.

But this one has a wrinkle that taught me something about how brittle a single sentinel can be. The skill writes _two_ markers, not one:

```bash
touch "$MARKER" /tmp/committee-review-approved
```

The first is keyed to the current working directory, so two reviews running in parallel [worktrees](https://git-scm.com/docs/git-worktree)—separate checkouts of the same repo—don't stomp each other. The second is a generic marker with a short time-to-live, and the gate accepts _either_ one. Why both? Because the skill that writes the marker and the hook that reads it don't always agree on what the current directory is—a worktree, a symlink, a subtly different path—and I'd rather the gate be resilient than watch a perfectly good PR get blocked because two scripts disagreed about `pwd`. The keyed marker is the precise answer; the generic one is the fallback that keeps the whole thing from being precious about paths it shouldn't be precious about.

I won't pretend that fallback is free. The generic marker is deliberately less precise, and during its short life it'll happily bless _any_ `gh pr create` that comes along—including, in principle, an unrelated PR in another directory. That's the trade: a touch more blast radius in exchange for not deadlocking on a path mismatch. The mitigation is keeping the time-to-live short and the warning loud, but it's a concession, and I'd rather name it than have you find it.

There's a second, sneakier rule here that's worth calling out: writing the marker and running `gh pr create` have to be _separate_ tool calls. The harness sees a whole shell invocation as a single tool call, and the hook fires once, before any of that invocation runs. So if you cram "write the marker `&&` create the PR" into one command, the hook fires before the `touch` half has executed—the marker doesn't exist yet, and the gate blocks the very thing you were trying to do. The fix isn't to be cleverer about the one-liner; it's to stop writing one-liners across a gate. The proof has to land in its own call, and finish, before the action it's guarding runs in the next. Sequence is the whole point: a sentinel only works if it's already on disk when the bouncer looks.

## Keeping the loop alive with a promise

Both gates so far are permission slips checked by a `PreToolUse` hook—they guard a single tool call. But committee-review needs something subtler too: a way to keep the _loop itself_ alive across rounds. I stole this idea from [the Ralph Wiggums loop](/writing/the-ralph-loop).

One round of review almost never closes the deal. The committee finds must-fix items, the agent implements them, and now everything needs a fresh look. So the skill leans on a `Stop` hook—a hook that fires when the agent tries to end its turn. As long as the work isn't done, the hook intercepts the stop and feeds the review prompt back in for another round. The agent doesn't get to walk away.

What tells the hook the work _is_ done is a token in the agent's own final output:

```text
<promise>Committee consensus reached and PR opened</promise>
```

Until that string shows up, the Stop hook sees no promise and re-fires the loop. And I want to be precise about what this does and doesn't buy you, because it's the opposite of the file gates on one important axis. A token the agent emits in its own output is, by construction, the agent's to emit whenever it likes—the hook can only check that the string is _present_, not that the claim behind it is _true_. So the promise isn't a hard-to-fake proof the way a hash-named file is. It can't be, because it lives in exactly the place I spent this whole post telling you not to trust.

What it actually does is narrower and still worth it: it changes the _default_. No promise means keep looping, full stop. The failure mode I'm guarding against isn't an agent that lies about consensus—it's an agent that gets tired and quietly stops after round one with must-fix items still open. The promise is a specific, unusual string the agent won't emit by accident in a summary, so absent it, the loop refuses to end. That's all it guarantees: it prevents _silent_ premature exit. It does not prove the work happened, and it can't stop an agent that decides to emit the token early or dishonestly. The real verification—did the committee actually approve, did the PR actually open—is done by the file sentinels and the skill's own steps, and even those are only as trustworthy as the scripts that write them. The promise just keeps the agent in its seat until those have had their say.

This is also where the address-pr skill lives—the part of the loop that takes review comments, human and bot, and grinds through them until CI is green. Same keep-going-until-the-promise machinery: the agent doesn't get to call it done just because it's bored.

## A sentinel that means "stop trying"

Everything so far has been a way of saying "you may"—you may exit, you may open the PR, you may finally walk away. The last sentinel says the opposite, and it's the one I find most quietly useful: "don't bother." I call it the doghouse.

Every one of those review loops leans on Codex, and Codex—like any API you don't own—occasionally rate-limits you or just falls over. The naive thing is to let every skill that calls Codex discover this independently, each one paying the full timeout, waiting the whole five minutes to find out what the last one already learned. So when any Codex caller hits a rate limit or an outage, it writes a sentinel at a shared, well-known path:

```text
$HOME/.codex-doghouse
```

Every Codex-wrapping skill checks for that file first. If it's there, the skill fails fast _out of the Codex call_ instead of hanging—it already knows Codex is down. (Failing fast out of the call doesn't mean failing the whole workflow; what happens next is the fail-warn question I get to below.) And because the sentinel lives in `$HOME` rather than any one repository, a rate-limit hit by the plan-review loop _backs off the committee-review loop too_. One caller learns the lesson; every caller benefits.

The part that keeps this from becoming a permanent off-switch is the time-to-live. The doghouse sentinel carries a timestamp and expires after an hour. After the cooldown, the next check sees a stale file, treats Codex as available again, and the system quietly recovers. I learned to add the expiry the hard way—the first version had no clock, Codex blipped once at 9am, and I didn't notice every review had been silently skipping it until I went looking that afternoon and found a dead file from hours ago still sending everything to voicemail. A circuit breaker that never resets isn't a circuit breaker; it's a fuse you forgot you blew.

## What gets harder

I don't want to sell you a clean story, because sentinels have sharp edges and you'll find them the same painful way I did.

The big one is **drift between the writer and the reader**. The plan gate's byte-for-byte hash is a feature, but it means the producer and the consumer have to agree on the exact bytes, and "exact bytes" is a surprisingly hard contract to keep when markdown reformatting, line endings, and autocorrect are all conspiring against you. Every time I've debugged a "why won't this gate open" mystery, the answer was a one-byte difference I couldn't see.

The second is that **a hook matching on command text is advisory, not a vault**. The PR-create gate matches on the shape of the command, and a determined agent—or a slightly different command spelling—can route around it. These gates encode intent and catch the honest mistakes; they are not a security boundary against an adversary. I treat them as guardrails, not walls, and I don't pretend otherwise.

And the third is the failure philosophy you have to commit to up front: what happens when the sentinel _can't_ be produced? For the Codex gates I chose fail-warn—and it's worth untangling that from the doghouse's fail-_fast_, because they sound like opposites and aren't. Fail-fast is about _detection_: the doghouse lets a caller find out Codex is down in milliseconds instead of hanging for the full timeout. Fail-warn is about _consequence_: having found out, the skill writes a separate bypass marker, touches the same approval sentinel the gate is waiting for, surfaces a loud warning, and proceeds. A flaky second-opinion model should never permanently block me from opening a PR. But that's a deliberate choice with a real cost, and the cost is right there in the naming: the gate is satisfied by a file called `.approved` even though Codex never approved anything—it never ran. The bypass marker sitting next to it is the only on-disk record of _why_, and the warning is the only thing that carries that context forward to me. So "approved" here quietly means "approved, or bypassed and flagged," and you have to trust the warning to tell the two apart. You have to decide, per gate, whether a missing sentinel means _stop_ or means _proceed with a warning_. Get that wrong and you've either built a system that deadlocks on a network blip or one that waves everything through the moment a dependency hiccups.

## The pattern underneath

Once you've built a few of these, the shape stops being about plans or PRs or rate limits and starts being about one idea: **move the proof out of the conversation and onto the disk, then make a hook the bouncer.**

An agent's memory is the least trustworthy place to store "did we already do the thing." The context window is volatile by design—it's _supposed_ to forget, that's how it stays fast. So anything you actually need to be true at a specific gate, you write down somewhere the agent is far less likely to lose—and you put a dumb little script, running outside the agent, in front of the door to check for it. Not "somewhere the agent can't fake," because as we've seen, a determined agent often can. The win is more modest and more real: you've turned "the agent claims it's fine" into "an external check requires an explicit signal on disk," and that's a much harder thing to wave past by accident. Let the agent be clever and unpredictable in the middle. Keep the doors boring.

That's the trade I keep making, and I haven't regretted it once. The smartest part of my agent setup is the part that's just an empty file.
