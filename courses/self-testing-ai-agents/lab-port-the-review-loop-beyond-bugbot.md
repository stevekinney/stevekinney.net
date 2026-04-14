---
title: 'Lab: Port the Review Loop Beyond Bugbot'
description: Keep Bugbot if you have it, but write the repository rules so a second review surface can pick up the same job without guesswork.
modified: 2026-04-14
date: 2026-04-06
---

This appendix lab is half tooling and half policy. That is deliberate.

If the review loop only works with one product, the process is not really encoded in the repository yet. It is encoded in the current team's memory and billing settings. We're going to fix that.

> [!NOTE] Prerequisite
> Complete [Review Portability Beyond Bugbot](review-portability-beyond-bugbot.md) first. This lab assumes you already understand the portable parts of the loop.

## The task

Keep the existing Bugbot setup if you use it, then document and wire one alternate review surface so the second-opinion loop survives a tool change.

## Step 1: write the neutral playbook

Create `docs/review-loop-playbook.md` in the Shelf repository.

Document:

- which findings are blocking
- which findings need judgment
- which findings count as noise
- what "the rule of three" means in this repository
- how a repeated finding escalates into `CLAUDE.md`, a lint rule, or a test

This file is the stable part of the loop.

The lesson's **What the review playbook looks like** section in [Review Portability Beyond Bugbot](review-portability-beyond-bugbot.md) has a complete 30-line skeleton for Shelf's playbook. Copy that as your starting point and edit the blocking rules to match whatever your codebase actually cares about. The Shelf starter doesn't ship the finished version — you are authoring it here.

## Step 2: choose one alternate review surface

Pick one surface besides Bugbot:

- GitHub Copilot review
- Codex review
- a manual GitHub pull request review flow driven by an agent prompt

You do **not** need to enable every tool on earth. You do need to make one alternate path concrete.

## Step 3: add the instruction surface for that tool

Examples:

- If you choose Copilot, add `.github/copilot-instructions.md`.
- If you choose a Codex-based review flow, add a repository prompt file or review note that the reviewer can actually read.
- If you choose manual GitHub review, add `docs/review-agent-prompt.md` with the exact prompt you use to ask for a diff review.

The alternate reviewer should be told the same things Bugbot is told:

- what correctness means here
- what patterns are forbidden
- what categories of finding matter most
- how much noise is too much noise

## Step 4: define the re-review path

Write down exactly how the loop repeats after a fix.

Examples:

- push a new commit and let the hosted reviewer rerun
- request re-review
- rerun the agent prompt against the updated diff

If that path is not explicit, the loop breaks the first time someone tries to use it under pressure.

## Step 5: test the process on a planted diff

Use a small planted problem in Shelf:

- an unhandled null path
- a route handler that reads trustable data from the wrong place
- a suspicious naming or consistency issue

Run both review surfaces if you can. If you only have one available today, at least dry-run the second surface by checking whether your new instruction file and playbook would give it enough context to find the issue.

## Acceptance criteria

- [ ] `docs/review-loop-playbook.md` exists
- [ ] The playbook defines blocking, judgment, and noise categories
- [ ] The playbook documents the escalation path from repeated finding to instruction, lint rule, or test
- [ ] One alternate review surface besides Bugbot is chosen and documented
- [ ] The instruction surface for that alternate reviewer exists in the repository
- [ ] The re-review path after a fix is written down explicitly
- [ ] The planted diff is reviewed by the available review surface or dry-run against the written process

## Troubleshooting

- If the alternate tool has no real instruction-file surface, fall back to a repository prompt or playbook. The point is portable process, not feature envy.
- If the reviewer leaves too much noise, tighten the severity buckets before you tighten the product settings.
- If the same planted issue would obviously slip past the alternate reviewer, your repository instructions are not specific enough yet.

## Stretch goals

- Add a short table to the playbook that maps Bugbot, Copilot, Codex, and manual GitHub review to their trigger and instruction surfaces.
- Add a path-specific instruction file for a sensitive area such as auth or data writes.
- Review three recent real pull requests and identify one repeated finding category that should become an upstream rule.

## The one thing to remember

Portable review loops come from written policy, not tool loyalty. If the repository explains how a second reviewer should behave, swapping review surfaces becomes annoying instead of catastrophic.

## Additional Reading

- [Solution](port-the-review-loop-beyond-bugbot-solution.md)
- [Review Portability Beyond Bugbot](review-portability-beyond-bugbot.md)
- [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md)
