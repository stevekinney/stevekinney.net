---
title: 'Lab: Write the CI Workflow from Scratch'
description: Build the GitHub Actions workflow for Shelf from an empty directory. Prove each layer runs, uploads artifacts, and fails loud enough for an agent to recover.
modified: 2026-04-06
date: 2026-04-06
---

One of the deliberate choices in the Shelf starter repo: there is no `.github/workflows/` directory. You are writing the workflow from scratch, informed by everything you've built today. If you had a broken workflow waiting for you, Shelf would have looked perpetually red in CI for the last six modules, and that would have been a terrible background noise. Blank canvas, your choice, now you have context.

## The task

Create `.github/workflows/main.yml` that runs on push and on pull request, and includes jobs for every layer we built today.

## The structure

At minimum:

```yaml
name: Main

on:
  push:
  pull_request:

jobs:
  static:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Cache
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.cache/ms-playwright
          key: ${{ runner.os }}-deps-${{ hashFiles('**/bun.lockb') }}
      - name: Lint
        run: bun run lint
      - name: Typecheck
        run: bun run typecheck
      - name: Dead code
        run: bun run knip
      - name: Secret scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  unit:
    runs-on: ubuntu-latest
    needs: static
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun test

  end-to-end:
    runs-on: ubuntu-latest
    needs: static
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      - name: Run Playwright
        run: bun playwright test
      - name: Generate dossier
        if: failure()
        run: bun run dossier
      - name: Upload report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
      - name: Upload dossier
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: failure-dossier
          path: playwright-report/dossier.md
          retention-days: 7
```

That's the skeleton. You'll flesh it out in the steps below.

## Step-by-step

### Step 1: the static job

Write the `static` job first. It should run lint, typecheck, knip, and gitleaks. These are fast and independent; keep them in one job with sequential steps, not four jobs with dependencies—the setup overhead for separate jobs isn't worth it for sub-30-second steps.

Verify by pushing to a feature branch and watching the job run.

### Step 2: the unit job

Add the `unit` job. It depends on `static` so it doesn't run if static checks fail. It runs `bun test` against the Vitest suite.

### Step 3: the end-to-end job

Add the `end-to-end` job. This is the biggest one:

- Install Chromium (`bunx playwright install --with-deps chromium`).
- Run the Playwright suite.
- On failure, generate the dossier and upload both the HTML report and the dossier as artifacts.
- Optionally: start the dev server if your Playwright config doesn't do it automatically (check `webServer` in `playwright.config.ts`).

### Step 4: the visual regression safety

Your Playwright suite includes the screenshot tests from Module 4. They'll run as part of the `end-to-end` job. Add a step to upload the snapshot diffs as artifacts on failure—`playwright-report/` probably already includes them, but double-check.

### Step 5: the nightly workflow

Create a separate file, `.github/workflows/nightly.yml`:

```yaml
name: Nightly

on:
  schedule:
    - cron: '0 4 * * *' # 4 AM UTC
  workflow_dispatch:

jobs:
  har-refresh:
    # ... re-record HARs against the real API and open a PR with the diff
  dependency-audit:
    # ... run `bun audit` and open an issue if new findings
  cross-browser:
    # ... full Playwright matrix (chromium, firefox, webkit)
```

You don't have to fully implement the HAR refresh today—a stub that runs `bunx playwright test visual.spec.ts --update-snapshots --project=chromium,firefox,webkit` is fine. The point is to have the file in place so the nightly cadence exists.

### Step 6: branch protection (optional, but recommended)

In the GitHub repo settings, enable branch protection on `main`:

- Require status checks: `static`, `unit`, `end-to-end`.
- Require up-to-date branches before merging.
- Disallow force pushes.

This turns the CI jobs into hard gates.

## Acceptance criteria

