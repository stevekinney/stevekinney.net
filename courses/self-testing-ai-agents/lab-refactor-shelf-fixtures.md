---
title: "Lab: Refactor Shelf's Fixtures"
description: Take a deliberately smell-heavy fixture file and turn it into something you'd be willing to merge, without breaking the spec that exercises it.
modified: 2026-04-14
date: 2026-04-11
---

The fixtures lesson gave you the rules. This lab makes you apply them to real code. The Shelf starter ships a committed starting point at `tests/labs/fixtures/fixtures.ts` — a fixture file that becomes runnable once you have the earlier auth and seeding labs in place, and then shows every smell the lesson calls out.

The lab is not about making the spec pass. It already passes. The lab is about making the fixture file match the discipline the lesson taught.

> [!NOTE] Isolation
> The lab lives under `tests/labs/fixtures/`, and the current starter's root `playwright.config.ts` ignores that subtree on purpose so `npm run test` stays green by default. Create a throwaway local config for this lab run, or use another narrow equivalent, so the production suite stays green while you refactor the lab slice.

> [!NOTE] Why this lab now sits later in the sequence
> The committed lab fixture calls `resetShelfContent()` from `tests/helpers/seed.ts`. That helper gets built in [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md). By the time you reach this lab in the normal course order, it should already exist. If you skipped ahead, build that helper first or treat this lab as a dry refactor until it does.

> [!NOTE] Auth prerequisite
> This lab also assumes you already built whatever authenticated Playwright setup you use for the protected Shelf pages earlier in the course. The starting `authedPage` fixture is intentionally redundant against that setup. Part of the refactor is recognizing the redundancy and deleting it.

## The starting point

Open `tests/labs/fixtures/fixtures.ts` in the Shelf starter. The file defines five fixtures:

- `setupUser`
- `setupEmptyShelf`
- `setupShelfWithBooks`
- `authedPage`
- `loggedOutPage`

Each one has at least one of the smells the lesson catalogued. Count them. I get seven. See if you can find more.

- Fixture names that describe _what the fixture does_ instead of _what it provides_ (`setupUser` instead of `seededReader`).
- Fixtures that mutate server state with no teardown half.
- A fixture (`setupShelfWithBooks`) that duplicates what `resetShelfContent` already does — a helper wearing a fixture costume.
- A fixture (`setupUser`) that's a one-line constant pretending to be infrastructure.
- A fixture (`authedPage`) that just navigates to `/shelf` and asserts a URL, which is a line of code, not a fixture.
- Zero scope-justification comments anywhere.
- A `loggedOutPage` fixture that opens a fresh browser context but fights the authenticated default browser state you already set up for the lab run — awkward to compose, only used in one test.

## Your job

Refactor `fixtures.ts` without breaking `fixtures-lab.spec.ts`. You may (and should) edit the spec file to match your new fixture names and shapes — changing what each test _asks for_ is part of the refactor. Do **not** change what each test is _checking_. The discipline of keeping assertions stable is what keeps the exercise about fixture design rather than test rewriting.

When you're done, compare your version against the [solution walkthrough](refactor-shelf-fixtures-solution.md). The two won't match byte-for-byte, and that's fine. What should match is the spirit:

- Names describe what each fixture provides.
- Every mutating fixture has an `await`-ed teardown half.
- Scope choices are justified in a one-line comment.
- At least one "fixture" has been demoted back to a plain helper function.
- Any fixture that still exists earns its keep across more than one test.

## Acceptance criteria

Run this from the Shelf repo root:

Run the lab slice with whichever narrow command you chose for isolation. One workable shape today is a throwaway config file plus the lab opt-in flag:

```ts
// playwright.lab.local.config.ts
import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

export default defineConfig({
  ...baseConfig,
  testIgnore: ['**/labs/broken-traces/**'],
});
```

```bash
PLAYWRIGHT_INCLUDE_LABS=1 npx playwright test --config=playwright.lab.local.config.ts tests/labs/fixtures/fixtures-lab.spec.ts
```

Do not commit that temp config. It exists only to let this ignored lab slice run against the single-config starter.

A dedicated script is fine too if you add one during the lab. It should still pass cleanly after your refactor. If it doesn't, you broke the spec contract, not the fixture design.

Then, eyeballing the file:

- Every fixture in your refactored `fixtures.ts` has a one-line comment naming the scope choice and why.
- Every fixture that mutates state (seeds, resets, logs in) has a teardown half after `await use(...)`, and the teardown is awaited.
- At least one of the five original fixtures has been moved out of the fixtures file into a plain helper function, and the spec now calls the helper directly instead of asking for it as a fixture.
- There is no fixture named for a setup verb — no `setupUser`, no `doLogin`, no `initializeShelf`. Rename anything that looks like that.
- Your lab-only fixture command runs ten times in a row without a single failure:
  ```bash
  for i in {1..10}; do <your-lab-command> || break; done
  ```

## Suggested order of attack

Work top-down. Fix one smell, run the spec, move on.

First, rename. `setupUser` becomes `seededReader`, `setupEmptyShelf` and `setupShelfWithBooks` collapse into one `seededShelf` with a clearer name. Update the spec file to match. The spec should still pass.

Next, add teardowns. Any fixture that calls `resetShelfContent` or mutates state through the `request` fixture gets an `await resetShelfContent()` on the teardown side of `await use(...)`. This is the change the lesson cares about the most.

Then, decide what's actually a fixture. `setupUser` returning `{ email: 'alice@example.com' }` is a constant, not a fixture — you can either keep it as a fixture if you want the shape (so future labs can swap users) or move it out entirely. Make the choice explicit in a comment.

Finally, handle `loggedOutPage`. One test uses it. It's a helper function wearing a fixture costume. Turn it into a plain helper function (the solution walkthrough shows one way) and have the spec call it directly. Note the tradeoff: the helper has to hand teardown responsibility back to the caller, because only fixtures can _own_ teardown. This is especially obvious once you already have authenticated default browser state in place — the helper exists specifically to opt _out_ of that setup for one test, not to become a new shared abstraction.

## Stretch

Add a `resetBetweenTests` fixture that wraps `resetShelfContent()` so every test in the lab project gets a clean shelf without needing a `beforeEach`. Write the teardown half, too — even though `resetShelfContent` is idempotent, the muscle memory matters.

But: pause before you ship it. Is this better than a `beforeEach` in the spec? Sometimes the answer is no. A fixture with no teardown and one line of setup is a fixture that should have been a `beforeEach`. Make the call, and write it in the commit message.

## What a Good Refactor Leaves Behind

Your `fixtures.ts` is now shorter, not longer. The spec still passes. You compare it against the solution walkthrough and realize your refactor made different choices than the solution made — and you can defend both.

The commit you'd be willing to merge is the one where future-you reads this file in six months and isn't annoyed at anyone.

## Additional Reading

- [Fixtures: Worker-Scoped, Test-Scoped, and the Trap Between Them](fixtures-worker-scoped-test-scoped.md) — the lesson this lab exercises.
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md) — for the `resetShelfContent` and `seedFreshDatabase` helpers you'll be wrapping in teardowns.
- [Lab: Harden the Flaky Rate-Book Test](lab-harden-the-flaky-rate-book-test.md) — the other real-refactor lab in this course, for when you want more of this kind of thing.
