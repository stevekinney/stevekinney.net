---
title: My Ridiculous AI-Assisted Development Workflow
description: >-
  A walkthrough of the system I use to ship code with AI agents—from planning in
  Linear to worktrees, linting gauntlets, and a small army of code review bots.
date: 2026-03-11
modified: 2026-03-17
tags:
  - ai
  - tooling
  - workflow
---

I've been shipping a lot of code lately. More than I should be able to, honestly, given that I'm one person with a day job and the same 24 hours as everyone else. The secret—if you can call it that—is a system I've built around AI agents that handles most of the mechanical work while I focus on the decisions that actually matter. It's over-engineered. It costs me several hundred dollars a month. It is probably making the Earth a little warmer. But it works _really_ well, and I want to walk through how it all fits together.

## Planning in Linear

Everything starts in [Linear](https://linear.app)—which is basically Jira for hipsters. I plan out every feature, bug fix, and refactor as a ticket with a structure that isn't particularly unique: acceptance criteria, an implementation plan, a testing plan, and a list of dependencies. The framework is boring on purpose. The interesting part is _how_ those plans get made.

I spend a lot of time in [Codex](https://openai.com/codex/) getting the plans right—partly because it's good at this kind of structured thinking, and partly because rate limits mean I might as well be productive while I wait for my other tools to come back online. I also spend a good deal of time on the dependency graph. By the time I'm done, I know what order things need to happen in, what can run in parallel, and what's blocking what. Any given ticket is a pretty solid plan in and of itself.

## The junior engineer loop

One of the things I do—either during planning or right after, depending on my mood—is run a loop where a group of "expert" agents draft a plan and then a separate agent I call the "junior engineer" tears it apart.

The junior engineer's job is to ask a thousand questions and rattle off every single thing that's unclear. It's basically Grace—or any [Turing School](https://turing.edu/) student, honestly. "What happens if the API returns a 429 here?" "You said _update_ the record, but what if it doesn't exist yet?" "This acceptance criterion is ambiguous—do you mean X or Y?" That kind of thing.

I keep the loop going until either the junior engineer runs out of questions or I suspect I'll need to take out a second mortgage to cover the API costs. The goal is to front-load as much clarity as possible so the implementation phase doesn't turn into a research project.

## Worktrees and parallel execution

Once the plans are solid, I set up [Git worktrees](https://git-scm.com/docs/git-worktree) so I can run multiple tasks in parallel. Because I already mapped out the dependency graph, I know which tickets can execute concurrently and which ones need to wait. Each worktree gets its own Claude Code session.

Sessions start in plan mode for one last check. Maybe something changed since I wrote the tickets—a dependency got merged, the API surface shifted, whatever. I read through the plan and hassle it until I'm satisfied. I have a lot of stupid preferences and this is where they get enforced. Once the plan looks right, it's off to the races.

## Guardrails, not guardrailing

I let the agent do its thing. This is the part where I mostly sit back—but not entirely. I have a draconian set of linting rules and a ridiculous amount of test coverage, and you can't commit _or_ push to a pull request until they've all been satisfied. The linter and the test suite are the real supervisors here. I'm just the person who hovers over the escape key when I see the agent about to do something stupid.

This is the key insight, if there is one: I don't spend my time telling the agent _how_ to write code. I spend my time building constraints that make bad code impossible to ship. The linting rules catch style drift. The tests catch regressions. The commit hooks catch everything else. The agent can flail around as much as it wants, as long as what comes out the other end passes the gauntlet.

## The pull request gauntlet

Once the code is ready, we open a pull request. In GitHub, I have a bunch of code review agents set up—Codex, Cursor, and Copilot. All three hammer at the PR and leave review comments. They each catch different things. Codex tends to be more thorough about logic. Cursor catches patterns. Copilot is good at the obvious stuff.

At this point, I am _also_ reading through the pull request. GitHub's review UI is literally their core product and it's better for this than trying to diff across multiple worktrees in my editor. I also have a draconian set of CI checks in place. Nothing moves forward until every review comment has been resolved. I will personally resolve the ones that I think are stupid—because sometimes the robots are wrong and someone has to be the adult in the room.

## The learning loop

Every time I kick a PR back because it's not good enough, I have the agent take notes on _why_ it failed and what it can do better next time. This is the part that compounds. The mistakes from Tuesday become the guardrails for Wednesday.

Every once in a while, I run a script that tells an agent to go update all of my documentation, skills, and rules based on everything that went down. I also have a hook that enforces a simple rule: if you're going to touch a file in a directory and there's a README in that directory, you have to read it first. If you edit a file, you need to check whether the README needs updating. It's a small thing, but it keeps the documentation from rotting.

## Merge criteria

The merge criteria are simple and non-negotiable:

- Zero unresolved review comments.
- CI is passing.
- No conflicts with `origin/main`.

That's it. When all three conditions are met, we merge. Not before.

## Morning QA

Every morning, I play QA engineer. I pull up whatever got merged the day before and nitpick everything. Is the code organized the way I want? Did the agent name things well? Are there abstractions that shouldn't exist, or missing abstractions that should? This is where I catch the stuff that linters and tests can't—the aesthetic and architectural choices that only a human with opinions would care about.

At various points, I've had scripts that automate parts of this ritual. But then something like [Skills](https://docs.anthropic.com/en/docs/claude-code/skills) comes out and I unwind the automation to try a new approach. So, it's gotten a bit more vanilla over the last few days. The manual-ness is a feature, not a bug—it lets me change my thinking without having to refactor a pipeline.

## Is it worth it?

Look, I'm not going to pretend this is normal. The whole setup costs me several hundred dollars a month between API calls, multiple AI subscriptions, and the CI minutes to support it all. I'm probably contributing a non-trivial amount to global warming. My electricity bill has opinions.

But the output is real. I'm shipping features at a pace that would have required a small team a few years ago. The code quality is—if anything—_higher_ than what I'd produce on my own, because the review gauntlet catches things I'd let slide at 11 PM on a Tuesday. And the learning loop means the whole system gets a little better every week.

The trick isn't any single piece of it. It's the _composition_. Planning that's thorough enough to parallelize. Constraints that are strict enough to let agents run unsupervised. Review that's redundant enough to catch what any single reviewer would miss. And a feedback loop that turns every failure into a future guardrail.

Is it over-engineered? Absolutely. Does it work? Also absolutely.
