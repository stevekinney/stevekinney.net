---
title: 'Lab: Bugbot on a Planted Bug'
description: Set up Cursor Bugbot on Shelf, open a PR that contains a planted permission bug, and watch the loop close.
modified: 2026-04-09
date: 2026-04-06
---

Quick lab. Wire up Bugbot, open a PR containing a bug planted in the starter repo, and verify that Bugbot finds it and the agent can act on it without your help.

> [!NOTE]
> The local Shelf repository used for this workshop currently has no Git remote configured. In that workspace, treat the lab as two parts:
>
> 1. Local preparation: commit `.cursor/bugbot.md`, create the `planted-bug/admin-feature` branch, and verify the planted bug still passes the normal local test gates.
> 2. Hosted follow-up: once the repository is pushed to your fork, open the pull request and let Bugbot review it there.

## Setup

You'll need:

- A fork of the Shelf repo on your own GitHub.
- A Cursor account with Bugbot enabled (included in paid tiers as of the workshop date—check the Cursor dashboard).
- Admin access to install Bugbot on your fork.

Install Bugbot on your Shelf fork from the Cursor dashboard and grant it access. Confirm it's active by opening an existing PR—Bugbot should leave a comment within a minute or two.

Drop `.cursor/bugbot.md` in the repo root with the content from the previous lesson (tweak as needed). In the fully hosted version of the lab, commit it directly to `main`. In the local workshop repo, commit it on your current working branch now and merge it into `main` later when the fork exists.

> [!NOTE]
> **Third dry run validation**: The current local replay completed the preparation half of this lab and recorded the hosted gap in `ROADMAP.md`. That means `.cursor/bugbot.md` is committed and tuned, but the actual Bugbot review still depends on pushing the planted branch to a real GitHub fork.

## The planted bug

Check out the `planted-bug/admin-feature` branch:

```sh
git checkout planted-bug/admin-feature
```

In the published version of the workshop, this branch introduces the admin-feature endpoint and plants the bug in the same diff. In the local Shelf repository, that endpoint already exists from the preflight baseline, so the planted branch only weakens the permission check: it swaps `requireAdministrator(...)` for `requireViewer(...)` inside `/api/admin/featured-books`. The code still "works"—tests pass, the admin UI still shows featured books—but any signed-in reader can now call the endpoint.

Open a PR from `planted-bug/admin-feature` into `main`.

## What should happen

Within a minute or two of opening the PR, Bugbot should post at least one inline comment on the diff. With the tuned config file in place, the comment should:

- Identify the specific line where the permission check is wrong.
- Explain why it's wrong (e.g., "this checks `session.userId` but not `session.isAdmin`; any logged-in user can call this endpoint").
- Suggest a fix.

If Bugbot doesn't flag the bug on the first pass, that's useful information—you've found a gap in the config. Update `.cursor/bugbot.md` to include a rule about admin-only endpoints and push again. Iterate until the bot catches it. This is the tuning loop.

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

- [ ] `.cursor/bugbot.md` exists at the repo root and contains "what to flag" and "what to leave alone" sections.
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
- [ ] You committed `.cursor/bugbot.md` to `main` so future PRs inherit the config.
- [ ] The conversation log between you, Bugbot, and Claude Code contains zero messages where you had to explain the bug to anyone.

## Stretch goals

- Plant your own bug in a new branch and see if Bugbot finds it with the current config. If it doesn't, refine the config.
- Add a rule to `.cursor/bugbot.md` about a pattern specific to your real day-job codebase (not Shelf). See how the framing changes when the context is familiar instead of synthetic.
- Try the same lab with a different review bot—CodeRabbit, Copilot review, or Codex review—and compare the output on the same planted bug. Note which one was easier to tune, which found the bug first, and which produced actionable comments.
- Write a `CLAUDE.md` addition that automates the "read Bugbot comments, fix them, push" loop into a single command the agent can run.

## The one thing to remember

The goal isn't for Bugbot to find every bug. The goal is for Bugbot to find the bugs your tests didn't think to check, without noise, and for the original agent to be able to act on the findings without you playing secretary between them. When that loop works—bot flags, agent fixes, bot verifies—you've added a review pass to every PR for the cost of one config file.

## Additional Reading

- [The Second Opinion](the-second-opinion.md)
- [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md)
- [The Static Layer as Underlayment](the-static-layer-as-underlayment.md)
