---
title: Performance Budgets as a Feedback Loop
description: Functional and visually correct is not enough if the change made the app slower or heavier. Budgets turn that into a real gate.
modified: 2026-04-09
date: 2026-04-06
---

There is a class of bug agents are weirdly good at introducing: the feature works, the tests pass, the screenshot matches, and the page is now noticeably slower.

Nobody writes that bug on purpose. It still ships all the time.

So, this module is about adding one more loop: a cheap, boring, enforceable performance budget. Not a heroic one. Not a "let's do a full observability program before lunch" one. Just enough of a gate that an agent cannot quietly double your route weight or turn a fast interaction into a sticky one.

> [!NOTE] Prerequisite
> This lesson assumes you've already wired visual regression. Screenshot diffs tell you _what changed visually_. Performance budgets tell you whether the same change also made the application heavier or slower.

## Why performance needs its own loop

Most of the loops we've built so far answer correctness questions.

- Does the UI behave?
- Does it still look right?
- Does the code follow the rules?
- Did a second reviewer spot anything odd?

Performance is different because the failure mode is usually not binary. The page still renders. The form still submits. The bug is that it now takes 900 milliseconds longer, or the route chunk grew by 140 kilobytes, or the loading state sits on-screen just long enough to feel sticky.

That kind of regression slips past every other loop unless you decide, ahead of time, that certain numbers are not allowed to drift quietly.

That's what a budget is: a limit with consequences.

## The two-budget model

I do not want a giant performance program in a one-day workshop. I want two numbers the agent can actually enforce.

The model:

- **Build-time budget**: how big did the shipped client bundle get?
- **Runtime budget**: how long did one critical route or interaction take in a reproducible environment?

That is enough to catch most accidental regressions.

## Build-time budgets: catch weight gain early

In the validated website repository for this course, `applications/website/package.json` already exposes `bun run build:stats`, and the Vite configuration writes `build/stats.html` plus `build/stats.json` when bundle stats are enabled. That is the exact shape I would copy into Shelf.

The point is not the plugin. The point is that a green build produces machine-readable numbers you can compare against a threshold in version control.

What I want from the build-side loop:

- total client bundle size
- biggest route or entry chunk
- stable output file the agent can parse

If those numbers jump, the loop goes red before the regression has a chance to become "well, it still technically works."

## Runtime budgets: catch slowness where the user feels it

Build size is not the same thing as runtime speed. Sometimes the bundle barely changes and the route still gets slower because a query now runs twice, a component renders too much, or the page does expensive work on load.

This is where the [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data) and Playwright traces earn their keep.

I want one targeted runtime budget, not an entire dashboard:

- the `/shelf` route must load under a chosen threshold in a production-like preview
- or the "rate a book" interaction must complete under a chosen threshold

Pick one flow users actually feel. Measure it the same way every time. Store the threshold. Fail when it drifts.

That is enough to make the loop real.

## Why I am not defaulting to Lighthouse here

I like Lighthouse. I also know what happens when people wire it in too early: they drown in scores, environment noise, and advice that is technically correct but useless to the task at hand.

For this workshop, I want the cheaper loop:

- build stats for weight
- one reproducible runtime measurement for speed
- Playwright trace or browser timing data when the number goes bad

Once that loop is stable, _then_ you can layer in bigger tooling. But I would not start there.

> [!NOTE] Measurement discipline
> Measure runtime budgets against a stable preview target, not a hot-reloading dev server. If the environment changes every run, the number is telling you about the environment, not the feature.

## How to set the numbers without making them fake

The wrong way: invent ambitious numbers out of thin air and watch the team disable the check by Thursday.

The right way:

1. Measure the current green state.
2. Decide what drift is acceptable.
3. Store the threshold in version control.
4. Tighten later if the team proves it can hold the line.

I usually start with "current baseline plus a small buffer" because it keeps the loop honest. The budget exists to catch accidental regressions first. Optimization heroics can come later.

## What the agent should do when the budget breaks

When the budget breaks, I want the agent to behave exactly the way it behaves on a failing test:

- inspect the changed files
- inspect the build stats or trace
- identify the thing that got heavier or slower
- fix it or explicitly propose a budget change

The last part matters. A budget is allowed to change. But the change should be deliberate, reviewed, and explained, not smuggled in because the agent wanted the check to stop yelling.

## What goes in `CLAUDE.md`

```markdown
## Performance budgets

- After UI or bundle-affecting changes, run the performance budget
  checks before declaring the task done.
- Track two things: build-size drift and one critical runtime
  measurement on a production-like preview target.
- If a budget fails, inspect the stats or trace before guessing at a
  fix.
- Do not raise a budget just to make the check pass. If the budget needs
  to change, explain why in the summary or commit message.
```

## Success state

You have this loop when:

- the repository emits build stats the agent can parse
- one runtime-critical flow has a reproducible timing threshold
- the agent treats budget failures as real failures, not advisory output

## The one thing to remember

Performance budgets are not about chasing perfect scores. They are about making regressions impossible to ignore. Pick two numbers that matter, enforce them consistently, and let the agent trip over them before your users do.

## Additional Reading

- [Visual Regression as a Feedback Loop](visual-regression-as-a-feedback-loop.md)
- [Lab: Add Performance Budgets to Shelf](lab-add-performance-budgets-to-shelf.md)
