---
title: 'Add a Nightly Verification Workflow: Solution'
description: Walkthrough of the nightly workflow you add in the lab—schedule timing, job boundaries, honest placeholders, and the commands each job maps to locally.
modified: 2026-04-14
date: 2026-04-10
---

The nightly workflow is where the slow checks live. Everything in this file was deliberately excluded from the pull-request loop because it's too slow, too broad, or too drift-prone to run on every push. That does not make it optional. It just means it belongs on a different cadence.

## What to add

### `.github/workflows/nightly.yml`

Walk it from the top.

**Triggers:**

```yaml
on:
  schedule:
    - cron: '17 4 * * *'
  workflow_dispatch:
```

Two triggers. `schedule` runs the workflow every day at 04:17 UTC. `workflow_dispatch` lets you trigger it manually from the Actions tab, which is the sane way to test the workflow without waiting until tomorrow.

The `17` is not mystical. It is just not `0`. GitHub Actions gets crowded at the top of the hour because everyone copies `0 4 * * *` from a blog post and then wonders why their workflow sits in a queue. Move a few minutes off the hour and life gets better.

**Permissions:**

```yaml
permissions:
  contents: read
```

Least privilege. The nightly workflow reads the repo and runs checks. It does not need write access until you deliberately add something like an issue opener or an automated pull request step.

### Job 1: HAR refresh placeholder

```yaml
har-refresh:
  name: Refresh HAR fixtures
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - name: Placeholder
      run: |
        echo "Placeholder: re-record the HAR fixtures the network-isolation lab will add (e.g. tests/fixtures/*.har) against the real Open Library API"
        echo "  and open a pull request with the diff so a human can review upstream drift."
```

This is an honest placeholder. It does not pretend to refresh HARs. It tells you, in the GitHub UI, what the real version should do once someone wires it. That is better than hiding the intent in a markdown TODO no one sees.

The real automation would re-record the HARs, diff them, and open a reviewable pull request. Reviewable matters. Quietly accepting upstream API drift is a good way to commit weirdness you do not understand.

### Job 2: dependency audit

```yaml
dependency-audit:
  name: Dependency audit
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: '24'
    - name: Install dependencies
      run: npm ci --ignore-scripts
    - name: Run npm audit
      run: npm audit --audit-level=high || true
    - name: Placeholder
      run: |
        echo "Placeholder: open an issue or create tracked work for new high-severity findings."
```

`npm audit --audit-level=high` is the real check. The `|| true` is there because this version of the workflow is surfacing findings, not yet routing them into tracked work. A red nightly audit job that no one triages is performance art. A green placeholder that says "wire the follow-up next" is at least honest.

Once you add an issue-opener or some other real handoff, remove the `|| true` and make the workflow do the louder thing.

### Job 3: cross-browser smoke

```yaml
cross-browser-smoke:
  name: Cross-browser smoke
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: '24'
    - name: Cache dependencies
      uses: actions/cache@v5
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
        DATABASE_URL=file:./ci.db
        OPEN_LIBRARY_BASE_URL=https://openlibrary.org
        EOF
    - name: Run cross-browser smoke tests
      run: npm run test:cross-browser
    - name: Upload Playwright report
      if: failure()
      uses: actions/upload-artifact@v7
      with:
        name: cross-browser-smoke-report
        path: playwright-report/
        retention-days: 7
```

This is the most complete job in the workflow because the lab before this one already had you build the underlying command.

The cache covers both npm packages and Playwright browsers. The browser-install step is explicit because Playwright only defaults to Chromium. The `.env` bootstrap is intentionally small: `DATABASE_URL=file:./ci.db` plus the Open Library base URL the app already expects. Keep this bootstrap focused on what the public smoke loop actually needs — resist the urge to preload auth secrets, extra databases, or origins the current starter does not use.

And again, the artifact name matters. When a nightly run fails, you want the job and artifact names doing triage for you before you click anything.

### How the jobs map to local commands

Each nightly job should correspond to a real local command:

| Nightly job           | Local command                  |
| --------------------- | ------------------------------ |
| `har-refresh`         | placeholder only for now       |
| `dependency-audit`    | `npm audit --audit-level=high` |
| `cross-browser-smoke` | `npm run test:cross-browser`   |

That parity is the design rule. If a nightly failure cannot be reproduced locally with the same command the job uses, the workflow is hiding too much logic.

## What you still need to run

Validate the YAML parses:

```bash
yq eval '.jobs | keys' .github/workflows/nightly.yml
```

Run the local equivalents of the real jobs:

```bash
npm audit --audit-level=high
npm run test:cross-browser
```

Then force one failure on purpose. Break a tagged smoke assertion, or point the HAR placeholder at a nonsense filename once you replace the placeholder with real code. The workflow should give you a clear red job name and a concrete next action, not a vague feeling that something somewhere is unhappy.

## Local vs. hosted

**Local:** you can validate the YAML and every real command right now.

**Hosted:** the actual cron trigger, artifact retention, and Actions UI only exist once the workflow is on the default branch of a GitHub repository with Actions enabled. Use `workflow_dispatch` first. Waiting for the schedule is for people with too much free time.

## Patterns to take away

- Off-the-hour scheduling avoids the Actions traffic jam. Pick a minute that is not `0`.
- Placeholder jobs are better than invisible intent. If the automation is not built yet, say so in the workflow itself.
- Every nightly job maps to one named command. Nightly should not be a bag of shell trivia no developer can reproduce.
- Artifacts need finite retention. Seven days is a good default for nightly evidence.
- Nightly failures need a handoff path. A red cron run nobody reads is not coverage. It is decor.

## Additional Reading

- [Lab: Add a Nightly Verification Workflow](lab-add-a-nightly-verification-workflow.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
