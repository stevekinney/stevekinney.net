---
title: 'Lab: Add Post-Deploy Smoke Checks to Shelf'
description: Add a deployed-URL smoke test, wire it into a preview or deploy workflow, and document the rollback trigger before you need it.
modified: 2026-04-12
date: 2026-04-06
---

This lab is the part of the workshop where "green CI" stops being the finish line.

You're going to walk the tiny post-deploy smoke check Shelf already ships, prove you understand each moving part locally, and then name the hosted gap honestly if you do not have a real deploy target yet.

> [!NOTE] Prerequisite
> Complete [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md) first. This lab also assumes the CI workflow from [Lab: Write the CI Workflow from Scratch](lab-write-the-ci-workflow-from-scratch.md) exists or is at least sketched out.

> [!NOTE] In the starter
> Shelf already ships `tests/smoke/post-deploy.spec.ts`, the `test:smoke` script in `package.json`, `docs/post-deploy-playbook.md`, and the matching `.github/workflows/deploy.yml` shape. This lab is a walkthrough and verification pass, not a blank-page authoring exercise.

## The task

Open the shipped smoke test, the shipped script, the shipped playbook, and the shipped workflow. Make sure you can explain why each one exists, then run the local stand-in so you know what the hosted version is supposed to prove.

## What you can verify locally

You can do the whole first pass locally: inspect `tests/smoke/post-deploy.spec.ts`, confirm `package.json` exposes `npm run test:smoke`, read `docs/post-deploy-playbook.md`, and walk `.github/workflows/deploy.yml`. If you do not have a hosted target, use a local preview stand-in and make sure the smoke spec still fails loudly when you break it on purpose.

## What remains manual or external

The real post-deploy loop starts only when a connected preview or production-like URL exists. Capturing the deployed URL from the host, running the smoke job against that URL, and treating a failure as an actual stop-ship signal are hosted concerns. If that environment does not exist yet, document the gap instead of pretending the local preview is the full loop.

## Step 1: inspect the deployed-URL smoke spec

Open `tests/smoke/post-deploy.spec.ts` in the Shelf repository.

Keep it small. The test should prove only the most important path:

- the URL loads
- the main route renders
- one critical UI affordance is present

If auth is required, reuse the existing storage-state or login bootstrap. Do not build a second authentication story just for this lab.

The spec should read from an environment variable such as `SMOKE_BASE_URL` so the same test can run against preview, staging, or production.

The lesson shows the exact spec shape in the **What the smoke spec actually looks like** section of [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md). Compare the shipped file against that two-assertion skeleton and make sure you can defend why it stays this small.

## Step 2: inspect the named smoke-test command

Open `package.json` and find the smoke-test command:

```json
{
  "scripts": {
    "test:smoke": "playwright test tests/smoke/post-deploy.spec.ts"
  }
}
```

The workflow should set `SMOKE_BASE_URL`. The test command should stay boring.

> [!NOTE] Shelf uses a split config
> The shipped Shelf version of this script is `"test:smoke": "playwright test --config=playwright.smoke.config.ts"`—a separate Playwright config scoped to the smoke suite. The split exists so the smoke run doesn't inherit the main config's `webServer` block, its authenticated project, or the pinned `workers: 1` (which matters when the smoke target is a hosted URL, not a local SQLite file). Both shapes work. Shelf already picked the split-config version because the hosted target has different concerns from the local web server.

## Step 3: inspect the rollback playbook

Open `docs/post-deploy-playbook.md`.

Document:

- what URL the smoke test targets
- what counts as a stop-ship failure
- who or what rolls back the deployment
- which health signals you watch for the first few minutes after deploy

This file exists so the agent can make a crisp recommendation instead of narrating a problem vaguely.

## Step 4: inspect the workflow wiring

Open `.github/workflows/deploy.yml`. The lesson's **The deployment workflow that runs the smoke check** section has the same two-job shape (deploy + smoke). Compare the shipped file against the lesson and make sure you can point at the step that captures the URL and the step that consumes it.

The minimal shape:

- trigger on `push` to `main` or `workflow_dispatch`
- deploy to your preview, staging, or production-preview target
- capture the deployed URL
- run `npm run test:smoke` with `SMOKE_BASE_URL` set to that URL
- upload the Playwright report on failure

If you do **not** have a real hosted target yet, use a local build-and-preview stand-in, run the smoke test against `http://127.0.0.1:4173`, and document the hosted gap honestly in `docs/post-deploy-playbook.md`.

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

- [Solution](add-post-deploy-smoke-checks-to-shelf-solution.md)
- [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
