---
title: 'Lab: Add Post-Deploy Smoke Checks to Shelf'
description: Add a deployed-URL smoke test, wire it into a preview or deploy workflow, and document the rollback trigger before you need it.
modified: 2026-04-09
date: 2026-04-06
---

This lab is the part of the workshop where "green CI" stops being the finish line.

You're going to add a tiny post-deploy smoke check that runs against a preview or deployed URL, uploads artifacts on failure, and gives the agent a real stop-ship signal after merge.

> [!NOTE] Prerequisite
> Complete [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md) first. This lab also assumes the CI workflow from [Lab: Write the CI Workflow from Scratch](lab-write-the-ci-workflow-from-scratch.md) exists or is at least sketched out.

## The task

Add a smoke test for Shelf's deployed URL and wire it into a preview or deployment workflow.

## Step 1: add a deployed-URL smoke spec

Create `tests/smoke/post-deploy.spec.ts` in the Shelf repository.

Keep it small. The test should prove only the most important path:

- the URL loads
- the main route renders
- one critical UI affordance is present

If auth is required, reuse the existing storage-state or login bootstrap. Do not build a second authentication story just for this lab.

The spec should read from an environment variable such as `SMOKE_BASE_URL` so the same test can run against preview, staging, or production.

## Step 2: expose a named smoke-test command

Add a command such as this to `package.json`:

```json
{
  "scripts": {
    "test:smoke": "playwright test tests/smoke/post-deploy.spec.ts"
  }
}
```

The workflow should set `SMOKE_BASE_URL`. The test command should stay boring.

## Step 3: write the rollback playbook

Create `docs/post-deploy-playbook.md`.

Document:

- what URL the smoke test targets
- what counts as a stop-ship failure
- who or what rolls back the deployment
- which health signals you watch for the first few minutes after deploy

This file exists so the agent can make a crisp recommendation instead of narrating a problem vaguely.

## Step 4: wire the workflow

Create or update `.github/workflows/deploy.yml`.

The minimal shape:

- trigger on `push` to `main` or `workflow_dispatch`
- deploy to your preview, staging, or production-preview target
- capture the deployed URL
- run `npm run test:smoke` with `SMOKE_BASE_URL` set to that URL
- upload the Playwright report on failure

If you do **not** have a real hosted target yet, use a local build-and-preview stand-in:

- `npm run build`
- `npm run preview`
- run the smoke test against `http://127.0.0.1:4173`
- document the hosted gap honestly in `docs/post-deploy-playbook.md`

That still teaches the loop.

## Step 5: verify the failure path

Break the smoke test on purpose once.

Examples:

- assert the wrong heading
- point `SMOKE_BASE_URL` at the wrong route
- remove the expected element temporarily

Then confirm the workflow or local preview run:

- fails loudly
- writes a report artifact
- gives you enough evidence to recommend rollback or stop-ship

If the failure path is mushy, the loop is not done.

## Acceptance criteria

- [ ] `tests/smoke/post-deploy.spec.ts` exists
- [ ] The smoke test reads the deployed base URL from `SMOKE_BASE_URL` or an equivalent environment variable
- [ ] `package.json` exposes a named smoke-test command
- [ ] `docs/post-deploy-playbook.md` exists and includes rollback triggers
- [ ] `.github/workflows/deploy.yml` exists or the existing deploy workflow runs the smoke test after deploy
- [ ] On failure, the workflow uploads a Playwright report or equivalent artifact
- [ ] The current green deployment target or preview target passes the smoke test
- [ ] A deliberate failure produces a red run and a legible failure artifact

## Troubleshooting

- If the smoke test works locally but not on the deployed URL, assume environment drift first: cookies, callbacks, base URL, secrets, and build-time variables are the usual suspects.
- If you have no hosted target yet, stop at the build-plus-preview version and document the gap explicitly. Do not claim you have a post-deploy loop when you have a thought experiment.
- If the smoke check is bloated, cut it down. Post-deploy smoke tests should feel like a tripwire, not a second full regression suite.

## Stretch goals

- Add a workflow summary step that prints the deployed URL and the smoke-test status.
- Upload a failure dossier alongside the Playwright report.
- Add a manual approval gate on the deployment environment before production rollout.

## The one thing to remember

The smoke test after deploy should be small enough to trust, fast enough to run every time, and sharp enough to tell you when the rollout needs to stop.

## Additional Reading

- [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
