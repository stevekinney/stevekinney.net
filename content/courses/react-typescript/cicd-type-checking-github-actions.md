---
title: CI/CD Type Checking with GitHub Actions
description: >-
  Automate TypeScript validation in CI/CD—GitHub Actions workflows, parallel
  checking, caching strategies, and PR automation.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - typescript
  - ci-cd
  - github-actions
  - automation
  - testing
---

Your TypeScript might be perfect on your machine, but what about your teammate's rushed Friday afternoon commit? That's where CI/CD type checking saves the day. GitHub Actions can be your automated TypeScript enforcer, catching type errors before they hit main, running checks in parallel, and even auto-fixing issues. Let's build a bulletproof TypeScript CI/CD pipeline that keeps your React codebase type-safe without slowing down development.

Think of GitHub Actions as your tireless code reviewer who never gets tired, never misses a type error, and works 24/7. Best of all, it's free for public repos and generous with private ones.

## Basic TypeScript Check Workflow

Let's start with a simple but effective TypeScript checking workflow.

### Essential Type Check Workflow

```yaml
# .github/workflows/typecheck.yml
name: TypeScript Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
    types: [opened, synchronize, reopened]

jobs:
  typecheck:
    name: Type Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript compiler
        run: npx tsc --noEmit

      - name: Check for unused exports
        run: npx ts-prune

      - name: Upload TypeScript error report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: typescript-errors
          path: typescript-errors.log
```

### Enhanced Error Reporting

```yaml
# .github/workflows/typecheck-enhanced.yml
name: Enhanced TypeScript Check

on:
  pull_request:
    paths:
      - '**.ts'
      - '**.tsx'
      - 'tsconfig.json'
      - 'package.json'

jobs:
  typecheck:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: TypeScript Error Reporter
        uses: andoshin11/typescript-error-reporter-action@v1.1.0
        with:
          error_format: 'stylish'

      - name: Create error annotations
        if: failure()
        run: |
          npx tsc --noEmit --pretty false 2>&1 | \
          sed -E "s/^(.+)\(([0-9]+),([0-9]+)\): error TS[0-9]+: (.+)$/::error file=\1,line=\2,col=\3::\4/" || true

      - name: Comment PR with errors
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const errors = fs.readFileSync('typescript-errors.log', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## ❌ TypeScript Errors Found\n\n\`\`\`\n${errors}\n\`\`\``
            });
```

## Parallel Type Checking

Speed up checks by running them in parallel across different parts of your codebase.

### Matrix Strategy for Packages

```yaml
# .github/workflows/parallel-typecheck.yml
name: Parallel Type Check

on:
  pull_request:
    branches: [main]

