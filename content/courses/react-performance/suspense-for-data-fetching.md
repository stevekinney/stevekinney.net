---
title: Suspense for Data Fetching
description: >-
  Stream UI progressively instead of blocking on everything—compose boundaries
  that keep pages interactive and informative.
date: 2025-09-06T22:01:30.022Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - suspense
  - data-fetching
---

React Suspense fundamentally changes how we think about loading states and data fetching. Instead of manually wiring up loading spinners and error boundaries throughout your component tree, Suspense lets you declaratively define loading boundaries that handle async operations gracefully. You compose these boundaries strategically to keep parts of your UI interactive while other parts are still loading—turning the traditional "everything waits for everything" pattern into something that feels more like progressive enhancement.

The real power comes from how Suspense boundaries work together with modern data fetching patterns to create streaming UIs that reveal content as soon as it's ready, rather than blocking the entire page on the slowest data dependency.

## What Makes `Suspense` Different

Before Suspense, data fetching in React typically followed a "fetch-on-render" pattern where each component handled its own loading states:

```tsx
// ❌ Traditional approach: each component manages loading
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>Hello, {user?.name}</div>;
}
```

This approach creates a few problems:

- **Loading states cascade**: Every component waits for its own data, creating waterfalls
- **Repetitive boilerplate**: Each component reimplements the same loading/error logic
- **Poor user experience**: Users see multiple loading spinners appearing sequentially
- **Difficult coordination**: Hard to show unified loading states across related data

Suspense flips this model. Instead of components managing their own loading states, they throw promises when data isn't ready, and Suspense boundaries catch those promises to show fallback UI:

```tsx
// ✅ Suspense approach: boundaries handle loading declaratively
function UserProfile({ userId }: { userId: string }) {
  const user = useUser(userId); // This hook throws a promise if data isn't ready
  return <div>Hello, {user.name}</div>;
}

function App() {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfile userId="123" />
    </Suspense>
  );
}
```

The component becomes simpler—it just declares what it needs and assumes the data will be there. The Suspense boundary handles the loading state.

## Setting Up `Suspense` Boundaries

Suspense boundaries are like try-catch blocks for async operations. You place them strategically around components that might suspend:

```tsx
import { Suspense } from 'react';

function App() {
  return (
    <div>
      <h1>My Dashboard</h1>

      {/* This boundary catches any suspending components inside */}
      <Suspense fallback={<UserProfileSkeleton />}>
        <UserProfile userId="123" />
      </Suspense>

      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsList />
      </Suspense>

      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectsList />
      </Suspense>
    </div>
  );
}
```

This creates three independent loading zones. If `UserProfile` is still loading, users can still interact with notifications and projects once their data arrives.

### Nested Boundaries for Progressive Loading

You can nest Suspense boundaries to create more granular loading experiences:

```tsx
function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {/* Outer boundary: shows skeleton for entire dashboard */}
      <div className="dashboard">
        <UserHeader />

        <div className="dashboard-content">
          <Suspense fallback={<StatsSkeleton />}>
            {/* Inner boundary: shows skeleton just for stats */}
            <StatsPanel />
          </Suspense>

          <Suspense fallback={<ActivitySkeleton />}>
            <ActivityFeed />
          </Suspense>
        </div>
      </div>
    </Suspense>
  );
}
```

If `UserHeader` loads quickly but `StatsPanel` is slow, users see the header immediately with just the stats section showing a skeleton.

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

Suspense handles loading states, but you need Error Boundaries for error states. They work together beautifully:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Clear any cached data to force refetch
        cache.clear();
      }}
    >
      <Suspense fallback={<UserProfileSkeleton />}>
        <UserProfile userId="123" />
      </Suspense>
    </ErrorBoundary>
  );
}
```

Now if the data fetch fails, users see a proper error message with a retry option.

## Real World Pattern: Streaming Data

One of Suspense's most powerful features is how it enables streaming experiences. Instead of waiting for all data before showing anything, you can reveal content progressively:

```tsx
function BlogPost({ postId }: { postId: string }) {
  return (
    <article>
      <Suspense fallback={<PostHeaderSkeleton />}>
        <PostHeader postId={postId} />
      </Suspense>

      <Suspense fallback={<PostContentSkeleton />}>
        <PostContent postId={postId} />
      </Suspense>

      <Suspense fallback={<CommentsSkeleton />}>
        <Comments postId={postId} />
      </Suspense>
    </article>
  );
}
```

If the post header loads in 100ms, content in 300ms, and comments in 800ms, users see each section appear as soon as it's ready rather than waiting 800ms to see anything.

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

## Related Topics

- **[React Server Components (RSC)](./react-server-components-rsc.md)** - Combine Suspense with Server Components for optimal data fetching patterns
- **[Skeleton Screens & Perceived Performance](./skeleton-screens-perceived-performance.md)** - Create sophisticated loading states within Suspense boundaries
- **[useDeferredValue Patterns](./usedeferredvalue-patterns.md)** - Handle non-urgent updates while Suspense manages critical data loading
- **[Streaming SSR Optimization](./streaming-ssr-optimization.md)** - Implement server-side streaming with Suspense for faster perceived performance
- **[The use Hook](./the-use-hook.md)** - Master React 19's use() hook for data fetching within Suspense boundaries

## Next Steps

Once you're comfortable with basic Suspense patterns, explore:

- **Server-side Suspense** with frameworks like Next.js for streaming HTML
- **Advanced caching strategies** with libraries like TanStack Query
- **Concurrent features** like `useTransition` and `useDeferredValue`
- **Testing patterns** for components that use Suspense

Suspense represents a fundamental shift toward declarative loading states and streaming user experiences. When used thoughtfully, it creates interfaces that feel faster and more responsive—even when the underlying data fetching hasn't actually gotten faster.
