---
title: Cross-Browser Validation Without Burning the Dev Loop
description: Chromium stays the fast default. This appendix shows where Firefox and WebKit belong, and how to add them without making every pull request miserable.
modified: 2026-04-14
date: 2026-04-06
---

Cross-browser testing is one of those ideas everyone agrees with in principle and quietly avoids in practice because it threatens to turn every pull request into a hostage situation.

That only happens if you use the wrong scope.

The fix is not "skip other browsers." The fix is "decide which checks belong in Chromium, which belong in a small multi-browser smoke set, and which belong in nightly coverage." [Playwright projects](https://playwright.dev/docs/test-projects) make that split practical.

> [!NOTE] Prerequisite
> This appendix assumes the core CI loop is already in place. Chromium remains the fast default in the mainline workshop flow. The extra browsers belong here because they are valuable and more expensive.

## Why other browsers still matter

Some bugs are gloriously browser-specific:

- focus handling differs
- date inputs and form controls render differently
- CSS layout or overflow behaves slightly differently
- a feature works in Chromium and gets weird in Firefox
- a WebKit run exposes the problem your Mac user was complaining about all along

If your answer to all of that is "well, the Chromium test passed," then your answer is not especially useful.

## Why I do not want the full matrix on every edit

Because most edits do not deserve it.

If the agent is changing a string copy fix or a small server-side refactor, waiting on Chromium plus Firefox plus WebKit is wasted time. The dev loop should stay cheap by default.

My default split:

- **Local and fast pull request loop**: Chromium
- **Small cross-browser smoke loop**: Firefox and WebKit on a narrow set of routes
- **Nightly broader loop**: the fuller matrix, or at least the most failure-prone paths

That is the balance I have seen teams actually maintain.

## The Playwright projects that split the work

Playwright projects are the mechanism that makes "Chromium on every edit, Firefox and WebKit on a smoke subset" actually work. Each project is a named configuration block inside `playwright.config.ts` that can point at a different browser, a different testMatch, and a different set of options. One common _completed_ Shelf split looks like this after the auth, visual, performance, and cross-browser labs have all landed:

```ts
projects: [
  {
    name: 'setup',
    testMatch: /authentication\.setup\.ts/,
  },
  {
    name: 'public',
    testMatch: /(smoke|visual|playground)\.spec\.ts/,
    use: {
      ...devices['Desktop Chrome'],
    },
  },
  {
    name: 'authenticated',
    testMatch: /(rate-book|accessibility|visual-authenticated|performance)\.spec\.ts/,
    use: {
      ...devices['Desktop Chrome'],
      storageState: storageStatePath,
    },
    dependencies: ['setup'],
  },
  // Cross-browser smoke projects. They run only the `smoke.spec.ts` file
  // against Firefox and WebKit. Skip them by default — invoke via
  // `npm run test:cross-browser` when you specifically want the
  // expanded matrix.
  {
    name: 'firefox-smoke',
    testMatch: /smoke\.spec\.ts/,
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit-smoke',
    testMatch: /smoke\.spec\.ts/,
    use: { ...devices['Desktop Safari'] },
  },
];
```

That is not what Shelf ships. It is the fuller multi-project version you build up across the middle of the course. The important split for this lesson is simpler: keep Chromium as the default fast loop, and make Firefox/WebKit opt-in smoke projects. The default `npm run test` script can then pin the fast project so Firefox and WebKit do not sneak into the everyday loop:

```json
{
  "scripts": {
    "test": "playwright test --project=chromium",
    "test:cross-browser": "playwright test --grep @cross-browser --project=chromium --project=firefox-smoke --project=webkit-smoke"
  }
}
```

> [!IMPORTANT] Install the extra browsers first
> Playwright only installs Chromium when you set up the fast loop. Before running `npm run test:cross-browser` for the first time — locally or in a fresh CI runner — install the cross-browser binaries explicitly:
>
> ```sh
> npx playwright install --with-deps firefox webkit
> ```
>
> Skip this and the alternate-browser projects will fail with a "browser not installed" error that has nothing to do with your test code. Shelf's `nightly.yml` workflow runs the same install line in its `cross-browser-smoke` job for the same reason.

## Tag the right tests, not all the tests

The mistake people make is trying to run the whole suite everywhere.

Don't.

Tag the tests that earn cross-browser coverage:

- login
- navigation
- dialogs and menus
- a couple of high-value forms
- the routes where layout bugs hurt most

This gives you a stable, small "does the product basically work in these engines?" set. The rest can stay Chromium-first unless history tells you otherwise.

Projects are one way to filter. Playwright's built-in test tags are the other, and the two are complementary. Tag a test with `@cross-browser` to mark it as part of the cross-browser smoke set, then run it explicitly via `--grep`:

```ts
// tests/rate-book.spec.ts
test('user can rate Station Eleven', { tag: '@cross-browser' }, async ({ page }) => {
  // ...
});
```

```sh
# Run every @cross-browser-tagged test in both alternate engines:
npx playwright test --project=firefox-smoke --project=webkit-smoke --grep @cross-browser
```

Projects say "which browser + which file match pattern." Tags say "which individual tests inside that match pattern." Use projects when the split is by _file_ (all the smoke specs go to Firefox, none of the rate-book specs do), and tags when the split is by _test within a file_ (the rate-book file has ten tests but only two earn cross-browser coverage).

If you are merging reports from multiple browser jobs later, add a global config `tag` per lane so the merged report can still tell you "this came from the Firefox smoke job" instead of flattening everything into one unlabeled blob of evidence.

If the smoke set grows enough to need sharding, `fullyParallel: true` is the setting that keeps shards balanced at the test level instead of the file level. And if the merged HTML report is serving attachments from some external bucket instead of the checked-out artifact directory, [`attachmentsBaseURL`](https://playwright.dev/docs/test-reporters) is what keeps those trace and screenshot links from turning into dead air.

## WebKit is strong signal, not a legal guarantee

Playwright gives you Chromium, Firefox, and WebKit. That is exactly what you want for automation coverage. It is also worth being honest about the nuance: WebKit is your best automated signal for Safari-family behavior, not a magical guarantee about every real-device Safari quirk in the wild.

That is still extremely valuable. Just do not oversell it.

## Keep the failure output legible

Cross-browser failures get noisy fast if you do not separate them cleanly.

I want:

- browser name in the job or artifact name
- retained traces and screenshots per browser
- blob reports per browser when the run is sharded or split across jobs
- a small enough test set that the failing browser is obvious

When Firefox fails and Chromium passes, the agent should not need a detective novel. It should get a clean artifact and a clean reproduction command.

## The agent rules

```markdown
## Cross-browser checks

- Chromium is the default fast browser for local iteration.
- Cross-browser coverage runs on a tagged smoke subset, not the entire
  suite by default.
- If a bug is reported as browser-specific, reproduce it in the relevant
  browser project before proposing a fix.
- Treat browser-specific failures as real failures, not as flaky noise,
  unless you can point to a known infrastructure issue.
```

## How You Know the Split Is Healthy

You have a useful cross-browser loop when:

- Chromium stays the fast default
- Firefox and WebKit run on a deliberately small smoke subset
- artifacts make it obvious which browser failed and why

## The one thing to remember

Cross-browser validation is not about running everything everywhere. It is about running the _right_ small set in the browsers most likely to disagree, without slowing every edit into a small tragedy.

## Additional Reading

- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
- [Lab: Add Cross-Browser Coverage](lab-add-cross-browser-coverage.md)
