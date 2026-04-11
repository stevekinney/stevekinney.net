---
title: "Lab: Refactor Shelf's Fixtures"
description: Take a deliberately smell-heavy fixture file and turn it into something you'd be willing to merge, without breaking the spec that exercises it.
modified: 2026-04-11
date: 2026-04-11
---

The fixtures lesson gave you the rules. This lab makes you apply them to real code. The Shelf starter ships a committed starting point at `tests/end-to-end/labs/fixtures/bad-fixtures.ts` — a fixture file that runs and passes, but has every smell the lesson calls out.

The lab is not about making the spec pass. It already passes. The lab is about making the fixture file match the discipline the lesson taught.

> [!NOTE] Isolation
> The lab lives under `tests/end-to-end/labs/fixtures/` and runs through a dedicated `playwright.labs.config.ts`. The production `tests/end-to-end/fixtures.ts` is never touched. If you break something in the lab, the real suite stays green.

## The starting point

Open `tests/end-to-end/labs/fixtures/bad-fixtures.ts` in the Shelf starter. You'll see a file that defines five fixtures:

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
- A `loggedOutPage` fixture that opens a fresh browser context but fights the project-level storage state — awkward to compose, only used in one test.

## Your job

Refactor `bad-fixtures.ts` without breaking `fixtures-lab.spec.ts`. You may (and should) edit the spec file to match your new fixture names and shapes — changing what each test _asks for_ is part of the refactor. Do **not** change what each test is _checking_. The discipline of keeping assertions stable is what keeps the exercise about fixture design rather than test rewriting.

When you're done, diff your version against the committed `good-fixtures.ts` in the same folder. The two won't match byte-for-byte, and that's fine. What should match is the spirit:

- Names describe what each fixture provides.
- Every mutating fixture has an `await`-ed teardown half.
- Scope choices are justified in a one-line comment.
- At least one "fixture" has been demoted back to a plain helper function.
- Any fixture that still exists earns its keep across more than one test.

## Acceptance criteria

Run this from the Shelf repo root:

```bash
npm run test:e2e:lab-fixtures
```

That script wraps the lab project end-to-end: `drizzle-kit push --force` bootstraps the database, and then Playwright runs `setup` + `labs-fixtures` against `playwright.labs.config.ts`. It should still pass cleanly after your refactor. If it doesn't, you broke the spec contract, not the fixture design.

Then, eyeballing the file:

- Every fixture in your refactored `bad-fixtures.ts` has a one-line comment naming the scope choice and why.
- Every fixture that mutates state (seeds, resets, logs in) has a teardown half after `await use(...)`, and the teardown is awaited.
- At least one of the five original fixtures has been moved out of the fixtures file into a plain helper function, and the spec now calls the helper directly instead of asking for it as a fixture.
- There is no fixture named for a setup verb — no `setupUser`, no `doLogin`, no `initializeShelf`. Rename anything that looks like that.
- `npm run test:e2e:lab-fixtures` runs ten times in a row without a single failure:
  ```bash
  for i in {1..10}; do npm run test:e2e:lab-fixtures || break; done
  ```

## Suggested order of attack

Work top-down. Fix one smell, run the spec, move on.

First, rename. `setupUser` becomes `seededReader`, `setupEmptyShelf` and `setupShelfWithBooks` collapse into one `seededShelf` with a clearer name. Update the spec file to match. The spec should still pass.

Next, add teardowns. Any fixture that calls `resetShelfContent` or mutates state through the `request` fixture gets an `await resetShelfContent(request)` on the teardown side of `await use(...)`. This is the change the lesson cares about the most.

Then, decide what's actually a fixture. `setupUser` returning `{ email: 'alice@example.com' }` is a constant, not a fixture — you can either keep it as a fixture if you want the shape (so future labs can swap users) or move it out entirely. Make the choice explicit in a comment.

Finally, handle `loggedOutPage`. One test uses it. It's a helper function wearing a fixture costume. Export it from `good-fixtures.ts` as a plain function (the committed solution shows one way) and have the spec call it directly. Note the tradeoff: the helper has to hand teardown responsibility back to the caller, because only fixtures can _own_ teardown.

## Stretch

Add a `resetBetweenTests` fixture that wraps `resetShelfContent(request)` so every test in the lab project gets a clean shelf without needing a `beforeEach`. Write the teardown half, too — even though `resetShelfContent` is idempotent, the muscle memory matters.

But: pause before you ship it. Is this better than a `beforeEach` in the spec? Sometimes the answer is no. A fixture with no teardown and one line of setup is a fixture that should have been a `beforeEach`. Make the call, and write it in the commit message.

## What success looks like

Your `bad-fixtures.ts` is now shorter, not longer. The spec still passes. You diff against `good-fixtures.ts` and realize your refactor made different choices than the solution made — and you can defend both.

The commit you'd be willing to merge is the one where future-you reads this file in six months and isn't annoyed at anyone.

## Additional Reading

- [Fixtures: Worker-Scoped, Test-Scoped, and the Trap Between Them](fixtures-worker-scoped-test-scoped.md) — the lesson this lab exercises.
- [Deterministic State and Test Isolation](deterministic-state-and-test-isolation.md) — for the `resetShelfContent` and `seedFreshDatabase` helpers you'll be wrapping in teardowns.
- [Lab: Harden the Flaky Rate-Book Test](lab-harden-the-flaky-rate-book-test.md) — the other real-refactor lab in this course, for when you want more of this kind of thing.
