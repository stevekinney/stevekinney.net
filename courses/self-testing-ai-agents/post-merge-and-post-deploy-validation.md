---
title: Post-Merge and Post-Deploy Validation
description: Green pull requests are not the end of the loop. This is the layer that proves the deployment itself is healthy and tells you when to stop the rollout.
modified: 2026-04-14
date: 2026-04-06
---

CI going green is a great feeling. It is also not the same thing as "the deployment is healthy."

I've shipped enough "perfectly green" pull requests that still broke on the real environment to stop pretending otherwise. Wrong environment variables. Wrong redirect URL. Wrong cookie domain. Background job didn't boot. CDN served the old asset manifest. Database migration passed and the route still exploded on first real traffic. You only need a few of these before "CI passed" stops sounding like a victory speech.

So, this lesson is about the loop _after_ the merge gate.

> [!NOTE] Prerequisite
> This lesson assumes you've already wired [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md). CI is the last pre-merge gate. Post-deploy validation is the first post-merge one.

## The shape of the loop

If you're using [GitHub Actions environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments) or an equivalent deployment system, the loop follows this shape:

```mermaid
graph LR
  Merge["Merge to main"] --> Deploy["Deploy to preview or production"]
  Deploy --> Smoke["Run post-deploy smoke check"]
  Smoke -->|Pass| Monitor["Watch health window"]
  Smoke -->|Fail| Rollback["Rollback or stop the rollout"]
  Monitor -->|Healthy| Done["Done"]
  Monitor -->|Errors spike| Rollback
```

That's the whole lesson in a diagram.

The key idea: **deployment is not the end of automation. Deployment is the beginning of the next loop.**

## What post-deploy validation is actually proving

This layer is not rerunning your whole test suite for the drama of it. It is proving a smaller, sharper thing:

- the deployed URL is reachable
- the core route renders
- authentication still works if the route depends on it
- the primary read path and one primary write path still function
- the environment-specific wiring is correct

That is a smoke check, not a second CI pipeline.

For Shelf, the post-deploy smoke check can stay tiny:

- load the home page or shelf page
- confirm the critical heading renders
- confirm the seeded data or a known empty state shows up
- if auth is required, prove the storage state or login bootstrap still works against the deployed URL

Small is a feature here. If the post-deploy check takes ten minutes, nobody trusts it as a stop-ship signal.

### What the smoke spec actually looks like

A post-deploy smoke test is a regular Playwright spec in a dedicated directory so it does not run as part of the normal end-to-end suite. The only thing that makes it "post-deploy" is that it reads its target URL from an environment variable the deployment workflow injects, so the same file can run against a preview, a staging environment, or production without any code changes.

In the post-deploy lab, the named command that runs this route lives in `package.json` as `npm run test:smoke`, the spec lives at `tests/smoke/post-deploy.spec.ts`, and you can add a dedicated `playwright.smoke.config.ts` if you want the smoke run isolated from the main config. Those files are the concrete surface area of the loop.

```ts
// tests/smoke/post-deploy.spec.ts
import { expect, test } from '@playwright/test';

const smokeBaseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

test.use({ baseURL: smokeBaseUrl });

test('home page renders and exposes sign in', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
});
```

Two assertions. That's it. The completed Shelf version lives at `tests/smoke/post-deploy.spec.ts` and is often invoked through a dedicated `playwright.smoke.config.ts` so the default Playwright loop does not accidentally pick it up.

### The deployment workflow that runs the smoke check

The deployment workflow is where the smoke check gets its teeth. A minimal GitHub Actions shape:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
      - run: npm ci --ignore-scripts
      - run: npm run build
      - name: Deploy
        id: deploy
        run: |
          # Replace with your real deploy command. The important part
          # is that this step prints the deployed URL so the smoke job
          # can read it from the job output.
          echo "url=https://shelf-preview.example.com" >> "$GITHUB_OUTPUT"

  smoke:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
      - run: npm ci --ignore-scripts
      - run: npx playwright install --with-deps chromium
      - name: Run post-deploy smoke check
        env:
          SMOKE_BASE_URL: ${{ needs.deploy.outputs.url }}
        run: npm run test:smoke
      - name: Upload report on failure
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: smoke-report
          path: playwright-report/
          retention-days: 7
