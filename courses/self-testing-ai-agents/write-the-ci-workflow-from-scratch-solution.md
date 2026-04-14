---
title: 'Write the CI Workflow from Scratch: Solution'
description: Annotated walkthrough of the `main.yml` workflow you add in the lab. The nightly workflow stays in the appendix labs, alongside the commands it gates.
modified: 2026-04-14
date: 2026-04-10
---

This is another hybrid lab. The workflow files don't ship in the Shelf starter, but the jobs still map to real local commands. The hosted parts—artifact uploads, cron triggers, required checks—need a GitHub remote with Actions enabled. I will keep those two truths separate so the solution does not pretend local YAML parsing is the same thing as a real CI run.

## What to add

### `main.yml`: the three-job pipeline

Open `.github/workflows/main.yml`. The workflow runs on every `push` and `pull_request` and requests only `contents: read`. Good. Keep it boring.

#### The `static` job

```yaml
static:
  name: Static layer
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
    - name: Lint
      run: npm run lint
    - name: Typecheck
      run: npm run typecheck
    - name: Dead code
      run: npm run knip
    - name: Install gitleaks
      run: |
        curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.28.0/gitleaks_8.28.0_linux_x64.tar.gz \
          | tar -xz -C /tmp gitleaks
        sudo install /tmp/gitleaks /usr/local/bin/gitleaks
        gitleaks version
    - name: Secret scan
      run: gitleaks dir . --redact --config .gitleaks.toml
```

This is the fuller post-static-layer version. If you have not built `knip` or gitleaks yet, drop those two steps for the first pass and add them back later. The point is not cargo-culting the exact YAML. The point is gating cheap failures before you spend browser minutes.

These are steps, not separate jobs, because the setup overhead is shared. Splitting lint, typecheck, knip, and gitleaks into four jobs buys you more cold starts, not more insight.

#### The `unit` job

```yaml
unit:
  name: Unit tests
  runs-on: ubuntu-latest
  needs: static
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
    - name: Run Vitest
      run: npm run test:unit
```

`needs: static` is the first load-bearing decision in the file. If lint or typecheck already failed, there is no reason to burn another runner executing unit tests against broken code.

#### The `end-to-end` job

```yaml
end-to-end:
  name: End-to-end tests
  runs-on: ubuntu-latest
  needs: static
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
      run: npx playwright install --with-deps chromium
    - name: Create .env for preview server
      run: |
        cat > .env <<'EOF'
        DATABASE_URL=file:./ci.db
        OPEN_LIBRARY_BASE_URL=https://openlibrary.org
        EOF
    - name: Run Playwright
      run: npm run test
    - name: Generate failure dossier
      if: failure()
      run: npm run dossier
    - name: Upload Playwright report
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
    - name: Upload failure dossier
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: failure-dossier
        path: playwright-report/dossier.md
        retention-days: 7
```

Three details matter here.

First: `npm run test`, not `npm run test:e2e`. The current Shelf starter's Playwright command surface is `test`, and the solution should not invent a second script just because an older version of the repo did.

Second: `DATABASE_URL=file:./ci.db`. The current starter does not need `tmp/ci.db` or a pre-created `tmp/` directory to boot the preview server. Keep the CI env small and real.

Third: the dossier upload is conditional and separate. The HTML report is large. The markdown dossier is small. An agent should be able to grab the small one first and only pull the full report if it needs the traces.

If you have not completed the dossier lab yet, omit the dossier step and its artifact upload on the first pass. The Playwright report artifact still buys you most of the debugging value.

### `nightly.yml` lives in the appendix

The nightly workflow is not part of this lab. It lands in the appendix labs ([Lab: Add Cross-Browser Coverage](lab-add-cross-browser-coverage.md) and [Lab: Add a Nightly Verification Workflow](lab-add-a-nightly-verification-workflow.md)) alongside the commands it actually runs. A standalone placeholder is worse than no file at all — it invites cargo-culted job names and silent schedule drift. Build `nightly.yml` when you build the things it gates.

## What you still need to run

Locally, validate the YAML:

```sh
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/main.yml'))"
```

Then run the commands the jobs map to:

```sh
npm run lint
npm run typecheck
npm run knip
npm run test:unit
npm run test
```

If you wired the dossier already, you can sanity-check the command too:

```sh
npm run dossier 2>/dev/null || echo "dossier only becomes interesting after a failure"
```

And if the gitleaks CLI is installed locally:

```sh
gitleaks dir . --redact --config .gitleaks.toml
```

## Local vs. hosted

**Local:** you can prove the workflow files parse and that every named command behaves the way the jobs expect.

**Hosted:** actual workflow runs, artifact downloads, required checks, and the cron trigger still need a GitHub repository with Actions enabled. Do not claim the artifact loop works until you have actually downloaded an artifact from a real run.

## Patterns to take away

- One gate, then fan out. `static` blocks `unit` and `end-to-end`, which saves runner time and gets faster red builds.
- Use the repository's real command surface. If the starter says `npm run test`, the workflow says `npm run test`.
- Keep CI env small and explicit. Add only the variables the app reads today.
- Upload the dossier separately when you have it. Small artifacts make agent recovery faster.
- Nightly exists to keep broad or slow checks out of the fast PR loop. Build the real nightly jobs when the appendix labs add the commands they depend on.

## Additional Reading

- [Lab: Write the CI Workflow from Scratch](lab-write-the-ci-workflow-from-scratch.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
