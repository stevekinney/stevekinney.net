---
title: 'Write the CI Workflow from Scratch: Solution'
description: Annotated walkthrough of the main.yml and nightly.yml workflows you build in the lab—what each job does, what requires GitHub Actions to verify, and what you can validate locally.
modified: 2026-04-14
date: 2026-04-10
---

This is another hybrid lab. The workflow files no longer ship in the starter, but the jobs still map to real local commands. The actual _runs_—the artifact uploads, the cron triggers, the branch protection gates—require a GitHub remote with Actions enabled. I will walk both halves.

## What to add

### main.yml: the three-job pipeline

Open `.github/workflows/main.yml`. The workflow fires on every `push` and every `pull_request`. It requests `contents: read` permissions and nothing else—least privilege.

#### The static job

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

Four checks in one job: lint, typecheck, knip, gitleaks. They are sequential steps, not separate jobs, because the setup overhead (checkout, node install, npm ci, cache restore) is the same for all four and would be duplicated four times if split. The total runtime of these four checks is under 30 seconds on a warm cache. Splitting them into parallel jobs would add four cold starts of ~45 seconds each. Sequential steps win here.

The cache key includes both `package-lock.json` (for npm dependencies) and `playwright.config.ts` (for Playwright browser versions). If either changes, the cache invalidates. The cache path covers both `~/.npm` and `~/.cache/ms-playwright` so the end-to-end job benefits from the same cache entry.

The gitleaks step installs the CLI directly rather than using `gitleaks/gitleaks-action@v2`. The lab mentions the action as an option, but the shipped workflow pins a specific release and runs `gitleaks dir` against the full working tree. This avoids licensing questions around the GitHub Action wrapper and gives you the same CLI interface locally and in CI. The `--redact` flag prevents secrets from appearing in CI logs if a finding is reported.

`npm ci --ignore-scripts` skips postinstall scripts. Shelf does not rely on postinstall hooks, and skipping them avoids running arbitrary code from dependencies during the install phase. If your project _does_ need postinstall scripts (e.g., for native module compilation), remove `--ignore-scripts`.

#### The unit job

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

`needs: static` means this job only runs if the static job passes. If you have a lint error, the unit tests never start—you do not burn runner minutes on a build you already know is broken.

The unit job and the end-to-end job both depend on `static` but not on each other. They run in parallel once static passes. This is the diamond shape: one gate at the top, two paths diverge, both must pass before a merge is allowed.

#### The end-to-end job

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
        DATABASE_URL=file:./tmp/ci.db
        ORIGIN=http://127.0.0.1:4173
        BETTER_AUTH_SECRET=ci-test-secret-ci-test-secret-ci-test-secret-32chars
        OPEN_LIBRARY_BASE_URL=https://openlibrary.org
        EOF
        mkdir -p tmp
    - name: Run Playwright
      run: npm run test:e2e
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

This is the biggest job and the one with the most moving parts.

`npx playwright install --with-deps chromium` installs Chromium and its system dependencies (fonts, libraries). The `--with-deps` flag is essential on Ubuntu—without it, Chromium launches and immediately crashes because `libatk-bridge` or `libdrm` is missing.

The `.env` creation step writes CI-specific environment variables. The `BETTER_AUTH_SECRET` is a CI-only value—not a real secret, just a string that satisfies the auth library's minimum length requirement. `DATABASE_URL` points at a throwaway SQLite file in `tmp/`, which is the same file the test seed helper and the preview server will both read during the run. These are all CI-specific values that do not belong in the repository's `.env` file.

The failure steps are conditional: `if: failure()`. They only run when the Playwright step fails. The dossier step calls `npm run dossier`—the script you built in the failure dossier lab—which reads `playwright-report/report.json`, extracts failing test names, error messages, screenshot paths, and trace paths, and writes a markdown summary. Both the full HTML report and the dossier markdown are uploaded as artifacts with a 7-day retention.

Why upload the dossier as a separate artifact when it is already inside `playwright-report/`? Because downloading a single markdown file with `gh run download --name failure-dossier` is fast. Downloading the full HTML report—which can be 50MB with traces—is not. The agent should grab the dossier first, read it, and only pull the full report if it needs trace files.

### nightly.yml: the scheduled pipeline