```

Two jobs. The first job does whatever your host needs to deploy and writes the deployed URL into `$GITHUB_OUTPUT` so the next job can read it. The second job installs Playwright, runs `npm run test:smoke` with `SMOKE_BASE_URL` pointing at that URL, and uploads the Playwright report if the check fails. If the smoke job goes red, the deploy either gets rolled back automatically or the workflow posts a stop-ship signal.

> [!NOTE] No deploy target yet?
> If your Shelf clone doesn't have a hosted deploy target, you can still practice the same loop locally: run `npm run build && npm run preview -- --host 127.0.0.1 --port 4173` in one terminal and `SMOKE_BASE_URL=http://127.0.0.1:4173 npm run test:smoke` in another. Record the gap in your runbook and wire up the real deploy workflow when you have a target.

## Preview targets count

You do not need a full production rollout to teach this loop well.

A deployment preview, a staging target, or even a build-and-preview job that exposes a stable URL is enough to practice the shape:

- deploy candidate artifact
- run smoke check against the deployed URL
- upload artifacts on failure
- decide whether to proceed

That is why I prefer teaching this on a preview target first. The loop is the point. The host is an implementation detail.

## The health window after the smoke test

Passing the smoke test is necessary. It is still not the whole story.

There is usually a short window after deploy where you want at least one more signal:

- error rate stayed flat
- request latency did not jump
- logs are not filling with obvious exceptions
- jobs and background workers are still healthy

I am not asking you to build a full observability stack in this course. I _am_ asking you to define what would trigger a rollback. If you do not define that rule ahead of time, every bad deploy becomes an argument instead of a decision.

## Rollback rules should be written before you need them

This is one of those delightfully unglamorous engineering habits that saves an unreasonable amount of stress.

Write the rollback trigger down:

- smoke check fails: rollback
- critical route 500s: rollback
- authentication broken: rollback
- error spike above agreed threshold in first N minutes: rollback or pause

Make the rule specific enough that an agent or a human can follow it without theater.

> [!WARNING] Ambiguous rollback rules
> "If it looks bad, we should probably revert" is not a rollback policy. That is a future argument in a pull request thread while users are already feeling the problem.

## What the agent needs here

The agent needs the exact same thing it has needed all day:

- a named command to run
- a target URL
- artifacts when the check fails
- a documented stop condition

If the deployment workflow says "run `npm run test:smoke` against `SMOKE_BASE_URL` and upload the Playwright report on failure," the agent can work with that. If the workflow says "manually look at the deploy and decide if vibes are good," congratulations, you have rebuilt yourself as the relay.

## The agent rules

```markdown
## Post-merge and post-deploy

- A green pull request is not the end of the loop. After merge or after
  a deploy preview is available, run the post-deploy smoke check against
  the deployed URL.
- Use the named smoke-test command and the deployment URL provided by the
  workflow or environment.
- If the smoke check fails, treat that as a stop-ship signal. Do not
  wave the deploy through in the summary.
- If rollback conditions are met, recommend rollback explicitly instead
  of describing the failure passively.
```

## How You Know the Loop Is Real

You have this loop when:

- a deployment or preview target exposes a stable URL
- a named smoke test runs against that URL automatically
- rollback triggers are written down before the deploy fails

## The one thing to remember

CI proves the change was mergeable. Post-deploy validation proves the deployment itself is healthy. Those are different claims, and if you only automate the first one, the second one is still your problem.

## Additional Reading

- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
- [Lab: Add Post-Deploy Smoke Checks to Shelf](lab-add-post-deploy-smoke-checks-to-shelf.md)
