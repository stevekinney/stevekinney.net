---
title: Msw And Contract Testing
description: >-
  Mock Service Worker (MSW) shines as a contract-testing tool when paired with
  TypeScript. With Zod or OpenAPI schemas as the source of truth, you can
  generate typed handlers, deterministic fixtures, and CI checks that detect
  drift between...
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T18:34:47.750Z'
---

Mock Service Worker (MSW) shines as a contract-testing tool when paired with TypeScript. With Zod or OpenAPI schemas as the source of truth, you can generate typed handlers, deterministic fixtures, and CI checks that detect drift between frontend assumptions and backend responses.

## Why Contracts Matter

- Confidence: Catch breaking API changes before users do.
- Types as truth: Infer types from Zod/OpenAPI so mocks match reality.
- Repeatable UX: Deterministic fixtures for stories, unit tests, and E2E.

## Typed Schemas and Fixtures with Zod

```ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export const userFixture = (overrides: Partial<User> = {}): User => ({
  id: crypto.randomUUID(),
  name: 'Jane Doe',
  email: 'jane@example.com',
  ...overrides,
});
```

## MSW Handlers That Validate at Runtime

```ts
import { http, HttpResponse } from 'msw';
import { UserSchema, userFixture } from './schemas';

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    const data = userFixture({ id: String(params.id) });
    // Validate before returning to catch drift in mocks too
    const parsed = UserSchema.parse(data);
    return HttpResponse.json(parsed, { status: 200 });
  }),
];
```

## Test Server Setup (Vitest/Jest)

```ts
// test/msw.ts
import { setupServer } from 'msw/node';
import { handlers } from '../src/mocks/handlers';

export const server = setupServer(...handlers);

// test/setup.ts
import { server } from './msw';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Hook `test/setup.ts` into your test runner (Vitest `setupFiles`, Jest `setupFilesAfterEnv`).

## OpenAPI-Driven Typings

Generate request/response types and MSW handlers from an OpenAPI spec using codegen (e.g., `openapi-typescript`, `orval`). Keep handlers in sync with backend evolution.

```bash
npm i -D openapi-typescript
npx openapi-typescript https://api.example.com/openapi.json -o src/generated/openapi.d.ts
```

```ts
// src/mocks/handlers.generated.ts
import { http, HttpResponse } from 'msw';
import type { components } from '../generated/openapi';

type User = components['schemas']['User'];

export const handlers = [
  http.get('/api/users/:id', ({ params }) => {
    const payload: User = {
      id: String(params.id),
      name: 'Jane Doe',
      email: 'jane@example.com',
    };
    return HttpResponse.json(payload);
  }),
];
```

## Contract Checks in CI

- Validate mock payloads with Zod in unit tests.
- Run a “contract test” suite that asserts all handlers return schema-valid data.
- Fail CI if schemas and generated types are out of date.

```ts
// test/contract/users.contract.test.ts
import { UserSchema } from '../../src/schemas';

it('user handler conforms to contract', async () => {
  const res = await fetch('/api/users/123');
  const data = await res.json();
  expect(() => UserSchema.parse(data)).not.toThrow();
});
```

## Using MSW Across Layers

- Unit tests (Vitest/Jest): type-safe handlers per test.
- Storybook: predictable fixtures per story.
- E2E (Playwright): route-level MSW or server mocks with identical schemas.

## Overriding Handlers Per Test with Type Safety

```ts
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw';
import { UserSchema } from '../src/schemas';

it('handles 404s with typed errors', async () => {
  server.use(
    http.get('/api/users/:id', () => HttpResponse.json({ message: 'not found' }, { status: 404 })),
  );
  const res = await fetch('/api/users/does-not-exist');
  expect(res.status).toBe(404);
  // Optionally validate error payload with a schema, too
});
```

## Storybook Integration

Use MSW addon to share the same handlers in stories, keeping demos and tests aligned.

```tsx
// .storybook/preview.ts
import { initialize, mswLoader } from 'msw-storybook-addon';
import { handlers } from '../src/mocks/handlers';

initialize({ onUnhandledRequest: 'bypass' });
export const loaders = [mswLoader];
export const parameters = { msw: { handlers } };
```

## See Also

- [Testing React TypeScript](testing-react-typescript.md)
- [Type-Level Testing in Practice](type-level-testing-in-practice.md)
- [Data Fetching and Runtime Validation](data-fetching-and-runtime-validation.md)
- [Typed Data Layer: React Query and tRPC](react-query-trpc.md)
