---
title: 'Add a Nightly Verification Workflow: Solution'
description: Walkthrough of the shipped nightly workflow—schedule timing, job structure, placeholder honesty, and the gap between parsing YAML locally and running it on Actions.
modified: 2026-04-14
date: 2026-04-10
---

The nightly workflow is where the slow checks live. Everything in this file was deliberately excluded from the pull-request loop because it's either too slow, too broad, or too dependent on external state to run on every push. That doesn't make it less important—it makes it important on a _different cadence_.

## What to add

### `.github/workflows/nightly.yml`

Let's walk the file top to bottom.

**Triggers:**

```yaml
on:
  schedule:
    - cron: '17 4 * * *'
  workflow_dispatch:
```

Two triggers. `schedule` runs the workflow every day at 04:17 UTC. `workflow_dispatch` lets you trigger it manually from the GitHub Actions tab—useful for testing the workflow itself without waiting until tomorrow.

The `17` in the cron expression is not a magic number. It's intentionally _off_ the top of the hour. GitHub Actions has a well-documented stampede problem: thousands of workflows scheduled at `0 4 * * *` all fire at the same time, which means your job sits in a queue. Moving to minute 17 (or 23, or 41—anything but 0) avoids the worst of the contention. It's a one-character fix that can save 10-15 minutes of queue time.

**Permissions:**

```yaml
permissions:
  contents: read
```

Least privilege. The nightly workflow reads the repository and runs checks. It doesn't need write access, doesn't need to push commits, doesn't need to open issues (yet). When you add an issue-opener job later, you'll bump this—but start restrictive and widen as needed, not the other way around.

**Job 1: HAR refresh**

```yaml
har-refresh:
  name: Refresh HAR fixtures
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Placeholder
      run: |
        echo "Placeholder: re-record tests/fixtures/*.har against the real Open Library API"
        echo "  and open a pull request with the diff so a human can review upstream drift."
```

This job is honest about being a placeholder. It doesn't pretend to refresh HARs—it prints exactly what the real version should do and exits green. That's better than leaving a TODO comment in a doc somewhere, because the placeholder is _visible in the GitHub UI_. Every nightly run shows this job name, and every reader sees the intent even though the automation isn't wired yet.

The real version of this job would hit the Open Library API, re-record the HAR fixtures, diff them against the committed versions, and open a PR if anything changed. That PR needs human review because HARs can contain credentials or unexpected response changes. The placeholder keeps the shape visible until someone builds the automation.

**Job 2: Dependency audit**

```yaml
dependency-audit:
  name: Dependency audit
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
    - name: Run npm audit
      run: npm audit --audit-level=high || true
    - name: Placeholder (open issue on new findings)
      run: |
        echo "Placeholder: wire an issue-opener action here so new high-severity"
        echo "  findings produce a tracked ticket instead of green build output."
```

`npm audit --audit-level=high` checks for known vulnerabilities at the "high" severity threshold. The `|| true` keeps the job green even when vulnerabilities exist—because right now the follow-up action (opening an issue) isn't wired yet. Without the issue-opener, a red audit job just sits there being red in a tab nobody opens. Better to be green with a placeholder than red with no audience.

Once the issue-opener lands, you remove the `|| true` and let audit failures produce tracked tickets. The placeholder step says this explicitly so the intent doesn't get lost.

**Job 3: Cross-browser smoke**

```yaml
cross-browser-smoke:
  name: Cross-browser smoke
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
    - name: Cache dependencies
      uses: actions/cache@v4
      with:
        path: |
          ~/.npm
          ~/.cache/ms-playwright
        key: ${{ runner.os }}-deps-${{ hashFiles('package-lock.json') }}-playwright-${{ hashFiles('playwright.config.ts') }}
    - name: Install dependencies
      run: npm ci --ignore-scripts
    - name: Install Playwright browsers
      run: npx playwright install --with-deps firefox webkit
    - name: Create .env for preview server
      run: |
        cat > .env <<'EOF'
        DATABASE_URL=file:./tmp/ci.db
        ORIGIN=http://127.0.0.1:4173
        BETTER_AUTH_SECRET=ci-test-secret-ci-test-secret-ci-test-secret-32chars
        OPEN_LIBRARY_BASE_URL=https://openlibrary.org
        EOF
        mkdir -p tmp
    - name: Run cross-browser smoke tests
      run: npm run test:e2e:cross-browser
    - name: Upload Playwright report
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: cross-browser-smoke-report
        path: playwright-report/
        retention-days: 7
```