jobs:
  prepare:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.packages.outputs.list }}
    steps:
      - uses: actions/checkout@v4

      - name: Get package list
        id: packages
        run: |
          PACKAGES=$(ls -d packages/* | jq -R -s -c 'split("\n")[:-1]')
          echo "list=$PACKAGES" >> $GITHUB_OUTPUT

  typecheck:
    needs: prepare
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.prepare.outputs.packages) }}
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check ${{ matrix.package }}
        run: |
          cd ${{ matrix.package }}
          npx tsc --noEmit

      - name: Report status
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const package = '${{ matrix.package }}';
            const status = '${{ job.status }}';
            const icon = status === 'success' ? '✅' : '❌';

            core.summary
              .addHeading(`${icon} ${package}`, 3)
              .addRaw(`Status: ${status}`)
              .write();
```

### Sharded Type Checking

```yaml
# .github/workflows/sharded-typecheck.yml
name: Sharded Type Check

on:
  pull_request:

jobs:
  typecheck:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
        total: [4]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Get changed files
        id: changed-files
        uses: tj-actions/changed-files@v40
        with:
          files: |
            **/*.ts
            **/*.tsx

      - name: Type check shard ${{ matrix.shard }}/${{ matrix.total }}
        run: |
          # Split files into shards
          FILES=(${{ steps.changed-files.outputs.all_changed_files }})
          TOTAL_FILES=${#FILES[@]}
          SHARD_SIZE=$((TOTAL_FILES / ${{ matrix.total }} + 1))
          START=$(( (${{ matrix.shard }} - 1) * SHARD_SIZE ))
          END=$(( START + SHARD_SIZE ))

          SHARD_FILES=("${FILES[@]:$START:$SHARD_SIZE}")

          if [ ${#SHARD_FILES[@]} -gt 0 ]; then
            npx tsc --noEmit ${SHARD_FILES[@]}
          fi
```

## Caching Strategies

Optimize build times with intelligent caching.

### Advanced Dependency Caching

```yaml
# .github/workflows/cached-typecheck.yml
name: Cached Type Check

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  typecheck:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node with caching
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Get npm cache directory
        id: npm-cache-dir
        shell: bash
        run: echo "dir=$(npm config get cache)" >> $GITHUB_OUTPUT

      - name: Cache npm dependencies
        uses: actions/cache@v3
        with:
          path: ${{ steps.npm-cache-dir.outputs.dir }}
          key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-npm-

      - name: Cache TypeScript build info
        uses: actions/cache@v3
        with:
          path: |
            **/.tsbuildinfo
            **/tsconfig.tsbuildinfo
          key: ${{ runner.os }}-tsbuildinfo-${{ hashFiles('**/tsconfig.json', '**/*.ts', '**/*.tsx') }}
          restore-keys: |
            ${{ runner.os }}-tsbuildinfo-

      - name: Cache node_modules
        id: cache-node-modules
        uses: actions/cache@v3
        with:
          path: '**/node_modules'
          key: ${{ runner.os }}-modules-${{ hashFiles('**/package-lock.json') }}

      - name: Install dependencies
        if: steps.cache-node-modules.outputs.cache-hit != 'true'
        run: npm ci

      - name: Type check with incremental build
        run: npx tsc --incremental --noEmit
```

### Turbo Repo Caching

```yaml
# .github/workflows/turbo-typecheck.yml
name: Turbo Type Check

on:
  pull_request:

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  typecheck:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Turbo Cache
        uses: actions/cache@v3
        with:
          path: .turbo
          key: turbo-${{ github.job }}-${{ github.ref_name }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ github.job }}-${{ github.ref_name }}
            turbo-${{ github.job }}

      - name: Run Turbo type check
        run: npx turbo run typecheck --cache-dir=.turbo

      - name: Upload Turbo summary
        uses: actions/upload-artifact@v3
        with:
          name: turbo-summary
          path: .turbo/runs/*/summary.json
```

## Pull Request Automation

Automate PR workflows with type checking gates.

### PR Status Checks

```yaml
# .github/workflows/pr-typecheck.yml
name: PR Type Safety

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  typecheck:
    name: Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Get changed TypeScript files
        id: changed-ts-files
        run: |
          CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E '\.(ts|tsx)$' || true)
          echo "files<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
          echo "count=$(echo "$CHANGED_FILES" | wc -l)" >> $GITHUB_OUTPUT

      - name: Type check changed files
        if: steps.changed-ts-files.outputs.count > 0
        run: |
          echo "Checking ${{ steps.changed-ts-files.outputs.count }} TypeScript files"
          npx tsc --noEmit --skipLibCheck

      - name: Create check run
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const conclusion = '${{ job.status }}' === 'success' ? 'success' : 'failure';

            await github.rest.checks.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              name: 'TypeScript',
              head_sha: context.sha,
              status: 'completed',
              conclusion,
              output: {
                title: 'TypeScript Check',
                summary: `Type checked ${{ steps.changed-ts-files.outputs.count }} files`,
                text: 'All TypeScript files have been validated'
              }
            });
```

### Auto-fix TypeScript Issues

```yaml
# .github/workflows/auto-fix.yml
name: Auto-fix TypeScript

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-fix:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run auto-fixable checks
        id: autofix
        run: |
          # Fix formatting
          npx prettier --write "**/*.{ts,tsx}"

          # Fix ESLint issues
          npx eslint --fix "**/*.{ts,tsx}"

          # Organize imports
          npx organize-imports-cli "**/*.{ts,tsx}"

          # Check if there are changes
          if [[ -n $(git status -s) ]]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
          else
            echo "has_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Commit fixes
        if: steps.autofix.outputs.has_changes == 'true'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add .
          git commit -m "🤖 Auto-fix TypeScript/ESLint issues"
          git push
