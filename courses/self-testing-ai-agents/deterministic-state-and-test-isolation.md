---
title: Deterministic State and Test Isolation
description: How to seed, reset, and isolate database state so tests never leak into each other and the suite can run in parallel without tears.
modified: 2026-04-09
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

Shelf uses SQLite via Drizzle. For end-to-end tests, we want a way to reset the database to a known state before each test (or each test file). The naive version is "import the Drizzle client from `$lib/server/db` and wipe the tables"—and that does not work from a Playwright spec, because `$lib/server/...` modules depend on server-only runtime context the test process does not have.

The pattern that _does_ work is a dev-only HTTP endpoint that the test calls through the `request` fixture. Shelf ships exactly that at `src/routes/api/testing/seed/+server.ts`. The endpoint is gated on an `ENABLE_TEST_SEED=true` environment variable and only runs inside the Playwright webServer, so it can never fire in production:

```ts
// src/routes/api/testing/seed/+server.ts (abridged)
import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { book, shelfEntry } from '$lib/server/db/schema';

export const POST: RequestHandler = async () => {
  if (env.ENABLE_TEST_SEED !== 'true') error(404, 'Not Found');

  await db.delete(shelfEntry);
  await db.delete(book);
  await db.insert(book).values([
    { openLibraryId: 'OL1W', title: 'Station Eleven', author: 'Emily St. John Mandel' },
    { openLibraryId: 'OL2W', title: 'Piranesi', author: 'Susanna Clarke' },
    { openLibraryId: 'OL3W', title: 'Annihilation', author: 'Jeff VanderMeer' },
  ]);
  // ... ensure a known reader account and seed a shelf entry for them ...

  return json({ ok: true });
};
```

The test-side helper at `tests/end-to-end/helpers/seed.ts` just POSTs to that endpoint through Playwright's `request` fixture:

```ts
// tests/end-to-end/helpers/seed.ts
import type { APIRequestContext } from '@playwright/test';

export const resetShelfContent = async (request: APIRequestContext) => {
  const response = await request.post('/api/testing/seed', { data: {} });
  if (!response.ok()) {
    throw new Error(`Seeding failed: ${response.status()}`);
  }
  return response.json();
};
```

Then in a test:

```ts
import { resetShelfContent } from './helpers/seed';

test.beforeEach(async ({ request }) => {
  await resetShelfContent(request);
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

**Per-worker databases.** [Playwright spins up multiple workers when it runs in parallel.](https://playwright.dev/docs/test-parallel) Each worker gets its own SQLite file, its own schema, its own seed. Tests within a worker share the database but always run serially, so they can't race each other. This is where I want SQLite projects to end up eventually. It looks like:

```ts
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: 4,
  use: {
    baseURL: 'http://localhost:5173',
  },
});

// tests/end-to-end/helpers/seed.ts
const workerDatabasePath = `./test-database-${process.env.TEST_WORKER_INDEX ?? 0}.sqlite`;
```

Each worker points the app at a different SQLite file. When Playwright launches the dev server (or you launch it yourself with the right env var), it reads the worker index and uses the matching database.

**Per-test namespaces.** If the data has a natural scoping (a user, an organization, a tenant), make every test create its own. Alice-1 for test 1, Alice-2 for test 2. Tests then read and write under their own namespace and never collide. This is the heaviest ceremony of the three but it's also the most bulletproof, and it ports to any database including production-like Postgres.

## What Shelf does today, and why

Shelf's current `playwright.config.ts` pins `workers: 1`. That's a deliberate intermediate step. The starter ships with `fullyParallel: true` so tests that _could_ run in parallel within a single worker still do, and individual specs pay the seeding cost on `beforeEach` instead of leaking state between files. But every worker currently points at the same SQLite file, so running more than one worker would let two tests trample each other.

The right next move for a project like this is the per-worker-database pattern above. Shelf defers it because it is a bigger plumbing change than this lesson: every server-side DB client needs to read `TEST_WORKER_INDEX`, the seed endpoint needs to know which file to reset, and the webServer command has to forward the index in. When Shelf grows stronger test isolation in a later phase, `workers: 1` becomes `workers: 4` and this lesson's "per-worker databases" pattern slots in wholesale.

Treat `workers: 1` as a floor, not a ceiling. If your suite starts failing when you flip it up, that's not a signal to turn it back off—it's a signal that your isolation was incomplete. Find the leaking state and fix it.

## Test fixtures for shared setup

[Playwright's `test.extend`](https://playwright.dev/docs/test-fixtures) is the clean way to attach seed data to tests when you find yourself repeating a `beforeEach` block:

```ts
import { test as base, expect } from '@playwright/test';
import { resetShelfContent, type SeedResult } from './helpers/seed';

type Fixtures = {
  seeded: SeedResult;
};

export const test = base.extend<Fixtures>({
  seeded: async ({ request }, use) => {
    const result = await resetShelfContent(request);
    await use(result);
    // no cleanup—reseeding handles it on the next test
  },
});

export { expect };
```

And in a test:

```ts
import { test, expect } from './fixtures';

test('reader can rate Station Eleven', async ({ page, seeded }) => {
  await page.goto('/shelf');
  // `seeded.reader` is available if the test needs the user id or email
  // ...
});
```

The fixture runs automatically when any test imports this `test`. No more `beforeEach` boilerplate scattered across files. And because the seeding logic is centralized, updating the baseline data is a single-file change.

## CLAUDE.md rules

```markdown
## Database state in end-to-end tests

- Every test runs against a freshly seeded database. The seed lives in
  `tests/end-to-end/helpers/seed.ts`. The helper calls the dev-only
  `/api/testing/seed` endpoint, which is gated on `ENABLE_TEST_SEED=true`.
- Tests must not depend on data left by previous tests. If a test
  needs specific data, add it to the seed or insert it explicitly at the
  top of the test.
- Individual specs call `resetShelfContent`, which does _not_ reset user
  accounts. Only the authentication setup project uses `seedFreshDatabase`,
  because deleting users invalidates the stored browser session.
- `playwright.config.ts` pins `workers: 1` today because every worker
  still shares one SQLite file. When per-worker isolation lands, that
  number goes up—don't disable `fullyParallel` as a workaround for a
  leaking test.
```

That last rule matters. Agents will happily disable parallelism to make a failing test pass. It works, it's green, and it's also a silent regression in suite speed and isolation guarantees. Don't let them.

## The one thing to remember

Two invariants make a Playwright suite trustworthy: every test starts in a known state, and no two tests can see each other's state. You get the first from a dev-only seed endpoint every spec calls through the `request` fixture. You get the second by choosing a strategy your database can support—per-worker files, transactions, or namespacing—and by treating flaky parallelism as a leak to fix, not a knob to turn down.

## Additional Reading

- [Recording HARs for Network Isolation](recording-hars-for-network-isolation.md)
- [API and UI Hybrid Tests](api-and-ui-hybrid-tests.md)
