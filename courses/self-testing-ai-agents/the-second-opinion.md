---
title: The Second Opinion
description: Why you want a different agent reviewing the first agent's work, and what kinds of mistakes a review bot actually catches that tests don't.
modified: 2026-04-09
date: 2026-04-06
---

Lunch is over. Pour yourself another coffee. We're switching gears.

Everything so far has been about giving _one_ agent the ability to check its own work. Playwright as muscle memory, HAR replay for determinism, visual regression for appearance, runtime probes for reality, dossiers for diagnosis—that's a lot of infrastructure, and it's all pointing inward at a single agent writing code against a single spec.

There's a class of problem this doesn't catch. I'm going to describe it, and then I'm going to tell you what to do about it.

## The problem: agents don't review themselves well

Here's the pattern I see. The agent writes a feature. It runs all the checks we built this morning. They all pass. Tests green, screenshots green, dossier empty, probe happy. The agent declares the task done.

You review the PR. And there's a problem nothing caught.

It might be a subtle security issue—the agent wrote an API handler that accepts a `userId` from the request body instead of reading it from the authenticated session, and now any user can modify any other user's shelf. Tests pass because the test sends the right `userId`. Playwright passes because the happy path works. The bug is real and it's shipping.

Or it might be a subtle logic issue—the agent wrote a sort function that works on the test fixtures but gets the tie-break wrong when two books have the same rating. Tests pass because the fixtures have unique ratings. Code review catches it because a human reads the function and goes "huh, what happens when these are equal?"

Or it might be a subtle convention issue—the agent wrote a new route handler that doesn't follow the same error-handling pattern as the other ten route handlers, and now your codebase has two ways of handling errors, and the next agent to touch this area is going to be confused.

None of these are test failures. All of them are review findings. And review is the one quality gate we haven't touched yet.

## Why tests don't catch review-worthy things

A test asks "does the code do what I said?" A review asks "did I say the right thing?" Those are different questions, and they need different tools.

The test can only check for things someone thought to check. If the person who wrote the test didn't think about the case where two books have the same rating, the test doesn't cover it. The agent writing the code sees the test, passes it, and moves on—perfectly rationally, because the test is its success signal.

Review catches the stuff tests didn't think to check. This is the classic human review value proposition, and the humans in your life are bad at it too, because review is slow and repetitive. But there's no reason the reviewer has to be human. A review bot is _specifically_ a different LLM reading the diff from outside the development loop, with a fresh context and no investment in making the change work.

And—here's the part that matters for the self-correcting loop thesis—**review bot findings are feedback the original agent can act on.** The review bot says "this handler trusts the request body for the user ID when it should use the session," the original agent reads that finding, fixes the handler, and reruns the tests. The loop closes. Without the bot, you were the bot, and you had better things to do.

## What review bots are actually good at

Let me set expectations. Review bots are not magic. They are limited in specific, knowable ways. Here's what they're good at and what they're not.

**Good at: noticing things that are off.** A review bot scans the diff with no stake in it passing, which makes it much better at "wait, what?" than the agent that wrote the code. Missing null checks. Unhandled error paths. Obvious security issues. Typos in log messages. Commented-out code. Inconsistent patterns with the rest of the file.

**Good at: flagging things a human reviewer would bring up.** The standard review comments—"consider extracting this," "this name is unclear," "why not use the helper that already exists?"—are the bread and butter of a good review bot. They surface questions that cause the author to look again.

**Bad at: deep domain reasoning.** A review bot doesn't know your product. It doesn't know that Shelf's rating scale is 1-5 and not 1-10. It doesn't know that `status: 'reading'` is a valid transition from `status: 'finished'` but not the reverse. It will not catch domain bugs unless they're paired with visible code smells.

**Bad at: knowing when to stop.** Review bots tend to leave a comment on every PR whether there's something to say or not. A review bot that always has opinions is a review bot that gets ignored. Tuning is part of using one well.