```

## Monorepo Type Checking

Handle monorepo-specific type checking challenges.

### Workspace-Aware Type Checking

```yaml
# .github/workflows/monorepo-typecheck.yml
name: Monorepo Type Check

on:
  pull_request:

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}

    steps:
      - uses: actions/checkout@v4

      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            core:
              - 'packages/core/**'
            ui:
              - 'packages/ui/**'
            app:
              - 'apps/web/**'
            shared:
              - 'packages/shared/**'

  typecheck-affected:
    needs: detect-changes
    if: needs.detect-changes.outputs.packages != '[]'
    runs-on: ubuntu-latest

    strategy:
      matrix:
        package: ${{ fromJson(needs.detect-changes.outputs.packages) }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Build dependencies for ${{ matrix.package }}
        run: |
          # Build dependent packages first
          if [ "${{ matrix.package }}" == "app" ]; then
            npm run build --workspace=packages/core
            npm run build --workspace=packages/ui
          elif [ "${{ matrix.package }}" == "ui" ]; then
            npm run build --workspace=packages/core
          fi

      - name: Type check ${{ matrix.package }}
        run: |
          if [ "${{ matrix.package }}" == "core" ]; then
            npm run typecheck --workspace=packages/core
          elif [ "${{ matrix.package }}" == "ui" ]; then
            npm run typecheck --workspace=packages/ui
          elif [ "${{ matrix.package }}" == "app" ]; then
            npm run typecheck --workspace=apps/web
          fi
```

### Nx Monorepo Integration

```yaml
# .github/workflows/nx-typecheck.yml
name: Nx Type Check

on:
  pull_request:

jobs:
  typecheck:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: nrwl/nx-set-shas@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Nx Affected Type Check
        run: npx nx affected -t typecheck --parallel=3

      - name: Nx Cloud Cache
        run: npx nx-cloud start-ci-run --distribute-on="3 linux-medium-js"

      - name: Generate Nx Report
        if: always()
        run: |
          npx nx graph --file=nx-graph.json
          npx nx report
```

## Advanced Type Check Strategies

Implement sophisticated type checking patterns.

### Strict Mode Progression

```yaml
# .github/workflows/strict-progression.yml
name: TypeScript Strict Mode Progression

on:
  schedule:
    - cron: '0 0 * * 1' # Weekly on Monday
  workflow_dispatch:

jobs:
  analyze-strict:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Analyze strict mode readiness
        run: |
          # Try compiling with increasing strictness
          STRICT_FLAGS=(
            "--noImplicitAny"
            "--strictNullChecks"
            "--strictFunctionTypes"
            "--strictBindCallApply"
            "--strictPropertyInitialization"
            "--noImplicitThis"
            "--alwaysStrict"
          )

          for flag in "${STRICT_FLAGS[@]}"; do
            echo "Testing with $flag..."
            npx tsc --noEmit $flag 2>&1 | tee $flag.log || true
            ERROR_COUNT=$(grep -c "error TS" $flag.log || echo "0")
            echo "$flag: $ERROR_COUNT errors" >> strict-report.txt
          done

      - name: Create strict mode report
        run: |
          cat strict-report.txt

          # Create markdown report
          echo "# TypeScript Strict Mode Readiness Report" > strict-report.md
          echo "" >> strict-report.md
          echo "## Error Counts by Flag" >> strict-report.md
          echo "" >> strict-report.md
          cat strict-report.txt >> strict-report.md

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: strict-mode-report
          path: strict-report.md
```

### Type Coverage Reporting

```yaml
# .github/workflows/type-coverage.yml
name: Type Coverage

on:
  pull_request:
  push:
    branches: [main]

jobs:
  type-coverage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Check type coverage
        id: coverage
        run: |
          npx type-coverage --detail --strict --ignore-files "**/*.test.ts" > coverage.txt
          COVERAGE=$(grep "type-coverage" coverage.txt | grep -oE "[0-9]+\.[0-9]+")
          echo "coverage=$COVERAGE" >> $GITHUB_OUTPUT

      - name: Create coverage badge
        uses: schneegans/dynamic-badges-action@v1.7.0
        with:
          auth: ${{ secrets.GIST_SECRET }}
          gistID: your-gist-id
          filename: type-coverage.json
          label: Type Coverage
          message: ${{ steps.coverage.outputs.coverage }}%
          color: ${{ steps.coverage.outputs.coverage > 90 && 'green' || steps.coverage.outputs.coverage > 70 && 'yellow' || 'red' }}

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const coverage = '${{ steps.coverage.outputs.coverage }}';
            const emoji = coverage > 90 ? '🟢' : coverage > 70 ? '🟡' : '🔴';

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## ${emoji} Type Coverage: ${coverage}%\n\nRun \`npm run type-coverage\` locally for details.`
            });
