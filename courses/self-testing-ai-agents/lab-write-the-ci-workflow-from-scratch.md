---
title: 'Lab: Write the CI Workflow from Scratch'
description: Build the GitHub Actions workflow for Shelf from an empty directory. Prove each layer runs, uploads artifacts, and fails loud enough for an agent to recover.
modified: 2026-04-09
date: 2026-04-06
---

One of the deliberate choices in the Shelf starter repo: there is no `.github/workflows/` directory. You are writing the workflow from scratch, informed by everything you've built today. If you had a broken workflow waiting for you, Shelf would have looked perpetually red in CI for the last six modules, and that would have been a terrible background noise. Blank canvas, your choice, now you have context.

> [!NOTE] Prerequisite
> This lab assumes you've completed **Lab: Build a Failure Dossier for Shelf**. The workflow below calls `npm run dossier`, which is the script you added to `package.json` in that lab. If you skipped it, either go back and do it, or remove the dossier-related steps from this workflow before running it.

> [!NOTE]
> If `gitleaks/gitleaks-action@v2` is not available under your plan or licensing terms, replace that step with a direct CLI invocation. The CI gate matters more than the wrapper action.

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
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Cache
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            ~/.cache/ms-playwright
          key: ${{ runner.os }}-deps-${{ hashFiles('package-lock.json') }}-playwright-${{ hashFiles('playwright.config.ts') }}
      - name: Install dependencies
        run: npm ci --ignore-scripts
      - name: Lint
        run: npm run lint
      - name: Typecheck
        run: npm run typecheck
      - name: Dead code
        run: npm run knip
      - name: Secret scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  unit:
    runs-on: ubuntu-latest
    needs: static
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci --ignore-scripts
      - run: npm run test:unit

  end-to-end:
    runs-on: ubuntu-latest
    needs: static
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci --ignore-scripts
      - run: npx playwright install --with-deps chromium
      - name: Run Playwright
        run: npm run test:e2e
      - name: Generate dossier
        if: failure()
        run: npm run dossier
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

Write the `static` job first. It should run lint, typecheck, knip, and gitleaks. These are fast and independent; keep them in one job with sequential steps, not four jobs with dependencies. The setup overhead for separate jobs is larger than the benefit of splitting four short checks across four runners.

If your repository has a Git remote, verify by pushing to a feature branch and watching the job run. Without a remote, validate the YAML locally and make sure every workflow step maps to a real local command:

```sh
npm run lint
npm run typecheck
npm run knip
npm run test:unit
npm run test:e2e
```

The hosted `gitleaks/gitleaks-action@v2` step is the one part you cannot execute locally without GitHub Actions. Local parity there means your repository-level `gitleaks` configuration and staged-file secret scan already work before the workflow ever exists.

### Step 2: the unit job

Add the `unit` job. It depends on `static` so it doesn't run if static checks fail. It runs `npm run test:unit` against the Vitest suite.

### Step 3: the end-to-end job

Add the `end-to-end` job. This is the biggest one:

- Install Chromium (`npx playwright install --with-deps chromium`).
- Run the Playwright suite.
- On failure, generate the dossier and upload both the HTML report and the dossier as artifacts.
- Optionally: start the dev server if your Playwright config doesn't do it automatically (check `webServer` in `playwright.config.ts`).

Shelf's `playwright.config.ts` already starts the preview server through `webServer`, so the workflow does **not** need an extra server boot step. Before writing the workflow step, verify this applies to your config: run `npx playwright test --project=chromium` without starting a server manually. If it fails with "no server running," add `webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }` to `playwright.config.ts` first.

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
    # ... run `npm audit` and open an issue if new findings
  cross-browser:
    # ... full Playwright matrix (chromium, firefox, webkit)
```

You don't have to fully implement these jobs today. Shelf ships each nightly job as a named placeholder with an `echo` command that explains the intended follow-up. The point is to have the file in place so the nightly cadence exists and the missing automation is explicit instead of implied.

The appendix modules come back and turn these placeholders into real cross-browser and nightly loops. For the core day, the explicit placeholder is enough.

> [!WARNING]
> Do **not** wire `playwright test --update-snapshots` into a scheduled job, even as a stub. A cron that updates snapshots will silently rewrite every visual baseline whenever it runs and quietly destroy your visual regression gate. Snapshot updates should always be human-triggered (a `workflow_dispatch` job, or local `--update-snapshots` followed by a PR you review).

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
- [ ] On failure, the `end-to-end` job runs `npm run dossier` and uploads both `playwright-report/` and `playwright-report/dossier.md` as artifacts.
- [ ] Artifacts have a `retention-days` set to something finite (e.g., 7).
- [ ] The workflow uses `actions/cache@v4` to cache dependencies and Playwright browsers.
- [ ] The workflow uses `fail-fast: false` anywhere a matrix strategy is used (or notes that no matrix is used).
- [ ] Every job uses `uses: actions/checkout@v4` and `uses: actions/setup-node@v4` (or your equivalent).
- [ ] In the local workshop repo, the workflow files parse as valid YAML and every named step maps to a real local command that exits the way the workflow expects.
- [ ] If your repository has a Git remote, pushing a clean commit to a feature branch runs the workflow and every job exits zero.
- [ ] If your repository has a Git remote, pushing a commit with a deliberate lint error fails the workflow at the `static` job, and subsequent jobs (`unit`, `end-to-end`) are skipped.
- [ ] If your repository has a Git remote, pushing a commit with a failing Playwright test produces a workflow run with the dossier artifact attached. Downloading the artifact with `gh run download` shows the dossier markdown.
- [ ] `.github/workflows/nightly.yml` exists and runs on a cron schedule.
- [ ] If your repository has a Git remote, branch protection is enabled on `main` requiring at least the `static` and `end-to-end` jobs to pass.

## Troubleshooting

- If Playwright fails in CI because Chromium is missing, verify that the workflow runs `npx playwright install --with-deps chromium` before `npm run test:e2e`.
- If the workflow YAML is valid but a named step does not exist locally, fix the repository command surface first. Do not solve that drift with workflow-only shell scripts.
- If you are using a clone of Shelf without a Git remote, stop at local command parity plus valid workflow files. Do not claim the hosted artifact-download loop is working until the repository is connected to GitHub.
- If you split the static checks into multiple jobs, make sure that decision is deliberate and explained. Shelf keeps them together because they are short and share the same setup cost.

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

- [ ] If your repository has a Git remote, you gave the agent only the branch name and the instruction to read the dossier.
- [ ] If your repository has a Git remote, the agent retrieved the dossier from the GitHub Actions run without you copying it.
- [ ] If your repository has a Git remote, the agent identified the root cause from the dossier alone.
- [ ] If your repository has a Git remote, the agent pushed a fix that made CI green on the next run.
- [ ] If your repository has a Git remote, you did not need to paste any error messages into the conversation.

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
- [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
- [Capstone: The Whole Loop, End to End](capstone-the-whole-loop-end-to-end.md)
