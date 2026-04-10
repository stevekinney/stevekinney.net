---
title: 'Lab: Translate the Shelf Loop to Your Stack'
description: Map every core feedback loop from Shelf to your real stack so the course ends with an implementation plan you can actually use.
modified: 2026-04-09
date: 2026-04-06
---

This appendix lab is the bridge back to real life.

You're going to take the loops from Shelf and map them onto the stack you actually use, or onto a reference stack like Next.js or Rails if you want a dry run first.

> [!NOTE] Prerequisite
> Complete [Porting the Shelf Loop to Another Stack](porting-the-shelf-loop-to-another-stack.md) first. This lab assumes you are translating responsibilities, not blindly copying file names.

## The task

Create a concrete translation map from the Shelf workshop loop to another stack you care about.

## Step 1: create the translation document

Create `LOOP_TRANSLATION.md` in the root of the target repository, or in a scratch directory if you are doing this as a planning exercise.

The file should have one row each for:

- agent instructions
- unit and integration tests
- browser-level verification
- auth bootstrap
- deterministic data reset
- runtime probes
- failure dossier artifacts
- static layer
- CI workflow
- post-deploy smoke checks
- review loop

## Step 2: fill in exact paths and commands

Do not stop at conceptual labels. Write the actual file paths and commands.

Bad:

- "we would have some tests here"

Good:

- "`apps/web/playwright.config.ts`"
- "`bin/rails test:system`"
- "`pnpm lint && pnpm typecheck`"
- "`test/fixtures/users.yml`"

If the target repository does not have that piece yet, write the missing file or command explicitly as the proposed addition.

## Step 3: identify the weakest loop

Pick the one gap most likely to force a human back into the relay role.

Examples:

- no deterministic auth bootstrap
- no browser-level smoke test
- failure output too thin to be agent-fixable
- no review instructions for a second opinion

Write down the first concrete change that would tighten that gap.

## Step 4: add one proof-of-life command

Pick one loop from the map and actually prove it can run.

Examples:

- run the unit suite
- run the browser smoke test
- run the static checks
- generate the failure artifact from a deliberate failure

This keeps the exercise from turning into architecture fiction.

## Acceptance criteria

- [ ] `LOOP_TRANSLATION.md` exists
- [ ] Every core Shelf loop has a mapped responsibility in the target stack
- [ ] The document includes exact paths and commands, not only concepts
- [ ] The weakest current loop is identified explicitly
- [ ] The document names one concrete first improvement for that weak loop
- [ ] At least one mapped verification command has been run or dry-run verified

## Troubleshooting

- If you find yourself copying file names mechanically, go back and translate the responsibility instead.
- If the target stack has two plausible places for one loop, pick one and justify it. Ambiguity is the enemy here.
- If the repository is missing half the loops, that is fine. The point is to make the missing pieces explicit and ordered.

## Stretch goals

- Translate the loop twice: once for a JavaScript stack and once for a Rails-style stack.
- Add a second column to `LOOP_TRANSLATION.md` marking which loops are already automated versus still manual.
- Turn the translation file into the backlog for the next quarter's verification work.

## The one thing to remember

A translation map is valuable when it tells the next engineer exactly where each loop lives and what command proves it. Anything fuzzier than that is still just vibes.

## Additional Reading

- [Porting the Shelf Loop to Another Stack](porting-the-shelf-loop-to-another-stack.md)
- [The Hypothesis](the-hypothesis.md)