```

## Performance Monitoring

Track and optimize your CI/CD performance.

### Workflow Performance Tracking

```yaml
# .github/workflows/performance-monitor.yml
name: CI Performance Monitor

on:
  workflow_run:
    workflows: ['TypeScript Check']
    types: [completed]

jobs:
  analyze-performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Get workflow run data
        uses: actions/github-script@v7
        with:
          script: |
            const run = await github.rest.actions.getWorkflowRun({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: ${{ github.event.workflow_run.id }}
            });

            const jobs = await github.rest.actions.listJobsForWorkflowRun({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: ${{ github.event.workflow_run.id }}
            });

            // Calculate metrics
            const totalDuration = new Date(run.data.updated_at) - new Date(run.data.created_at);
            const jobDurations = jobs.data.jobs.map(job => ({
              name: job.name,
              duration: new Date(job.completed_at) - new Date(job.started_at)
            }));

            // Save metrics
            const metrics = {
              workflow: run.data.name,
              totalDuration: totalDuration / 1000,
              jobs: jobDurations,
              timestamp: new Date().toISOString()
            };

            core.setOutput('metrics', JSON.stringify(metrics));

      - name: Store metrics
        run: |
          echo '${{ steps.get-data.outputs.metrics }}' >> metrics.jsonl

      - name: Upload metrics
        uses: actions/upload-artifact@v3
        with:
          name: ci-metrics
          path: metrics.jsonl
```

### Cost Optimization

```yaml
# .github/workflows/optimized-typecheck.yml
name: Optimized Type Check

on:
  pull_request:

jobs:
  quick-check:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Check if TypeScript files changed
        id: check-ts
        run: |
          if git diff --name-only HEAD^ HEAD | grep -qE '\.(ts|tsx)$'; then
            echo "changed=true" >> $GITHUB_OUTPUT
          else
            echo "changed=false" >> $GITHUB_OUTPUT
          fi

      - name: Skip if no TS changes
        if: steps.check-ts.outputs.changed == 'false'
        run: |
          echo "No TypeScript files changed, skipping type check"
          exit 0

      - uses: actions/setup-node@v4
        if: steps.check-ts.outputs.changed == 'true'
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install only production deps
        if: steps.check-ts.outputs.changed == 'true'
        run: npm ci --production

      - name: Install TypeScript
        if: steps.check-ts.outputs.changed == 'true'
        run: npm install -D typescript

      - name: Quick type check
        if: steps.check-ts.outputs.changed == 'true'
        run: npx tsc --noEmit --skipLibCheck --incremental
