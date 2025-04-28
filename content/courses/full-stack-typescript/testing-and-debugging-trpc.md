---
modified: 2025-03-15T22:39:42.000Z
description: >-
  Learn to efficiently run server-side unit tests for tRPC using
  `createCaller()` without needing an Express server setup. Includes tips for
  debugging to ensure seamless development.
title: >-
  "Efficient Server-Side Unit Testing with tRPC: Using `createCaller()` without
  Express"
---

## Server-Side Unit Tests

tRPC offers a handy `createCaller()` to directly call your procedures without spinning up an Express server. Combine this with a test DB or mocking:

```ts
// server/test/userRouter.test.ts
import { test, expect, beforeEach } from 'vitest';
import { appRouter } from '../src/index';
import Database from 'better-sqlite3';

let db: Database;

beforeEach(() => {
  db = new Database(':memory:');
  db.prepare('CREATE TABLE user (id INTEGER PRIMARY KEY, name TEXT, password TEXT)').run();
  db.prepare('INSERT INTO user (name, password) VALUES (?, ?)').run('Alice', 'pass123');
});

test('getUser finds existing user', async () => {
  const caller = appRouter.createCaller({ db, user: null });
  const user = await caller.user.getUser(1);
  expect(user?.name).toBe('Alice');
});
```

No messing with HTTP calls, so it's fast. If you want integration or end-to-end tests, you can spin up your server and query it normally. For big apps, you might also do front-end integration tests using Cypress or Playwright.

## Debugging

- **Check logs**: Add an `onError` to the tRPC middleware or use a logging middleware.
- **React Query DevTools**: If using React, the dev tools can reveal query states, caching, and more.
- **Console logs**: When in doubt, sprinkle them around (and remove them once you're done!).
- **CORS**: Make sure you enable it if your client is served from a different origin.
