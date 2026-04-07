---
title: Deterministic State and Test Isolation
description: How to seed, reset, and isolate database state so tests never leak into each other and the suite can run in parallel without tears.
modified: 2026-04-07
date: 2026-04-06
---

We've handled the stuff outside your app—the Open Library API—by recording a HAR and replaying it. Now we need to handle the stuff _inside_ your app: the database, the session, anything stateful that a test writes to and another test might read from.

This is the lesson where Playwright tests become predictable. It's also the lesson most projects skip—and it's why most Playwright suites are a wall of `.only` and `.skip` annotations with a single person on the team who knows how to unblock the suite.

## The failure mode

```
✓ test 1: add book passes
✓ test 2: rate book passes
✗ test 3: view shelf fails—expected 3 books, got 7
```

Test 3 fails because tests 1 and 2 left data behind. Or because test 2 from _last_ night's CI run left data behind. Or because the developer ran the test locally yesterday and never cleaned up. Or because tests are running in parallel and two of them are writing to the same user's shelf simultaneously, racing each other to a nondeterministic result.

Every one of those is "the test suite isn't isolated." That's the disease. Everything we're about to do is the treatment.

## The two rules

Rule one: **every test starts in a known state.** Not an unknown state, not "whatever was there last time," not "the state the previous test happened to leave behind." A specific, named starting point. The agent should be able to read the test and know exactly what data exists when the test begins.

Rule two: **every test cleans up after itself, or runs in a bubble that gets torn down.** I slightly prefer the bubble approach because "cleans up after itself" is easy to forget and hard to verify.

Let's look at both.

## Rule one: seeding

Shelf uses SQLite via Drizzle. For end-to-end tests, we want a seeding helper that resets the database to a known state before each test (or each test file). The simplest version looks like this:

```ts
// tests/end-to-end/helpers/seed.ts
import { database } from '$lib/server/database';
import { users, books, shelfEntries } from '$lib/server/schema';

export async function seedDatabase() {
  // Wipe
  await database.delete(shelfEntries);
  await database.delete(books);
  await database.delete(users);

  // Insert baseline fixtures
  const [alice] = await database
    .insert(users)
    .values({
      id: 'user-alice',
      email: 'alice@example.com',
      username: 'alice',
      // ... etc
    })
    .returning();

  await database.insert(books).values([
    { openLibraryId: 'OL1', title: 'Station Eleven', author: 'Emily St. John Mandel' },
    { openLibraryId: 'OL2', title: 'Piranesi', author: 'Susanna Clarke' },
    { openLibraryId: 'OL3', title: 'Annihilation', author: 'Jeff VanderMeer' },
  ]);

  await database
    .insert(shelfEntries)
    .values([{ userId: alice.id, bookId: 'OL1', status: 'reading' }]);

  return { alice };
}
```

Then in a test:

```ts
import { seedDatabase } from './helpers/seed';

test.beforeEach(async () => {
  await seedDatabase();
});

test('alice can add Piranesi to her shelf', async ({ page }) => {
  await page.goto('/search?q=piranesi');
  await page.getByRole('button', { name: 'Add to shelf' }).click();
  await expect(page.getByText('Added to your shelf')).toBeVisible();
});
```

Every test starts with alice, three books, and one shelf entry (Station Eleven). That's the contract. If a test needs different data, it seeds different data _explicitly_, not by hoping some earlier test left it around.

The important thing here is that seeding is _fast_ against SQLite. You can afford to reseed before every test. If you're on Postgres and reseeding takes two seconds, you might reseed per file instead of per test, or use transactions (more on that in a moment).

## Rule two: isolation bubbles

Seeding gets you to a known _starting_ state. Isolation gets you to a known _process_—two tests that run in parallel never see each other's writes, full stop.

There are three common strategies. Pick one based on your database.

**Per-test transactions.** Wrap every test in a transaction, roll back at the end. This is the fastest option and it requires zero cleanup code, because nothing was ever committed. The catch: it only works if your application code reuses the same database connection the test opens. Node-level connection pooling usually breaks this, and you have to be careful with framework-level request handlers. Drizzle supports this via `database.transaction`, but wiring it into SvelteKit's request handlers takes more than a lesson's worth of plumbing. Worth knowing about; not my default recommendation.

