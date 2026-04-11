---
title: 'Lab: Add a Nightly Verification Workflow'
description: Schedule the slow and broad checks, keep them off the fast loop, and make their failures readable enough that an agent can still act on them.
modified: 2026-04-11
date: 2026-04-06
---

This appendix lab turns the placeholder nightly story into a real workflow.

The goal is not to make the nightly workflow huge. The goal is to make it useful.

> [!NOTE] Prerequisite
> Complete [Nightly Verification Loops](nightly-verification-loops.md) first. This lab also assumes the cross-browser smoke command and the core CI commands already exist.

## The task

Create a nightly GitHub Actions workflow that runs the slow or broad checks you deliberately kept out of the fast pull-request loop.

## Step 1: create the workflow file

Create `.github/workflows/nightly.yml`.

Use both:

- `schedule`
- `workflow_dispatch`

I recommend scheduling it off the top of the hour. `17 8 * * *` is perfectly civilized.

The lesson's **The minimum nightly workflow** section in [Nightly Verification Loops](nightly-verification-loops.md) shows the full YAML skeleton including the `schedule` + `workflow_dispatch` pair, a real `dependency-audit` job using `npm audit --audit-level=high`, and an explicit echo-based placeholder job that keeps the shape visible in the GitHub UI until the real automation lands. Use that as your starting point.

## Step 2: add the right jobs

Pick two or three jobs that actually belong in nightly. A strong starter set:

- `cross-browser-smoke`
- `dependency-audit`
- `har-refresh-check` or another drift-sensitive upstream verification job

If you already added performance budgets, a broader runtime or bundle check can live here too.

## Step 3: keep the jobs readably separate

Each job should:

- run one named command
- upload artifacts on failure
- use finite `retention-days`
- write a short summary if the result needs explanation

Resist the urge to hide all of this behind one giant shell script. The workflow should stay legible in the GitHub UI.

## Step 4: define the failure handoff

Choose one of these follow-up paths and document it in the workflow comments or repository docs:

- open an issue
- open a pull request for machine-generated updates
- upload artifacts and require an agent or human to inspect them the next day

The important part is that you choose one. Nightly failures cannot just sit there being red in a tab nobody opens.

## Step 5: verify the unhappy path

Force one nightly job to fail on purpose:

- temporarily tighten a performance budget
- point the HAR refresh at a bad file
- break a cross-browser smoke assertion

Then confirm the workflow gives you:

- a clear red job name
- an artifact or summary
- a specific next action

If the next action is "someone should probably look into this someday," keep tightening the workflow.

## Acceptance criteria

- [ ] `.github/workflows/nightly.yml` exists
- [ ] The workflow uses both `schedule` and `workflow_dispatch`
- [ ] The schedule is not pinned to the top of the hour
- [ ] The workflow runs at least two jobs that are intentionally excluded from the fast pull-request loop
- [ ] Each nightly job maps to a named repository command
- [ ] Failure artifacts or summaries are uploaded with finite retention
- [ ] The repository documents how nightly failures turn back into normal work
- [ ] A deliberate failure produces a legible nightly run

## Troubleshooting

- If the nightly workflow looks like a second full CI pipeline, cut it down.
- If a job belongs on every pull request, move it out of nightly. Do not hide required checks in a cron.
- If the nightly failure output is thin, reuse the dossier and artifact patterns from the core loop instead of inventing a new reporting style.

## Stretch goals

- Add path filters or job conditions so especially expensive checks only run when the relevant parts of the repository changed recently.
- Open an issue automatically for nightly failures that are not machine-fixable.
- Add a weekly version of the workflow for the truly slow jobs and keep nightly for the moderate ones.

## The one thing to remember

Nightly work only earns its keep when it stays out of the fast loop _and_ still comes back as actionable evidence when it fails.

## Additional Reading

- [Solution](add-a-nightly-verification-workflow-solution.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
