---
title: Nightly Verification Loops
description: Some checks are too slow, too broad, or too drift-sensitive for the fast loop. This appendix shows how to schedule them without turning them into ignored noise.
modified: 2026-04-14
date: 2026-04-06
---

Some checks are valuable enough to keep and annoying enough that you do not want them on every pull request. That is the entire reason nightly workflows exist.

The trick is to use them for the right jobs. If you dump everything you were too lazy to organize into a cron and call it "nightly," you have not built a loop. You have built a junk drawer with a timestamp.

The good version uses scheduled runs for checks that are:

- broad
- slow
- drift-sensitive
- still worth knowing about before users do

The [GitHub Actions `schedule` event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) is enough to run that loop well.

> [!NOTE] Prerequisite
> This appendix assumes the core CI workflow exists and the cross-browser smoke subset is already defined. Nightly work is where the slower and broader checks live after the fast loop is healthy.

## What belongs in nightly

These are excellent nightly candidates:

- cross-browser smoke or broader multi-browser coverage
- dependency audit or outdated package checks
- HAR refresh or upstream-contract drift checks
- longer-running performance checks
- data or content integrity jobs that are too expensive for every push

These are bad nightly candidates:

- formatting
- lint
- the default unit suite
- anything you actually need before merge

Nightly is not a replacement for the main loop. It is where you put the expensive guardrails that still buy you signal.

## Make the schedule work for you, not against you

A few schedule rules matter more than people think:

- GitHub Actions cron uses UTC
- scheduled workflows can be delayed, especially at the top of the hour
- the workflow definition must live on the default branch

That means "run it at 00 minutes past the hour" is the worst lazy default. Pick an off-minute like `17` or `43` so your workflow is not competing with every other repository on earth for the same slot.

## The minimum nightly workflow

Here is the smallest nightly workflow that still teaches the shape. Two jobs: one real (`dependency-audit`, because `npm audit` is always available) and one explicit placeholder (`har-refresh`) that echoes the intended next step so the job exists in the GitHub UI even before the automation lands.

```yaml
# .github/workflows/nightly.yml
name: Nightly

on:
  schedule:
    # Off the top of the hour to avoid the GitHub Actions stampede.
    - cron: '17 4 * * *'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  dependency-audit:
    name: Dependency audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
      - name: Run npm audit
        run: npm audit --audit-level=high

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

A few things to notice:

- **`workflow_dispatch`** is next to `schedule` on purpose. It gives you a "Run workflow" button in the GitHub Actions UI so you can kick off a nightly run on demand without editing the cron.
- **Placeholder jobs are better than missing jobs.** An `echo` step that describes the intended next step keeps the job name visible in the UI, makes the intent discoverable in `git log`, and fails loudly if someone accidentally deletes the surrounding YAML. An empty `jobs:` key gives you nothing to notice.
- **Keep each job to one named command.** Even when that command is just `echo`, the shape matches what the real jobs will look like. When the `har-refresh` automation lands, it replaces the `echo` step with `npm run har:refresh` or equivalent without restructuring the workflow.

Expand this shell as the real jobs come online: a `cross-browser-smoke` job that runs the cross-browser smoke subset from the previous appendix, a `performance-audit` job that runs a broader Lighthouse or bundle check, a `data-integrity` job if you have seeded content that can drift.

When you add the `cross-browser-smoke` job in `nightly.yml`, you can implement the split using **project-based filtering** rather than the `@cross-browser` tag pattern shown earlier — for example, `firefox-smoke` and `webkit-smoke` Playwright projects with `testMatch: /smoke\.spec\.ts/`. Project-based and tag-based filtering are equivalent for this case: pick projects when the split is by file, pick tags when the split is by individual test inside an otherwise mixed file. The lesson on cross-browser validation walks through both patterns.

## Nightly failures should land like any other failure

The failure handling should look familiar by now:

- upload artifacts
- write a short workflow summary
- give the agent or human a clean reproduction path

If the nightly run fans out across multiple browser or shard jobs, use blob reports as the intermediate artifact and merge them before you publish the final HTML report. That is the cleanest way to keep one readable report instead of a scattering of half-reports nobody opens.

If the run is truly wide, turn on `fullyParallel: true` so Playwright shards at the test level instead of the file level. Attach per-project `metadata` — for example `metadata: { lane: 'nightly-firefox' }` on the Firefox project — if you need the merged report to preserve "nightly-firefox" versus "nightly-webkit" as distinct evidence streams, and wire [`attachmentsBaseURL`](https://playwright.dev/docs/test-reporters) once attachments live outside the report directory.

If a nightly job fails and all you get is a red badge, the loop is incomplete. The whole point is to discover drift while there is still time to do something intelligent about it. For nightly jobs that produce text-heavy output, [structured CLI output](structured-cli-output-as-pipeline-glue.md) can turn the results into machine-readable status reports that downstream scripts branch on—opening issues, pinging Slack, or routing to the agent—without a custom parser for each job.

## Do not auto-update visual baselines on a schedule

I am repeating this because people keep doing it.

Do **not** run `--update-snapshots` on a cron. That is not a verification loop. That is a polite little robot that comes by every night to erase evidence.

If a scheduled job changes something humans need to review, open a pull request or at least leave a diff artifact. Never silently rewrite the baseline and call it healthy.

## The handoff back into the daily loop

Nightly checks are only useful if their failures turn back into daily work.

That can mean:

- a pull request with the updated HAR
- an issue for a dependency or drift problem
- a failing artifact the agent can read and fix against

The nightly loop finds the drift. The daily loop fixes it. If those two loops are not connected, the nightly run becomes background wallpaper.

## How You Know Nightly Is Pulling Its Weight

You have a useful nightly loop when:

- the scheduled jobs are genuinely too broad or slow for every pull request
- failures produce artifacts and a reproduction path
- the output flows back into normal repository work instead of disappearing into email

## The one thing to remember

Nightly workflows are where you put the expensive, still-important checks after the fast loop is healthy. If a nightly failure does not come back as actionable work, it is not a loop yet.

## Additional Reading

- [Cross-Browser Validation Without Burning the Dev Loop](cross-browser-validation-without-burning-the-dev-loop.md)
- [Lab: Add a Nightly Verification Workflow](lab-add-a-nightly-verification-workflow.md)