- [ ] `.github/workflows/main.yml` exists.
- [ ] Workflow runs on both `push` and `pull_request`.
- [ ] `static` job runs lint, typecheck, knip, and gitleaks as named steps.
- [ ] `unit` job runs Vitest and depends on `static`.
- [ ] `end-to-end` job runs Playwright, depends on `static`.
- [ ] On failure, the `end-to-end` job runs `bun run dossier` and uploads both `playwright-report/` and `playwright-report/dossier.md` as artifacts.
- [ ] Artifacts have a `retention-days` set to something finite (e.g., 7).
- [ ] The workflow uses `actions/cache@v4` to cache dependencies and Playwright browsers.
- [ ] The workflow uses `fail-fast: false` anywhere a matrix strategy is used (or notes that no matrix is used).
- [ ] Every job uses `uses: actions/checkout@v4` and `uses: oven-sh/setup-bun@v2` (or your equivalent).
- [ ] Pushing a clean commit to a feature branch runs the workflow and every job exits zero.
- [ ] Pushing a commit with a deliberate lint error fails the workflow at the `static` job, and subsequent jobs (`unit`, `end-to-end`) are skipped.
- [ ] Pushing a commit with a failing Playwright test produces a workflow run with the dossier artifact attached. Downloading the artifact with `gh run download` shows the dossier markdown.
- [ ] `.github/workflows/nightly.yml` exists and runs on a cron schedule.
- [ ] Branch protection is enabled on `main` requiring at least the `static` and `end-to-end` jobs to pass.

## The agent loop check

The whole point of this module: when CI fails, can the agent recover without you?

Create a feature branch with a deliberate bug that only CI catches—something environment-specific. One easy option: a test that uses a local-only environment variable (`process.env.MY_MACHINE`) and fails when CI runs it on a fresh Linux box.

Push the branch. Wait for CI to fail.

Open Claude Code. Say:

> The latest CI run on branch `<branch-name>` failed. Download the dossier artifact, read it, diagnose the failure, propose a fix, and push a new commit.

The agent should:

1. Use `gh run list` or `gh run view` to find the failed run.
2. Use `gh run download` to pull the dossier artifact.
3. Read the dossier.
4. Identify the environment-specific issue.
5. Fix it.
6. Push.

The new CI run should go green. You shouldn't need to paste a single error message.

### Agent loop acceptance

- [ ] You gave the agent only the branch name and the instruction to read the dossier.
- [ ] The agent retrieved the dossier from the GitHub Actions run without you copying it.
- [ ] The agent identified the root cause from the dossier alone.
- [ ] The agent pushed a fix that made CI green on the next run.
- [ ] You did not need to paste any error messages into the conversation.

## Stretch goals

- Add a matrix strategy to the `end-to-end` job so Playwright runs against Chromium, Firefox, and WebKit on every run (or gate the matrix to PRs only to save minutes).
- Add Playwright sharding to the `end-to-end` job to parallelize the suite across multiple runners.
- Add a PR comment step that posts a summary of test results and links to artifacts, using the [GitHub Actions PR comment action](https://github.com/marketplace/actions/add-pr-comment) or equivalent.
- Hook the custom MCP from Module 5 into a post-deploy smoke test: after a merge to main, run `verify_shelf_page` against the staging environment.
- Run Bugbot (if not already integrated) and make its completion a required status check.
- Write a single `workflow_dispatch` entry point that lets you manually run the whole pipeline against any branch from the GitHub UI.

## The one thing to remember

CI is where the whole day's worth of loops meet for the last check before merge. Every job should correspond to a loop you built during the workshop—the static layer from Module 8, the tests from Module 3, the screenshots from Module 4, the dossier from Module 6. And every failure should be legible enough that the agent can recover without you. If CI works and the agent can't recover, the dossier is weak. If the agent can recover but CI is slow, your caching and parallelism need work. Tune both until the loop runs without you.

## Additional Reading

- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
- [Capstone: The Whole Loop, End to End](capstone-the-whole-loop-end-to-end.md)
