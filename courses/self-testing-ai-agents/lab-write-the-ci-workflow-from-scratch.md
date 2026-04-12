---
title: 'Lab: Walk the Shelf CI Workflow'
description: Walk the GitHub Actions workflow Shelf ships. Understand why each job is shaped the way it is, verify every named step maps to a real local command, and prove each layer fails loud enough for an agent to recover.
modified: 2026-04-12
date: 2026-04-06
---

Shelf ships two GitHub Actions workflows at `.github/workflows/main.yml` and `.github/workflows/nightly.yml`. Your job in this lab is to open them, walk every job, and understand why each step is there. By the end you should be able to rebuild an equivalent workflow from scratch in your own project — not because you copied the YAML, but because you read it and understood the shape.

> [!NOTE] In the starter
> The whole workflow is already in place: `main.yml` has `static`, `unit`, and `end-to-end` jobs wired for push and pull request; `nightly.yml` has the scheduled slow-check cadence. This lab is a walkthrough — you are not writing YAML, you are reading it. The "break something and watch CI catch it" section at the bottom is the verification.

> [!NOTE] Prerequisite
> This lab assumes you've completed **Lab: Build a Failure Dossier for Shelf**. The `end-to-end` job calls `npm run dossier`, which is the script that lab walks. If you skipped it, go back and read that lab first so the dossier step below makes sense.

## The task

Open `.github/workflows/main.yml` in the Shelf starter. Walk each job with this lesson open alongside. For every step, ask: _what loop built earlier today is this step gating?_ When you can answer that for every step, you've done the lab.

## The shape

Open `.github/workflows/main.yml`. At the top you'll see the three things a workflow needs to be safe and predictable:

```yaml
name: Main

on:
  push:
  pull_request:

permissions:
  contents: read
```

`on:` lists the events. Push and pull request cover every code path into `main`. `permissions: contents: read` is the least-privilege default — the workflow can read the repo but cannot write to it. If you need to write (say, to comment on a PR), you opt in explicitly at the job level. Default-deny is cheaper than default-allow.

Then the three jobs: `static`, `unit`, `end-to-end`. They share the same setup shape — checkout, setup-node, cache, install — but each runs a different layer of the loop. `unit` and `end-to-end` both `needs: static`, so if lint, typecheck, knip, or gitleaks fail, the heavier jobs never start. Cheap gates run first.

The sections below walk each job. Open the file as you read.

## Walk the workflow

### The static job

The `static` job runs lint, typecheck, knip, and gitleaks in one job with sequential steps, not four jobs with dependencies. The setup overhead for separate jobs is larger than the benefit of splitting four short checks across four runners, and the gates are fast enough that sequencing them doesn't cost anything meaningful.

Notice the gitleaks steps in `main.yml`:

```yaml
- name: Install gitleaks
  run: |
    curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.28.0/gitleaks_8.28.0_linux_x64.tar.gz \
      | tar -xz -C /tmp gitleaks
    sudo install /tmp/gitleaks /usr/local/bin/gitleaks
    gitleaks version
- name: Secret scan
  run: gitleaks dir . --redact --config .gitleaks.toml
```

That's a direct CLI invocation, not the `gitleaks/gitleaks-action@v2` wrapper. The reason is operational: the action does a partial scan over `<prev>^..<current>` that fails on first-push branches with "no previous commit." A direct `gitleaks dir .` scans the whole working tree and cannot confuse itself about what "previous" means. If you build your own CI, prefer the direct CLI for the same reason.

Every named step maps to a real local command. Run these on a clean working tree:

```sh
npm run lint
npm run typecheck
npm run knip
npm run test:unit
gitleaks dir . --redact --config .gitleaks.toml
```

Each of those should exit zero. If any of them doesn't, that is the underlying loop failing, not a CI problem.

### The unit job

The `unit` job runs Vitest and `needs: static`. It reuses the same cache key. It doesn't need browsers, so Playwright install is skipped. Short, cheap, predictable.

### The end-to-end job

`end-to-end` is the biggest one, and it does one thing `static` and `unit` don't: it writes a `.env` file before running Playwright.

```yaml
- name: Create .env for preview server
  run: |
    cat > .env <<'EOF'
    DATABASE_URL=file:./tmp/ci.db
    ORIGIN=http://127.0.0.1:4173
    BETTER_AUTH_SECRET=ci-test-secret-ci-test-secret-ci-test-secret-32chars
    ENABLE_TEST_SEED=true
    OPEN_LIBRARY_BASE_URL=https://openlibrary.org
    EOF
    mkdir -p tmp
```

Three things worth noticing.

First, the values are hardcoded and obviously fake. `ci-test-secret-ci-test-secret-ci-test-secret-32chars` satisfies Better Auth's length check but it is **not a secret** and does not belong in GitHub Actions secret storage. It lives in the workflow file deliberately, because the `ci.db` it protects is created fresh every run.

Second, `ENABLE_TEST_SEED=true` is on. The seed endpoint is gated on that flag for safety — production environments never have it. CI runs need it because the e2e setup project POSTs to `/api/testing/seed` to seed alice and the books the tests assert against.

Third, `mkdir -p tmp` matters. `DATABASE_URL=file:./tmp/ci.db` assumes the directory exists; libsql errors with `ConnectionFailed` if it doesn't. One missing `mkdir` is the kind of thing that passes locally (because your local `tmp/` has been around since yesterday) and fails in CI (because the runner's checkout doesn't include empty directories).

