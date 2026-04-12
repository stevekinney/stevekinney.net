---
title: Porting the Shelf Loop to Another Stack
description: The tools change when the framework changes. The loop structure does not. This appendix shows how to translate Shelf's feedback model to other stacks without losing the point.
modified: 2026-04-12
date: 2026-04-06
---

Shelf is a teaching app, not a religion.

If the loop only works in a SvelteKit + TypeScript toy repository, then we taught a demo, not an engineering pattern. This appendix is the translation layer.

I'm going to keep it at the level that actually matters: auth bootstrap, deterministic data, runtime probes, failure evidence, review, CI, and post-deploy checks. The details vary. The loop structure does not.

> [!NOTE] Prerequisite
> Finish the core course first. This appendix is easier once you've seen the full loop in Shelf and can tell which parts are structural versus incidental.

## The translation rule

Do not port file names. Port responsibilities.

That means:

- `CLAUDE.md` becomes "where the agent learns the repository rules"
- storage state becomes "how browser automation gets authenticated deterministically"
- seed data becomes "how the repository resets to known state"
- failure dossier becomes "the artifact bundle that makes a red run fixable"

Once you translate at that level, the stack mostly tells you where each piece wants to live.

## Next.js-style translation

For a React or Next.js stack, the shape is pleasantly close.

The official [Next.js testing guidance](https://nextjs.org/docs/pages/guides/testing) already assumes Playwright and unit-test tooling are normal parts of the workflow.

The mapping is usually:

| Shelf loop         | Next.js-style equivalent                                           |
| ------------------ | ------------------------------------------------------------------ |
| `CLAUDE.md` rules  | `AGENTS.md`, `CLAUDE.md`, or repo instructions file                |
| storage state auth | Playwright storage state or seeded test login route                |
| deterministic data | seed script, test database reset, or fixture loader                |
| Playwright suite   | Playwright end-to-end tests against the app router or pages router |
| static layer       | ESLint, TypeScript, dead-code checks, secret scan                  |
| dossier            | Playwright traces, screenshots, console logs, workflow artifacts   |

That is mostly a one-to-one translation.

## Rails-style translation

Rails is different in texture, not in need.

The [Rails testing guide](https://guides.rubyonrails.org/testing.html) already gives you system tests, fixtures, and a test environment. Those are the raw materials for the same loop.

The mapping looks more like this:

| Shelf loop                 | Rails-style equivalent                                       |
| -------------------------- | ------------------------------------------------------------ |
| `CLAUDE.md` rules          | `AGENTS.md`, repo docs, or prompt file the agent reads first |
| storage state auth         | system-test login helper, seeded user, or browser bootstrap  |
| deterministic data         | `test/fixtures`, factories, database reset tasks             |
| Playwright or browser loop | Rails system tests, Playwright, or both depending the team   |
| static layer               | RuboCop, Brakeman, type tooling if used, secret scan         |
| dossier                    | screenshots, logs, failing system-test output, CI artifacts  |

Rails gives you good primitives out of the box. The loop still needs to be made explicit for the agent.

## What not to port blindly

Do not copy Shelf's exact commands if your stack has better local primitives.

Examples:

- Rails system tests may be a better first browser loop than Playwright for some teams
- a monorepo may need path-scoped CI and instruction files
- a mobile-web hybrid app may need runtime probes against a preview build, not just localhost

The rule is still the same: cheap loops early, strict loops later, and failure output that an agent can actually use.

## The checklist I use when translating

For a new stack, I ask:

- Where do the agent rules live?
- How does the browser get logged in deterministically?
- How do I reset data to known state?
- What is the cheapest browser-level proof of correctness?
- What artifacts make a failure fixable?
- Which static checks should fire before CI?
- What is the post-deploy smoke path?

If I can answer those seven questions, I can usually port the loop cleanly.

If your destination stack is a monorepo, the concrete homes might look like `apps/web/playwright.config.ts` for the browser loop and `test/fixtures/users.yml` for deterministic seeded users. Different filenames, same responsibilities. That is the level to port.

## How You Know the Translation Worked

You have successfully translated the loop when:

- every core responsibility has a concrete home in the new stack
- the verification commands are explicit
- the failure artifacts are still legible enough for an agent to recover

## The one thing to remember

The stack is not the pattern. The pattern is "teach the agent the rules, give it cheap ways to check its own work, and make failures rich enough to fix." Port that, and the framework details stop being the interesting part.

## Additional Reading

- [The Whole Loop, End to End](capstone-the-whole-loop-end-to-end.md)
- [Lab: Translate the Shelf Loop to Your Stack](lab-translate-the-shelf-loop-to-your-stack.md)
