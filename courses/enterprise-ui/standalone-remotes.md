---
title: Standalone Remotes
description: >-
  A Module Federation remote that can run independently—with its own dev server,
  mock data, and UI—is dramatically easier to develop, test, and debug than one
  that requires the host to be running.
modified: 2026-03-17
date: 2026-03-01
---

In the [runtime composition exercise](/courses/enterprise-ui/runtime-composition-exercise), the analytics remote runs on `localhost:3001` and the host loads it at runtime. But if you visit `localhost:3001` directly, you'll see the analytics dashboard running on its own—no host required. It has its own HTML shell, its own mock data via [MSW](https://mswjs.io/), and its own entry point. The remote is a standalone application that _also_ happens to expose modules for federation.

This isn't an accident. It's the single most important developer experience decision you'll make in a Module Federation architecture.

## Why Standalone Mode Matters

Without standalone mode, developing a remote means running the host alongside it. That means two dev servers, the host's full dependency tree, and the federation runtime's negotiation overhead—all just to see your component render. If the host has its own remotes, you might need three or four servers running. The feedback loop gets slower with every remote you add.

Standalone mode breaks that dependency. A developer working on the analytics dashboard can `cd remote-analytics && pnpm dev`, open `localhost:3001`, and iterate in isolation. They don't need the host running. They don't need other remotes running. They don't need to understand the host's routing, auth flow, or state management. They just need their own code.

That isolation also makes testing more tractable. You can write component tests and integration tests against the standalone remote without spinning up the entire federated system. You can run Playwright against `localhost:3001` and verify the analytics dashboard's behavior in isolation. You can run lighthouse against a single remote instead of the full shell.

## How It Works

A standalone remote is just a normal application that happens to also configure `exposes` in its Module Federation setup. The key is the `eager: true` flag on shared dependencies.

When a remote is loaded through a host, Module Federation's runtime handles shared dependency resolution—the host provides React, `react-dom`, and whatever else is declared as `shared`. The remote doesn't need to bundle its own copy. But when the remote runs on its own, there's no host to provide anything. Without `eager: true`, the remote would try to request shared modules from a host that doesn't exist, and you'd get a runtime error.

`eager: true` tells the remote to bundle shared dependencies directly into its output as a fallback. The federation runtime still deduplicates at runtime when a host is present—`eager` doesn't mean "always load your own copy." It means "have your own copy ready in case nobody else provides one." That's what makes standalone mode possible without duplicating React in production.

The remote also needs its own HTML entry point. In the exercise repo, the remote has its own `index.html`, its own `index.tsx`, and its own root component that wraps the analytics dashboard. When loaded through the host, none of that matters—the host imports `analytics-dashboard` directly via the `exposes` configuration. But when loaded standalone, that HTML entry point is what the browser actually renders.

## Mock Data with MSW

The other half of standalone mode is data. The analytics dashboard needs user data, analytics metrics, and auth state to render anything useful. In the full application, that data comes from the host's API and auth flow. In standalone mode, there's no host—so the remote needs its own data source.

[Mock Service Worker](https://mswjs.io/) is the cleanest solution here because it intercepts `fetch` requests at the network level. The remote's code makes the same API calls it would make in production, and MSW responds with mock data. No conditional logic, no `if (isStandalone)` branches, no environment-variable-driven data sources. The application code is identical in both modes.

A typical standalone MSW setup:

```typescript
// remote-analytics/src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/analytics/metrics', () => {
    return HttpResponse.json({
      totalUsers: 12847,
      activeUsers: 3291,
      revenue: 148920,
      conversionRate: 3.2,
    });
  }),
];
```

```typescript
// remote-analytics/src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

```typescript
// remote-analytics/src/index.tsx
async function main() {
  if (process.env.NODE_ENV === 'development') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
}

main();
```

The `onUnhandledRequest: 'bypass'` is important—it tells MSW to let unhandled requests through to the network instead of warning about them. In standalone mode, you only want to mock the APIs your remote actually uses, not every request the browser makes.

## The Auth Gap

One thing you'll notice in standalone mode is that the analytics dashboard shows "Not authenticated." That's expected. In the full application, the host writes to `authStore` after fetching user data. In standalone mode, there's no host to do that.

You have a few options for handling this:

- **Accept it.** If auth state isn't critical for the UI you're developing, just ignore the "Not authenticated" badge and focus on the analytics functionality. This is fine for most day-to-day development.
- **Mock the auth store.** In your standalone entry point, write to `authStore` directly with mock data before rendering. This gives you a realistic auth state without needing the host.
- **Mock the auth API.** Add an MSW handler for `/api/users/me` in the standalone mock setup, then initialize the auth store in the remote's own entry point using the same fetch-and-set pattern the host uses.

The mock-auth-store approach is the simplest:

```typescript
// remote-analytics/src/index.tsx
import { authStore } from '@pulse/shared';

authStore.set({
  user: { id: '1', name: 'Grace Hopper', role: 'admin' },
  isAuthenticated: true,
  token: 'mock-standalone-token',
});
```

Now standalone mode shows "Viewing as: Grace Hopper" just like the full application.

## Standalone Drift

The one real risk with standalone mode is drift. Fowler's [microfrontends article](https://martinfowler.com/articles/micro-frontends.html) warns about exactly this: simplified standalone development can diverge from the real container, especially around shared styles, global state, and environmental differences. If the host's CSS reset changes, the standalone remote won't reflect that. If the host updates its auth payload shape, the standalone mock data won't know.

The mitigation is regular integration testing in the full federated environment. Standalone mode is for fast iteration during development. It's not a substitute for running the full system before shipping. A healthy workflow is: develop and test in standalone mode, verify in the full host before merging, and run integration tests against the composed application in CI.

Think of standalone mode the same way you'd think about running a backend service locally with a mock database. It's great for development speed, but you still run integration tests against a real database before deploying. The mock is a convenience, not a contract guarantee.

## The Minimum Viable Standalone Remote

If you're setting up a new remote and want standalone mode from the start, the checklist is short:

- Give the remote its own `index.html` and root entry point
- Set `eager: true` on all shared dependencies so the remote can self-boot
- Add MSW handlers for every API the remote calls
- Optionally seed shared stores (like `authStore`) with mock data in the standalone entry point
- Make sure the remote's dev server config serves the standalone entry point, not just the federation manifest

That's it. The remote is now a real application that also happens to be consumable via federation. Development stays fast, testing stays isolated, and the federation layer only matters when you're integrating with the host.

---

## TL;DR

### Standalone Remotes

> Run any remote independently — without the host.

- Every remote should boot on its own for development and testing.
- Set `eager: true` for shared dependencies so the remote loads its own copies.
- Mock shared context (auth state, feature flags) with MSW or local providers.

**Minimum viable standalone remote:**

1. Boots with `npm run dev` — no host required
2. Has mock data for API dependencies
3. Provides its own auth context
4. Runs its own test suite in isolation

---

### Standalone Drift

> The risk: your standalone remote diverges from reality.

- Mock data gets stale — the real API changed, your mocks didn't.
- Auth context in standalone doesn't match the host's token shape.
- Shared dependency versions drift between standalone and host.

**Mitigation:**

- Integration tests that boot the full composed application (CI only).
- Contract tests between remotes and the host.
- Shared MSW handlers across standalone and test environments.
- Regular "compose and smoke test" pipeline — not just unit tests.