After the `.env` bootstrap, the job runs `npm run test:e2e`. On failure it runs `npm run dossier`, uploads `playwright-report/` as one artifact and `playwright-report/dossier.md` as another, both with a 7-day retention. `playwright-report/` already contains the trace, screenshots, video, and the HTML report. The dossier is a separate upload so an agent can grab the summary without pulling the whole report tarball.

Shelf's `playwright.config.ts` already starts the preview server through `webServer`, so the workflow does **not** need an extra server-boot step. If you build a CI workflow for a project that doesn't, add `webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }` to the Playwright config first.

### The visual regression safety

The Playwright suite includes the screenshot tests from [Visual Regression as a Feedback Loop](visual-regression-as-a-feedback-loop.md). They run as part of the `end-to-end` job. Snapshot diffs land in `playwright-report/test-results/<spec>/` and get uploaded as part of the `playwright-report` artifact on failure. No separate upload step is needed.

### The nightly workflow

Open `.github/workflows/nightly.yml`. It runs on a cron schedule and on manual `workflow_dispatch`, and it carries the slow checks that do not belong on every pull request: HAR refresh, dependency audits, cross-browser full runs. The appendix labs ([Lab: Add a Nightly Verification Workflow](lab-add-a-nightly-verification-workflow.md), [Lab: Add Cross-Browser Coverage](lab-add-cross-browser-coverage.md)) expand each of these into a real loop. For this lesson, notice that the nightly file exists so the cadence is explicit, not implied.

> [!WARNING]
> Do **not** wire `playwright test --update-snapshots` into a scheduled job, even as a stub. A cron that updates snapshots will silently rewrite every visual baseline whenever it runs and quietly destroy your visual regression gate. Snapshot updates should always be human-triggered (a `workflow_dispatch` job, or local `--update-snapshots` followed by a PR you review).

### Branch protection

In the GitHub repo settings, enable branch protection on `main`:

- Require status checks: `static`, `unit`, `end-to-end`.
- Require up-to-date branches before merging.
- Disallow force pushes.

This turns the CI jobs into hard gates. The workflow by itself is just a script; branch protection is what makes it a gate you cannot route around.

## Acceptance criteria

- [ ] You opened `.github/workflows/main.yml` and read every step in each of the three jobs.
- [ ] You can point at the step that gates every layer built earlier today: lint, typecheck, knip, gitleaks, Vitest, Playwright, visual regression, the dossier upload.
- [ ] You understand why the gitleaks step uses the direct CLI instead of the `gitleaks-action@v2` wrapper (first-push branches).
- [ ] You understand why `end-to-end` writes a `.env` file with `ENABLE_TEST_SEED=true` and `mkdir -p tmp` before running Playwright.
- [ ] You understand why `unit` and `end-to-end` both `needs: static` and what happens to them if a lint error lands on a pull request.
- [ ] You ran the corresponding local commands (`npm run lint`, `typecheck`, `knip`, `test:unit`, `gitleaks dir . --redact --config .gitleaks.toml`) on a clean working tree and they all exited zero.
- [ ] You opened `.github/workflows/nightly.yml` and can name the slow checks it carries that do not belong on every pull request.
- [ ] If your repository has a Git remote, you pushed a deliberately broken commit (a lint error, or a failing Playwright assertion) to a throwaway branch and watched the corresponding job fail with the dossier attached.
- [ ] If your repository has a Git remote, branch protection is enabled on `main` requiring at least the `static` and `end-to-end` jobs to pass.

## Troubleshooting

- If Playwright fails in CI because Chromium is missing, verify that the workflow runs `npx playwright install --with-deps chromium` before `npm run test:e2e`.
- If the workflow YAML is valid but a named step does not exist locally, fix the repository command surface first. Do not solve that drift with workflow-only shell scripts.
- If you are using a clone of Shelf without a Git remote, stop at local command parity plus valid workflow files. Do not claim the hosted artifact-download loop is working until the repository is connected to GitHub.
- If you split the static checks into multiple jobs, make sure that decision is deliberate and explained. Shelf keeps them together because they are short and share the same setup cost.

## The agent loop check

The whole point of this lesson: when CI fails, can the agent recover without you?

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
- Hook the custom MCP from [Writing a Custom MCP Wrapper](writing-a-custom-mcp-wrapper.md) into a post-deploy smoke test: after a merge to main, run `verify_shelf_page` against the staging environment.
- Run Bugbot (if not already integrated) and make its completion a required status check.
- Write a single `workflow_dispatch` entry point that lets you manually run the whole pipeline against any branch from the GitHub UI.

## The one thing to remember

CI is where the whole day's worth of loops meet for the last check before merge. Every job should correspond to a loop you built during the workshop—[the static layer](the-static-layer-as-underlayment.md), [the Playwright tests](locators-and-the-accessibility-hierarchy.md), [the screenshots](visual-regression-as-a-feedback-loop.md), [the dossier](failure-dossiers-what-agents-actually-need-from-a-red-build.md). And every failure should be legible enough that the agent can recover without you. If CI works and the agent can't recover, the dossier is weak. If the agent can recover but CI is slow, your caching and parallelism need work. Tune both until the loop runs without you.

## Additional Reading

- [Solution](write-the-ci-workflow-from-scratch-solution.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
- [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
- [Capstone: The Whole Loop, End to End](capstone-the-whole-loop-end-to-end.md)