**Bad at: replacing tests.** A review bot is not a test. It's a second pass over the same code. Everything tests catch, tests should catch. The review bot covers the holes in the test suite, not the tests themselves.

## The review bot zoo

A few options. All are actively developed as of this workshop.

> [!NOTE]
> Review-bot pricing, entitlement, and repository-install flows shift quickly. Treat the comparisons in this lesson as an April 9, 2026 snapshot and check the current product docs before you make any of these tools part of required branch protection.

[**Cursor Bugbot**](https://docs.cursor.com/en/bugbot) is the one I'll be using as the primary example, because its posture fits the loop philosophy well. Bugbot comments on PRs with specific, actionable findings and doesn't try to summarize the change or rate it. It's opinionated in a way that produces follow-up commits instead of conversations. I've been using it on real projects and it's the first review bot that I haven't turned off after a week.

**GitHub Copilot review** is built into [GitHub pull requests](https://docs.github.com/en/pull-requests) on current Copilot-supported plans, but the exact rollout depends on plan and repository settings. It's more conversational than Bugbot—it writes a summary, makes suggestions, behaves more like a junior reviewer. The findings are hit-or-miss but it's friction-free to enable and it's already where your team is.

**Codex review** (OpenAI's) is the new entrant. It now plugs directly into GitHub pull request workflows, but the setup and product surface are still moving quickly enough that I would evaluate it on a pilot repo before I made it a required team gate.

**CodeRabbit** is a long-time dedicated review bot service. More configurable than the built-in options, more setup to get right, powerful once you do. If you want to tune review rules heavily, this is the one I'd evaluate.

**[Claude Code](https://docs.claude.com/en/docs/claude-code/overview) review** as a manual pattern, not a hosted product. You ask Claude Code to "review the diff on this branch" and it does. No CI integration, no PR comments, just a conversation. I use this more than any of the hosted options because it's infinitely tunable and it's already in my tool belt.

We're going to set up Bugbot on Shelf in the next lab. The patterns port to the others.

That last sentence matters more than it sounds like. Bugbot is the example for the core day because it is concrete and easy to teach. The appendix comes back and ports the same second-opinion loop to Copilot, Codex, and plain GitHub review so the process does not depend on one vendor.

## The rule of three

When a review bot flags the same kind of mistake three times across three different PRs, the problem isn't the code—it's the _instructions_. The agent keeps making the same mistake because nothing upstream is telling it not to.

That's when I edit `CLAUDE.md`. I add a rule that encodes the finding. Next time, the agent is less likely to make the mistake, the bot is less likely to flag it, and the loop gets tighter.

If the rule doesn't help after another three PRs, I escalate: lint rule, test assertion, something mechanical. Because if an instruction isn't catching it, the instruction isn't firing at the right time.

This is how review bot findings become permanent improvements to the whole loop. Every finding is a potential rule. Every rule that fires three times is a potential lint. Every lint that fires three times is a potential test. The loop is self-improving in a concrete, file-level way, and the review bot is one of the main feedback sources it runs on.

## What the bot is for, again

Tests: does it do what I said?
Probes: does it do what I expected when I try it?
Dossiers: what went wrong when it broke?
Review bot: did I say the right thing in the first place?

The review bot is the one that asks the question the test author didn't think to ask. That makes it valuable in a way the other layers are not. It also makes it noisier, and more annoying to tune, and sometimes wrong. Worth it anyway.

## The one thing to remember

A different agent reviewing the diff catches the class of mistake the original agent can't see because it's too close to the work. The review bot is your fresh set of eyes that doesn't get tired. Tune it, trust it on the things it's good at, ignore it on the things it's bad at, and turn its consistent findings into rules that feed back into the rest of the loop.

## Additional Reading

- [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md)
- [Review Portability Beyond Bugbot](review-portability-beyond-bugbot.md)
- [Lab: Bugbot on a Planted Bug](lab-bugbot-on-a-planted-bug.md)
