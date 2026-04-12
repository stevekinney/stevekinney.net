---
title: 'Lab: Bugbot on a Planted Bug'
description: Set up Cursor Bugbot on Shelf, open a PR that contains a planted permission bug, and watch the loop close.
modified: 2026-04-12
date: 2026-04-06
---

This lab is mostly hosted process, not code authoring. The starter already ships the planted branch and the tuned reviewer config; your job is to run the review loop honestly and document what the hosted part still depends on.

> [!NOTE] Prerequisite
> Complete [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md) first. This lab assumes you already have a tuned reviewer configuration and are now pressure-testing it on a known bug.

> [!NOTE] In the starter
> Shelf already ships the baseline admin endpoint, the `planted-bug/admin-feature` branch, and a tuned `.cursor/BUGBOT.md`. This is a walkthrough of the hosted review loop, not a "write the config from scratch" exercise.

## What you can verify locally

You can inspect the planted branch, confirm the diff is only the missing admin guard, verify `.cursor/BUGBOT.md` is present, and run `npm run typecheck`, `npm run lint`, and `npm run test` to prove the local safety rails stay green even with the bug present. That local mismatch is the whole point of the lab.

```sh
npm run typecheck
npm run lint
npm run test
```

## What remains manual or external

Everything interesting after that depends on GitHub plus a live Bugbot installation: opening the pull request, waiting for the hosted reviewer to comment, handing the comment to an agent, and confirming the next push clears the thread. If you do not have a fork and a connected Bugbot install yet, stop after the local verification and record the hosted gap explicitly.

The Shelf starter already ships the baseline admin endpoint and a tuned `.cursor/BUGBOT.md`. Your job in this lab is to run the review loop end to end: fork or push the repo, open a PR from the `planted-bug/admin-feature` branch, wait for Bugbot to comment, hand the comment to Claude Code, and watch the fix land without you explaining the bug.

## Setup

You'll need:

- A fork of the Shelf repo on your own GitHub.
- A Cursor account with Bugbot enabled (included in paid tiers as of the workshop date—check the Cursor dashboard).
- Admin access to install Bugbot on your fork.

Install Bugbot on your Shelf fork from the Cursor dashboard and grant it access. Confirm it's active by opening an existing PR—Bugbot should leave a comment within a minute or two.

Open the shipped `.cursor/BUGBOT.md` in the repo root and compare it against the previous lesson's guidance. In the fully hosted version of the lab, commit it directly to `main`. In the local workshop repo, commit it on your current working branch now and merge it into `main` later when the fork exists.

## The planted bug

Check out the `planted-bug/admin-feature` branch:

```sh
git checkout planted-bug/admin-feature
```

The clean baseline's `/api/admin/featured-books/+server.ts` starts with `requireAdministrator(locals.user)` from `$lib/server/authorization`. The planted branch deletes that line and replaces it with a plain `if (!locals.user)` authentication check. Every signed-in reader can now feature or unfeature any book—but the happy-path tests all still pass because there is no test covering the case of a non-admin reader hitting the endpoint.

Open a PR from `planted-bug/admin-feature` into the main starter branch.

## What should happen

Within a minute or two of opening the PR, Bugbot should post at least one inline comment on the diff. With the tuned config file in place, the comment should:

- Identify the specific line where the permission check is wrong.
- Explain why it's wrong (e.g., "this checks `session.userId` but not `session.isAdmin`; any logged-in user can call this endpoint").
- Suggest a fix.

If Bugbot doesn't flag the bug on the first pass, that's useful information—you've found a gap in the config. Update `.cursor/BUGBOT.md` to include a rule about admin-only endpoints and push again. Iterate until the bot catches it. This is the tuning loop.

## Wiring the fix back through the agent

Once Bugbot flags the bug, don't fix it yourself. Hand the comment to Claude Code:

> Read the Bugbot comments on PR #1. Fix each finding. Push a new commit.

The agent should:

1. Read the comment text (via `gh pr view --comments` or similar).
2. Identify the affected line from the comment's file reference.
3. Apply a fix.
4. Push a new commit to the branch.

Bugbot re-reviews on the new push. Either the comment is resolved or a refined follow-up appears on the same line.

## Acceptance criteria

- [ ] `.cursor/BUGBOT.md` exists at the repo root and contains "what to flag" and "what to leave alone" sections.
- [ ] The `planted-bug/admin-feature` branch exists and introduces only the planted permission bug on top of the clean working branch.
- [ ] The planted branch still passes the local quality gates (`npm run typecheck`, `npm run lint`, `npm run test`).
- [ ] If the repository is still local-only, the hosted gap is documented somewhere durable (for example `ROADMAP.md`) instead of being hand-waved.
- [ ] Bugbot is installed on your Shelf fork and active on PRs.
- [ ] The `planted-bug/admin-feature` branch exists and has not been modified by hand after the planted-bug commit.
- [ ] A PR from `planted-bug/admin-feature` to `main` is open.
- [ ] Bugbot posted at least one comment on the PR. (If it didn't, update the config and re-push until it does.)
- [ ] At least one comment identifies the permission check bug on the intended line. (File and line info in the comment should match the planted location.)
- [ ] You handed the comment to Claude Code without any additional explanation of the bug.
- [ ] Claude Code applied a fix and pushed a new commit.
- [ ] Bugbot either resolved the thread on the new push or left a refined follow-up. No "the bug is still there" comments remain.
- [ ] You committed `.cursor/BUGBOT.md` to `main` so future PRs inherit the config.
- [ ] The conversation log between you, Bugbot, and Claude Code contains zero messages where you had to explain the bug to anyone.

## Stretch goals

- Plant your own bug in a new branch and see if Bugbot finds it with the current config. If it doesn't, refine the config.
- Add a rule to `.cursor/BUGBOT.md` about a pattern specific to your real day-job codebase (not Shelf). See how the framing changes when the context is familiar instead of synthetic.
- Try the same lab with a different review bot—CodeRabbit, Copilot review, or Codex review—and compare the output on the same planted bug. Note which one was easier to tune, which found the bug first, and which produced actionable comments.
- Write a `CLAUDE.md` addition that automates the "read Bugbot comments, fix them, push" loop into a single command the agent can run.

## The one thing to remember

The goal isn't for Bugbot to find every bug. The goal is for Bugbot to find the bugs your tests didn't think to check, without noise, and for the original agent to be able to act on the findings without you playing secretary between them. When that loop works—bot flags, agent fixes, bot verifies—you've added a review pass to every PR for the cost of one config file.

## Additional Reading

- [Solution](bugbot-on-a-planted-bug-solution.md)
- [The Second Opinion](the-second-opinion.md)
- [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md)
- [The Static Layer as Underlayment](the-static-layer-as-underlayment.md)