**Per-worker databases.** [Playwright spins up multiple workers when it runs in parallel.](https://playwright.dev/docs/test-parallel) Each worker gets its own SQLite file, its own schema, its own seed. Tests within a worker share the database but always run serially, so they can't race each other. This is my default for SQLite. It looks like:

```ts
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: 4,
  use: {
    // Each worker gets its own database file via the env var
    baseURL: 'http://localhost:5173',
  },
});

// tests/end-to-end/helpers/seed.ts
const workerDatabasePath = `./test-database-${process.env.TEST_WORKER_INDEX ?? 0}.sqlite`;
```

Each worker points the app at a different SQLite file. When Playwright launches the dev server (or you launch it yourself with the right env var), it reads the worker index and uses the matching database.

**Per-test namespaces.** If the data has a natural scoping (a user, an organization, a tenant), make every test create its own. Alice-1 for test 1, Alice-2 for test 2. Tests then read and write under their own namespace and never collide. This is the heaviest ceremony of the three but it's also the most bulletproof, and it ports to any database including production-like Postgres.

For Shelf, we're going to use per-worker databases. It's the right amount of isolation for SQLite and it plays nicely with Playwright's parallelism.

## Turning on `fullyParallel`

Here's the thing: you _need_ to turn on parallelism, not just allow it. `fullyParallel: true` in your Playwright config tells Playwright to run individual tests within a file in parallel, not just across files. With per-worker isolation in place, this is safe and cuts your suite wall time dramatically.

If your suite starts failing when you flip `fullyParallel: true`, that's not a signal to turn it back off—it's a signal that your isolation was incomplete. Find the leaking state and fix it.

## Test fixtures for shared setup

[Playwright's `test.extend`](https://playwright.dev/docs/test-fixtures) is the clean way to attach seed data to tests:

```ts
import { test as base, expect } from '@playwright/test';
import { seedDatabase, type SeedResult } from './helpers/seed';

type Fixtures = {
  seeded: SeedResult;
};

export const test = base.extend<Fixtures>({
  seeded: async ({}, use) => {
    const result = await seedDatabase();
    await use(result);
    // no cleanup—reseed handles it on the next test
  },
});

export { expect };
```

And in a test:

```ts
import { test, expect } from './fixtures';

test('alice can rate Station Eleven', async ({ page, seeded }) => {
  await page.goto('/shelf');
  // `seeded.alice` is available if the test needs the user ID
  // ...
});
```

The fixture runs automatically when any test imports this `test`. No more `beforeEach` boilerplate scattered across files. And because the seeding logic is centralized, updating the baseline data is a single-file change.

## CLAUDE.md rules

```markdown
## Database state in end-to-end tests

- Every test runs against a freshly seeded database. The seed lives in
  `tests/end-to-end/helpers/seed.ts`. Do not bypass it.
- Tests must not depend on data left by previous tests. If a test
  needs specific data, add it to the seed or insert it explicitly at the
  top of the test.
- Each Playwright worker uses its own SQLite database file named
  `test-database-<worker-index>.sqlite`. Do not share state between
  workers.
- `playwright.config.ts` has `fullyParallel: true`. If a test fails
  under parallelism that passes serially, the test is leaking state.
  Do not "fix" it by disabling parallelism or adding `.serial`.
```

That last rule matters. Agents will happily disable parallelism to make a failing test pass. It works, it's green, and it's also a silent regression in suite speed and isolation guarantees. Don't let them.

## The one thing to remember

Two invariants make a Playwright suite trustworthy: every test starts in a known state, and no two tests can see each other's state. You get the first from seeding, the second from per-worker databases plus `fullyParallel`. Once both are in place, flaky parallelism stops being a thing, and the agent can write new tests without worrying about what order they'll run in.

## Additional Reading

- [Recording HARs for Network Isolation](recording-hars-for-network-isolation.md)
- [API and UI Hybrid Tests](api-and-ui-hybrid-tests.md)