This is the most complete job in the workflow. It caches both npm dependencies and Playwright browsers (keyed on `package-lock.json` and `playwright.config.ts`), installs Firefox and WebKit, creates a minimal `.env` for the preview server, and runs `npm run test:e2e:cross-browser`.

The cache key includes `playwright.config.ts` because Playwright version bumps change which browser binaries are needed. A stale cache after a Playwright upgrade would give you "browser not found" errors.

The `.env` creation step uses obviously-fake values—`ci-test-secret-ci-test-secret-ci-test-secret-32chars` is clearly not a real secret. This is the kind of thing Gitleaks would flag if it looked real, but the pattern is intentionally non-secret-shaped.

On failure, the Playwright report uploads as an artifact with 7-day retention. That's long enough to investigate, short enough that nightly artifacts don't eat all your storage.

### How the jobs map to commands

Each nightly job corresponds to a command you can run locally:

| Nightly job           | Local command                    |
| --------------------- | -------------------------------- |
| `har-refresh`         | (placeholder—no command yet)     |
| `dependency-audit`    | `npm audit --audit-level=high`   |
| `cross-browser-smoke` | `npm run test:e2e:cross-browser` |

This is a deliberate design choice. The nightly workflow doesn't invent new verification steps—it runs the same commands you'd run locally, just on a schedule. If a nightly failure is hard to reproduce locally, the job is doing something the local command doesn't, and that's a bug in the workflow.

## What you still need to run

You can validate the YAML syntax locally:

```bash
# Check that the YAML parses (requires yq or similar)
yq eval '.jobs | keys' .github/workflows/nightly.yml
```

And you can run the local equivalents of each job:

```bash
npm audit --audit-level=high
npm run test:e2e:cross-browser
```

The audit might surface real findings. The cross-browser smoke should pass if the smoke spec passes on Chromium. If it doesn't, you've found a browser-specific issue—which is exactly what the nightly check is for.

## Shipped vs. gap

**Local:** the workflow file parses, and every non-placeholder job maps to a local command you can run and verify. The YAML is real. The jobs are real. You can prove the structure works today.

**Hosted:** the workflow needs GitHub Actions to run on the `schedule` trigger. Locally, you can't simulate cron execution—you can only validate the YAML and run the underlying commands. `workflow_dispatch` lets you trigger the workflow manually once it's on the default branch of a repo with Actions enabled, which is the easiest way to prove the full workflow end-to-end without waiting for 04:17 UTC.

The two placeholder jobs (HAR refresh and the dependency audit issue-opener) are honest about their placeholder status. They're not broken—they're incomplete. The workflow is designed so you can land the real automation for each job independently, without restructuring the workflow file.

## Patterns to take away

- **Off-the-hour scheduling avoids the queue stampede.** `17 4 * * *` instead of `0 4 * * *`. One character, measurable difference. Pick any minute that isn't 0 or 30.
- **Placeholder jobs are better than missing jobs.** A placeholder that says "this should re-record HARs and open a PR" is visible in the GitHub UI and keeps the shape of the workflow intact. A TODO comment in a markdown file is invisible in the UI and gets forgotten.
- **Every nightly job maps to a local command.** If you can't reproduce a nightly failure locally with the same command the job runs, the workflow is doing something the developer can't debug. Keep parity between the workflow and the local command.
- **Failure artifacts with finite retention.** `retention-days: 7` is a good default. Long enough to investigate. Short enough that 365 nightly runs don't produce 365 artifacts. Adjust based on how quickly your team investigates failures—if the answer is "never," the artifact policy isn't your biggest problem.
- **Nightly failures need a handoff path.** A red nightly job that nobody looks at is worse than not running the check at all, because it creates the illusion of coverage. The placeholder issue-opener step in the dependency audit job is a reminder: nightly failures need to turn back into tracked work, not just red badges.

## Additional Reading

- [Lab: Add a Nightly Verification Workflow](lab-add-a-nightly-verification-workflow.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