Open `.github/workflows/nightly.yml`. It runs on a cron schedule (`17 4 * * *`—4:17 AM UTC, offset from the top of the hour to avoid the GitHub Actions stampede) and on `workflow_dispatch` for manual triggering.

Three jobs, each a placeholder with an `echo` that explains the intended follow-up:

**har-refresh** is the stub for re-recording HAR fixtures against the real Open Library API. The full implementation would run Playwright with HAR recording enabled, diff the results against the committed fixtures, and open a PR with the changes for human review. It is a placeholder because auto-recording HARs without human review is dangerous—HARs can contain session cookies, and upstream API changes deserve investigation, not silent acceptance.

**dependency-audit** runs `npm audit --audit-level=high || true`. The `|| true` prevents the job from failing the workflow on known vulnerabilities—the point of the nightly audit is to _surface_ new findings, not to block unrelated work. The placeholder notes that the follow-up is to wire an issue-opener action so new high-severity findings produce a tracked ticket instead of green build output.

**cross-browser-smoke** installs Firefox and WebKit (`npx playwright install --with-deps firefox webkit`) and runs the cross-browser smoke suite. This is the job that catches browser-specific rendering issues without slowing down the main pipeline. The main workflow runs Chromium only. The nightly workflow runs the other two.

The cross-browser job creates the same `.env` file as the main pipeline's end-to-end job. It uses `npm run test:e2e:cross-browser`—a separate script that targets the Firefox and WebKit Playwright projects.

## What you still need to run

Locally, you can validate the YAML and confirm command parity:

```sh
# YAML is valid (requires yq or python)
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/main.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/nightly.yml'))"

# Every named command exists and exits zero
npm run lint
npm run typecheck
npm run knip
npm run test:unit
npm run test:e2e
npm run dossier 2>/dev/null || echo "dossier: only runs after a failure (expected)"
```

The gitleaks CLI step can also be verified locally:

```sh
gitleaks dir . --redact --config .gitleaks.toml
```

## Shipped vs. gap

**Local (shipped in the starter):**

- `.github/workflows/main.yml` exists with three jobs: static, unit, end-to-end.
- `.github/workflows/nightly.yml` exists with three jobs: har-refresh, dependency-audit, cross-browser-smoke.
- Both files parse as valid YAML.
- Every named step maps to a real `npm run` command that exits the way the workflow expects.

**Hosted (requires GitHub Actions):**

- Actual workflow runs on push and pull_request.
- Artifact upload and download (playwright-report, dossier).
- Cron-triggered nightly runs.
- Branch protection requiring `static`, `unit`, and `end-to-end` to pass before merge.
- The agent loop check: pushing a deliberate failure, downloading the dossier with `gh run download`, and having the agent fix the issue from the dossier alone.

If you do not have a GitHub remote, stop at YAML validation and local command parity. Do not claim the artifact-download loop works until you have actually downloaded an artifact from a real run.

## Patterns to take away

- **One gate, then fan out.** The diamond shape—static gates both unit and end-to-end—means a lint error kills the pipeline in 20 seconds instead of burning 5 minutes of runner time on tests that will be irrelevant once you fix the typo.
- **Sequential steps beat parallel jobs for short checks.** Lint, typecheck, knip, and gitleaks share the same checkout-and-install overhead. Running them as four steps in one job takes 30 seconds. Running them as four jobs takes 4x45 seconds of cold starts plus 30 seconds of actual work.
- **Upload the dossier separately.** The full Playwright report is large. The dossier is small. Let the agent grab the small file first, diagnose, and only pull traces if it needs them.
- **Nightly jobs surface drift, not block work.** The dependency audit runs `|| true` on purpose. The HAR refresh is a placeholder on purpose. These jobs produce information. The main pipeline produces gates.
- **The `.env` in CI is not a secret.** The `BETTER_AUTH_SECRET` value in the workflow is a CI-only string that satisfies a length requirement. Real secrets go in GitHub's encrypted secrets store and are referenced as `${{ secrets.NAME }}`. The `.env` creation step is for non-secret configuration that the app needs to boot.
- **The agent loop is the acceptance test for the pipeline itself.** If CI fails and the agent cannot recover from the dossier alone, either the dossier is missing information or the failure message is not actionable. Tune both until the loop closes without you.

## Additional Reading

- [Lab: Write the CI Workflow from Scratch](lab-write-the-ci-workflow-from-scratch.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
