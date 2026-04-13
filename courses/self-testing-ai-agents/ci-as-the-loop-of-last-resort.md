---
title: CI as the Loop of Last Resort
description: By the time CI fires, the agent should have caught 95% of mistakes locally. CI is what catches the last 5% plus the environment-specific ones you can't catch locally.
modified: 2026-04-12
date: 2026-04-06
---

We're almost done. One lesson left, and it's the one where everything we built today runs together, unattended, in a [GitHub Actions](https://docs.github.com/en/actions) workflow you own.

I want to frame this up front, because the standard CI framing is different from mine.

The standard framing: "CI is where tests run." You set up CI _because_ you need your tests to run somewhere, and the workflow is a list of steps that happen on every push. Your CI is your test suite, basically.

My framing: **CI is the loop of last resort.** Everything we've built today is a loop that runs _earlier_ than CI. Lint runs on save. Type-check runs on save. Tests run locally. Knip runs in pre-push. Bugbot reviews on PR open. The agent probes its own changes before declaring done. By the time code reaches CI, most of the mistakes should already have been caught, and CI's job is to catch the rest—plus the class of mistakes you can't catch locally because your laptop isn't the production environment.

That shift matters because it changes what you put _in_ CI. If CI is where tests run, you stuff everything into CI and wait ten minutes on every push. If CI is the last resort, you put the _strict versions_ of every check in CI—full Playwright matrix, full visual regression, full secret scan against history, full dependency audit—and you accept that CI is slow because you're running it against the environment you actually care about.

One scope note before we go further: green CI is still not the end of the story. [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md) picks up on what happens after merge or deploy-preview. The appendix builds out the broader nightly and cross-browser loops in more detail.

Shelf's completed workflow uses `npm`, `actions/setup-node@v4`, and caches both `~/.npm` and `~/.cache/ms-playwright`. That's the concrete reference point as you read the rest of this lesson.

The concrete files matter here too. By the end of the CI lab, Shelf's daily gate lives at `.github/workflows/main.yml` and the slow cadence lives at `.github/workflows/nightly.yml`. The end-to-end job writes `DATABASE_URL=file:./tmp/ci.db`, creates `tmp/`, runs `npm run test:e2e`, and on failure can upload the output from `npm run dossier` if you've completed that lab. The starter's day-one static surface is `npm run lint`, `npm run typecheck`, and `npm run test`; later labs extend it with `npm run knip`, gitleaks, and dossier generation.

## What CI uniquely catches

A short list of things that _only_ CI can reliably catch:

- **Cross-platform differences.** Your laptop is macOS. Production is Linux. Playwright's screenshot pixels differ between them. Your CI runs Linux and catches the drift.
- **Cross-browser differences.** Locally you run Chromium for speed. CI runs the full matrix (Chromium, Firefox, WebKit) and catches the "works in Chrome, broken in Safari" class of bug.
- **Clean-slate environment bugs.** The agent's laptop has ten months of cached dependencies, environment variables, and custom shell aliases. CI starts fresh on every run. Anything that only works because of your laptop's accumulated state is going to fail in CI.
- **Concurrency at scale.** Once you widen the worker count, CI is where the higher-concurrency races show up. Shelf's local and CI Playwright runs stay pinned to `workers: 1` today because the starter still uses a shared SQLite database; the concept still matters and the knob is easy to turn once per-worker isolation lands.
- **Time-sensitive checks.** Nightly HAR regeneration, weekly dependency audits, monthly secret rotation verification—these don't make sense locally. CI is where they live.
- **Artifact enforcement.** Blocking merges, uploading reports, posting status checks on PRs. The workflow glue lives in CI because that's where the API keys to do those things live.

If you don't have any of those concerns, you don't strictly _need_ CI. You could run everything locally. Most teams need at least three of them, which is why CI exists.

## What CI should _not_ be doing

Equally important: things CI should not be catching, because something earlier should have caught them.

- **Formatting errors.** If Prettier isn't running in pre-commit, fix the pre-commit hook. Don't let CI become the place you notice unformatted code.
- **Type errors in files the developer touched.** Pre-push typecheck catches these. CI typecheck is a safety net, not the primary surface.
- **Obvious lint violations.** Same logic. If CI is the first place you see `no-unused-vars`, your editor and hooks are misconfigured.
- **"Did the agent forget to run the tests?"** The instructions file and the Claude hooks should be catching this. If you're relying on CI to notice that the agent skipped local tests, you've missed a cheaper loop.

The rule: CI catches environment-specific and scale-specific problems. Everything else should have been caught earlier, and when CI _does_ catch something earlier-able, treat it as a bug in your earlier loops, not as a CI feature.

## The Shelf CI workflow, at a high level

The next lesson walks through the actual YAML. Here's the shape before we get there.

On every push to any branch and every PR into main:

1. **Checkout and install.** Clone the repo, restore caches, `npm ci --ignore-scripts`.
2. **Static layer.** Run lint, typecheck, knip, and gitleaks. In the workshop Shelf repo these stay in one `static` job because the setup overhead is larger than the benefit of splitting four short checks across four runners. Use the official Gitleaks action or a direct CLI step depending what your plan and licensing allow.
3. **Unit tests.** `npm run test:unit`. Fast.
4. **End-to-end tests.** Playwright, full Chromium run. Upload trace artifacts, screenshots, and the failure dossier if anything fails.

That is the entire `main.yml` Shelf ships: three jobs, not seven. Visual regression rides inside the Playwright suite, and the hosted-only extras (deploy previews, post-deploy smoke) stay out of the main workflow until there is a concrete reason to pay that cost.

On a nightly schedule:

1. **Refresh HAR files** by re-recording against the real Open Library API. Open a PR with the updated HARs if they changed. A human reviews.
2. **Dependency audit.** Run `npm audit`, open an issue or PR if anything new turns up.
3. **Full cross-browser Playwright run.** Chromium, Firefox, WebKit. Surface differences that the daily Chromium-only runs miss.

On a connected GitHub repository, you can add merge-to-main deployment and post-deploy smoke checks later. [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md) covers that core loop. The appendix lessons turn the nightly and cross-browser placeholders into fuller patterns once the one-day workshop flow is done.

That's the whole shape Shelf ships: three jobs in `.github/workflows/main.yml`, three placeholder jobs in `.github/workflows/nightly.yml`, and no deploy workflow yet. Each is boring. The power is in the composition.

## Parallelism and caching, the two knobs that matter

Two things you do once and benefit from on every run.

**Parallelism.** GitHub Actions jobs run in parallel by default, but that does not mean every check deserves its own job. In Shelf, the static checks stay grouped because the setup overhead is bigger than the benefit of fanning out four short steps. The `unit` and `end-to-end` jobs then run in parallel after `static` passes. Once the suite gets bigger, you can split or shard more aggressively.

Here's the shape of a parallel Shelf workflow:

```mermaid
graph LR
  Static["Static job<br/>lint + typecheck + knip + gitleaks"]
  Unit["Unit tests"]
  E2E["End-to-end + screenshots + dossier"]
  Merge{"All Passed?"}

  Static --> Unit
  Static --> E2E
  Unit --> Merge
  E2E --> Merge
```

Notice: the static job runs first, then the unit and end-to-end jobs run in parallel. Total time is limited by the slower of those two downstream jobs, not the sum of every individual check.

**Caching.** Bun, npm, and yarn all produce lock-hash-stable caches. Shelf caches `~/.npm` and `~/.cache/ms-playwright` instead of committing to a `node_modules` cache strategy. That is enough to cut the expensive parts of the workflow without adding a more brittle cache layer.

The actual GitHub Actions `cache` action in Shelf looks like:

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ~/.cache/ms-playwright
    key: ${{ runner.os }}-deps-${{ hashFiles('package-lock.json') }}-playwright-${{ hashFiles('playwright.config.ts') }}
```

That is the exact cache shape Shelf uses. Start there before you invent anything more clever.

## Fail fast, but not too fast

A common mistake: `fail-fast: true` on every job, which causes any single red check to cancel the whole workflow. This feels efficient—why keep running if something already failed?—but it's the wrong trade for a workshop-grade loop.

The better default is `fail-fast: false`. Run everything to completion. The agent wants to see _all_ the failures at once, not just the first one, because fixing them one at a time is slower than fixing them in a single pass. Running everything also means you get full artifacts (traces, screenshots, dossiers) for every failure, not just the one that fired first.

The exception: job dependencies. If your Playwright job depends on a successful build, don't run Playwright when the build is red. Use `needs:` to express that, and let `fail-fast: false` handle the rest.

## Required checks and branch protection

Once the workflow is reliable, turn on branch protection on `main`:

- Require status checks to pass before merging.
- Require the specific checks you care about. In Shelf's current workflow, that means at least `static` and `end-to-end`, and usually `unit` as well.
- Optionally, require Bugbot (or your review bot of choice) to have completed and left a non-blocking comment.
- Require a human reviewer for changes outside certain paths.

Branch protection is the hard gate. Everything before it is soft—the agent can ignore local checks if it's determined. CI plus branch protection is the non-negotiable layer.

## What the agent sees when CI fails

This is the part I want you to optimize for.

When CI fails, the agent should be able to recover without a human pasting error messages. That means:

- The failure messages in the status check summary are specific, not "job failed."
- Artifacts (traces, screenshots, dossier, report JSON) are uploaded to the run.
- The PR gets a comment with a link to the artifacts and a short summary.
- The dossier script from [Failure Dossiers](failure-dossiers-what-agents-actually-need-from-a-red-build.md) runs in CI and the output is uploaded as an artifact.

With those in place, the agent can read the PR, read the status check, download the dossier artifact, and iterate. You don't have to be the relay. The agent iterates until green or until it gets stuck in a way it can report back to you.

I have watched this work. An agent opens a PR, CI fails, the agent reads the dossier artifact, makes a fix, pushes a new commit, CI fails in a different way, the agent reads the new dossier, fixes it, pushes again, CI goes green, and I find out about the whole sequence when I look at the PR thirty minutes later. Entire bug fixes, self-driven, because the CI output is legible to the agent. That's the loop.

If your copy of Shelf does not have a hosted remote yet, you cannot close that loop end-to-end. What you _can_ do is make the workflow legible in advance: valid YAML, real commands, explicit artifact paths, finite retention, and no hidden workflow-only scripts. Once the repository is connected to GitHub, the only missing piece is the hosted runner.

## CLAUDE.md rules

```markdown
## CI

- The CI workflow lives at `.github/workflows/main.yml`. Read it before
  proposing changes to the CI configuration.
- When CI fails, download the dossier artifact from the failed run:
  `gh run download <run-id> -n failure-dossier`. Read the dossier,
  reproduce the failure locally, fix it, push a new commit.
- Do not add `continue-on-error: true` to any job without written
  justification in the commit message.
- Do not reduce the strictness of CI checks to "fix" a failure. If a
  check is too strict, say so explicitly and propose the relaxation
  as a separate decision, not as part of a bug fix.
- The nightly HAR refresh opens a PR. If the diff is suspicious, do not
  merge it—investigate whether the upstream API changed in a way that
  requires application code changes.
```

## The one thing to remember

CI is where the loops you built all day run together, one more time, in a clean environment, with the strict versions of every check. If it's the _first_ time any of those checks run, you've misallocated. If it's the _last_ time, with the tightest config, catching environment-specific mistakes your laptop can't, you're doing it right.

## Additional Reading

- [Failure Dossiers: What Agents Actually Need From a Red Build](failure-dossiers-what-agents-actually-need-from-a-red-build.md)
- [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md)
- [Nightly Verification Loops](nightly-verification-loops.md)
- [Lab: Write the CI Workflow from Scratch](lab-write-the-ci-workflow-from-scratch.md)