```

## Custom GitHub Actions

Create reusable actions for TypeScript checking.

### Reusable TypeScript Action

```yaml
# .github/actions/typecheck/action.yml
name: 'TypeScript Check'
description: 'Run TypeScript type checking with caching'

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '20'

  typescript-version:
    description: 'TypeScript version'
    required: false
    default: 'latest'

  strict:
    description: 'Use strict mode'
    required: false
    default: 'false'

outputs:
  errors:
    description: 'Number of TypeScript errors'
    value: ${{ steps.typecheck.outputs.errors }}

runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'

    - name: Install dependencies
      shell: bash
      run: npm ci

    - name: Install specific TypeScript version
      shell: bash
      if: inputs.typescript-version != 'latest'
      run: npm install -D typescript@${{ inputs.typescript-version }}

    - name: Run type check
      id: typecheck
      shell: bash
      run: |
        if [ "${{ inputs.strict }}" == "true" ]; then
          FLAGS="--strict"
        else
          FLAGS=""
        fi

        ERROR_COUNT=$(npx tsc --noEmit $FLAGS 2>&1 | grep -c "error TS" || echo "0")
        echo "errors=$ERROR_COUNT" >> $GITHUB_OUTPUT

        if [ $ERROR_COUNT -gt 0 ]; then
          exit 1
        fi
```

### Matrix Testing Action

```yaml
# .github/workflows/matrix-typescript.yml
name: TypeScript Version Matrix

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

jobs:
  test-versions:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        typescript: ['4.9', '5.0', '5.1', '5.2', '5.3', 'next']
        strict: [true, false]

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/typecheck
        with:
          typescript-version: ${{ matrix.typescript }}
          strict: ${{ matrix.strict }}
        continue-on-error: ${{ matrix.typescript == 'next' }}

      - name: Report results
        if: always()
        run: |
          echo "TypeScript ${{ matrix.typescript }} (strict: ${{ matrix.strict }}): ${{ job.status }}"
```

## Security and Best Practices

Ensure your CI/CD pipeline is secure and efficient.

### Secure Type Checking

```yaml
# .github/workflows/secure-typecheck.yml
name: Secure Type Check

on:
  pull_request_target:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  typecheck:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          # Don't persist credentials
          persist-credentials: false

      - name: Validate package.json
        run: |
          # Check for suspicious scripts
          if grep -q "rm -rf" package.json; then
            echo "Suspicious command found in package.json"
            exit 1
          fi

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install with audit
        run: |
          npm audit --audit-level=high
          npm ci

      - name: Type check in sandbox
        run: |
          # Run in restricted environment
          timeout 300 npx tsc --noEmit

      - name: SARIF output
        if: failure()
        run: |
          npx tsc --noEmit --pretty false | \
          node -e "
            const input = require('fs').readFileSync(0, 'utf-8');
            const sarif = {
              version: '2.1.0',
              runs: [{
                tool: { driver: { name: 'TypeScript' } },
                results: []
              }]
            };
            // Parse and convert to SARIF
            console.log(JSON.stringify(sarif));
          " > typescript.sarif

      - name: Upload SARIF
        if: failure()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: typescript.sarif
```

## Wrapping Up

A well-configured CI/CD pipeline with GitHub Actions transforms TypeScript from a development tool into a guardian of code quality. From simple type checks to sophisticated parallel workflows, caching strategies, and automated fixes, you now have the blueprint for a TypeScript CI/CD pipeline that scales with your team and codebase.

Remember: The best CI/CD pipeline is one that catches errors without slowing down development. Start simple, measure performance, and gradually add sophistication where it provides value. Your future self (and your team) will thank you when that Friday afternoon commit gets automatically rejected for type errors instead of breaking production.
