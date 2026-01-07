---
title: Suspense for Data Fetching
description: >-
  Stream UI progressively instead of blocking on everything—compose boundaries
  that keep pages interactive and informative.
date: 2025-09-06T22:01:30.022Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - suspense
  - data-fetching
---

React Suspense fundamentally changes how we think about loading states and data fetching. Instead of manually wiring up loading spinners and error boundaries throughout your component tree, Suspense lets you declaratively define loading boundaries that handle async operations gracefully. You compose these boundaries strategically to keep parts of your UI interactive while other parts are still loading—turning the traditional "everything waits for everything" pattern into something that feels more like progressive enhancement.

The real power comes from how Suspense boundaries work together with modern data fetching patterns to create streaming UIs that reveal content as soon as it's ready, rather than blocking the entire page on the slowest data dependency.

> See also: [The use Hook](./the-use-hook.md) for `use()`-specific patterns, basic Suspense composition, and error handling. This page focuses on Suspense-centric data fetching patterns, cache mechanics (throwing promises), and common pitfalls.

## Setting Up `Suspense` Boundaries

This guide assumes familiarity with basic boundary composition. For a primer and progressive enhancement examples, see [The use Hook](./the-use-hook.md).

## Data Fetching Patterns with `Suspense`

To work with Suspense, your data fetching needs to follow the "render-as-you-fetch" pattern. Here's how to implement a suspense-compatible data fetching hook:

```tsx
// Simple cache to store promises and results
const cache = new Map<string, Promise<any> | any>();

function fetchUser(userId: string): Promise<User> {
  return fetch(`/api/users/${userId}`).then((response) => {
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  });
}

function useUser(userId: string): User {
  const cacheKey = `user-${userId}`;

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);

    // If it's a promise, the request is in flight - throw it for Suspense
    if (cached instanceof Promise) {
      throw cached;
    }

    // If it's data, return it
    return cached;
  }

  // No cache entry - start the request
  const promise = fetchUser(userId).then((user) => {
    // Replace promise with actual data in cache
    cache.set(cacheKey, user);
    return user;
  });

  // Cache the promise and throw it
  cache.set(cacheKey, promise);
  throw promise;
}
```

This pattern ensures that:

1. First render throws a promise → Suspense shows fallback
2. When promise resolves → Component re-renders with data
3. Subsequent renders use cached data immediately

> [!TIP]
> In production, use libraries like [SWR](https://swr.vercel.app/), [TanStack Query](https://tanstack.com/query), or [Relay](https://relay.dev/) that have built-in Suspense support instead of rolling your own cache.

## Error Boundaries with `Suspense`

Refer to [The use Hook](./the-use-hook.md) for foundational error boundary patterns with Suspense and `use()`. This page focuses on caching, streaming, and pitfalls rather than general error handling.

## Real World Pattern: Streaming Data

See progressive composition examples in [The use Hook](./the-use-hook.md). Below we focus on initiating requests early to avoid waterfalls.

### Starting Requests Early

The key to good Suspense UX is starting data requests before you render the components that need them:

```tsx
// ❌ Don't start fetch inside component render
function UserProfile({ userId }: { userId: string }) {
  const user = useUser(userId); // Starts fetch on first render
  return <div>{user.name}</div>;
}

// ✅ Start fetch before rendering
function App() {
  const [userId, setUserId] = useState('123');

  // Warm the cache before rendering UserProfile
  useEffect(() => {
    warmCache(userId);
  }, [userId]);

  return (
    <Suspense fallback={<Skeleton />}>
      <UserProfile userId={userId} />
    </Suspense>
  );
}

function warmCache(userId: string) {
  // This puts the promise in cache before component renders
  if (!cache.has(`user-${userId}`)) {
    cache.set(`user-${userId}`, fetchUser(userId));
  }
}
```

## Advanced: Concurrent Features

React 18's concurrent features work especially well with Suspense. `startTransition` lets you mark updates as non-urgent, preventing them from blocking the UI:

```tsx
import { startTransition } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [deferredQuery, setDeferredQuery] = useState('');

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery); // Update immediately for input responsiveness

    startTransition(() => {
      setDeferredQuery(newQuery); // This won't block the UI
    });
  };

  return (
    <div>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search..." />

      <Suspense fallback={<SearchSkeleton />}>
        <SearchResultsList query={deferredQuery} />
      </Suspense>
    </div>
  );
}
```

The input stays responsive while search results load in the background.

## Common Pitfalls and Solutions

### Problem: Cache Invalidation

Without proper cache management, you might show stale data:

```tsx
// ✅ Add cache invalidation
function invalidateUser(userId: string) {
  cache.delete(`user-${userId}`);
}

function updateUserMutation(userId: string, updates: Partial<User>) {
  return fetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }).then(() => {
    invalidateUser(userId); // Clear cache to force refetch
  });
}
```

### Problem: Loading States Flash

If data loads very quickly, loading spinners can flash annoyingly:

```tsx
import { useDeferredValue } from 'react';

function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);

  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '200px' }}>
          {/* Use a delayed skeleton to avoid flashing */}
          <DelayedSkeleton delay={100} />
        </div>
      }
    >
      <ResultsList query={deferredQuery} />
    </Suspense>
  );
}
```

### Problem: Suspending on Navigation

Be careful about wrapping your entire app in Suspense—it can suspend the whole UI during navigation:

```tsx
// ❌ This suspends everything during route changes
function App() {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Router>
    </Suspense>
  );
}

// ✅ Keep navigation responsive with page-level boundaries
function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<HomeSkeleton />}>
              <HomePage />
            </Suspense>
          }
        />
        <Route
          path="/profile"
          element={
            <Suspense fallback={<ProfileSkeleton />}>
              <ProfilePage />
            </Suspense>
          }
        />
      </Routes>
    </Router>
  );
}
```

## When to Use `Suspense`

Suspense shines in these scenarios:

- **Dashboard-style UIs** with multiple independent data sources
- **Content-heavy pages** where you want to stream in sections progressively
- **Search interfaces** where you want to keep inputs responsive during searches
- **Social feeds** where new content can appear without blocking existing content

It's less useful for:

- Simple forms with minimal async operations
- Apps with mostly static content
- Cases where you need fine-grained loading control for individual fields
