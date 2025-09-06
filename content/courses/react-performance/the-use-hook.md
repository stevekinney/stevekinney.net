---
title: The use() Hook
description: Simplify async and context consumption by letting components 'use' resources directly, with Suspense driving the UI flow.
date: 2025-09-06T22:15:46.931Z
modified: 2025-09-06T22:15:46.931Z
published: true
tags: ['react', 'performance', 'hooks', 'react-19']
---

React 19's `use()` hook fundamentally changes how you handle asynchronous data and context in your components. Instead of managing loading states, error boundaries, and promise resolution yourself, `use()` lets you "unwrap" promises and context values directly in your component body—while Suspense handles the coordination. It's like having `await` for React components, but with better composition and cleaner error handling.

The `use()` hook works with two types of resources: **promises** (for async data) and **context** (for shared state). When you pass a promise to `use()`, React will suspend the component until the promise resolves, then render with the resolved value. When you pass context, it's effectively a more flexible version of `useContext` that can be called conditionally.

Let's explore how `use()` simplifies data fetching, improves performance, and creates more maintainable component architectures.

## Why use() Matters

Before `use()`, handling async data meant juggling loading states, error boundaries, and promise resolution across multiple hooks. You'd typically see something like this:

```tsx
// ❌ The old way: lots of ceremony
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) throw error;
  if (!user) return null;

  return <div>{user.name}</div>;
}
```

With `use()` and Suspense, this becomes dramatically simpler:

```tsx
// ✅ The new way: direct resource consumption
function UserProfile({ userId }: { userId: string }) {
  const user = use(fetchUser(userId));
  return <div>{user.name}</div>;
}
```

The loading states and error handling are now handled by Suspense boundaries higher up in your component tree, leading to better separation of concerns and more declarative code.

## Basic Promise Usage

The most common use case for `use()` is consuming promises. Here's how it works in practice:

```tsx
import { use, Suspense } from 'react';

// Your existing async functions work as-is
async function fetchUserData(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

function UserCard({ userId }: { userId: string }) {
  // use() unwraps the promise and gives you the resolved value
  const user = use(fetchUserData(userId));

  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// Wrap with Suspense to handle the loading state
function App() {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserCard userId="123" />
    </Suspense>
  );
}
```

When `UserCard` renders, `use(fetchUserData(userId))` will:

1. Suspend the component on the first render while the promise is pending
2. Show the Suspense fallback until the promise resolves
3. Re-render with the resolved data once available
4. Throw to the nearest error boundary if the promise rejects

> [!NOTE]
> `use()` can only be called during render—not in event handlers, effects, or other non-render contexts. This is because it needs to integrate with React's rendering cycle to coordinate suspension.

## Working with Context

The `use()` hook also works with React context, providing a more flexible alternative to `useContext`:

```tsx
import { use, createContext } from 'react';

const ThemeContext = createContext<'light' | 'dark'>('light');

function ThemedButton() {
  // This is equivalent to useContext(ThemeContext)
  const theme = use(ThemeContext);

  return <button className={`btn-${theme}`}>Themed Button</button>;
}
```

The key difference is that `use()` can be called conditionally, whereas `useContext` must always be called at the top level:

```tsx
function ConditionalTheme({ showThemed }: { showThemed: boolean }) {
  // ✅ This works with use()
  const theme = showThemed ? use(ThemeContext) : 'default';

  // ❌ This wouldn't work with useContext
  // const theme = showThemed ? useContext(ThemeContext) : 'default';

  return <div className={`theme-${theme}`}>Content</div>;
}
```

This flexibility is particularly useful for components that might not always need context values, or when building reusable components that work with optional context providers.

## Caching and Performance

One crucial aspect of `use()` is understanding how React handles promise caching. React doesn't automatically cache promises—if you pass a new promise instance on each render, you'll get into an infinite suspend/re-render loop:

```tsx
// ❌ Creates a new promise on every render - infinite loop!
function BadExample({ userId }: { userId: string }) {
  const user = use(fetch(`/api/users/${userId}`).then((r) => r.json()));
  return <div>{user.name}</div>;
}
```

Instead, you need to ensure promise stability. Here are several approaches:

### Promise Memoization

```tsx
import { use, useMemo, Suspense } from 'react';

function UserProfile({ userId }: { userId: string }) {
  // Memoize the promise to prevent recreation on every render
  const userPromise = useMemo(() => fetchUser(userId), [userId]);

  const user = use(userPromise);
  return <div>{user.name}</div>;
}
```

### External Promise Management

```tsx
// Create promises outside of components or in a cache
const userPromiseCache = new Map<string, Promise<User>>();

function getCachedUserPromise(userId: string) {
  if (!userPromiseCache.has(userId)) {
    userPromiseCache.set(userId, fetchUser(userId));
  }
  return userPromiseCache.get(userId)!;
}

function UserProfile({ userId }: { userId: string }) {
  const user = use(getCachedUserPromise(userId));
  return <div>{user.name}</div>;
}
```

### Using with Data Fetching Libraries

Libraries like SWR, React Query, or Relay already handle promise caching for you:

```tsx
import { use } from 'react';
import useSWR from 'swr';

function UserProfile({ userId }: { userId: string }) {
  const { data } = useSWR(`/api/users/${userId}`, fetcher, {
    suspense: true, // Enable Suspense mode
  });

  // No need for use() here - SWR handles it
  return <div>{data.name}</div>;
}

// Or if you want to use use() directly with a cached promise:
function UserProfileWithUse({ userId }: { userId: string }) {
  const userPromise = useMemo(
    () => mutate(`/api/users/${userId}`), // Returns the cached promise
    [userId],
  );

  const user = use(userPromise);
  return <div>{user.name}</div>;
}
```

## Error Handling

Error handling with `use()` follows React's standard error boundary pattern. When a promise rejects, the error is thrown during render and caught by the nearest error boundary:

```tsx
import { use, Suspense, ErrorBoundary } from 'react';

function UserProfile({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // Throws if promise rejects
  return <div>{user.name}</div>;
}

function App() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong!</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <UserProfile userId="123" />
      </Suspense>
    </ErrorBoundary>
  );
}
```

For more granular error handling, you can catch errors in your data fetching functions:

```tsx
async function fetchUserSafely(userId: string): Promise<User | null> {
  try {
    return await fetchUser(userId);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null; // Return fallback instead of throwing
  }
}

function UserProfile({ userId }: { userId: string }) {
  const user = use(fetchUserSafely(userId));

  if (!user) {
    return <div>User not found</div>;
  }

  return <div>{user.name}</div>;
}
```

## Real-World Patterns

### Composing Multiple Async Resources

One of `use()`'s strengths is composing multiple async resources cleanly:

```tsx
function UserDashboard({ userId }: { userId: string }) {
  // These can resolve in parallel or in sequence
  const user = use(fetchUser(userId));
  const posts = use(fetchUserPosts(userId));
  const stats = use(fetchUserStats(userId));

  return (
    <div>
      <UserHeader user={user} />
      <UserStats stats={stats} />
      <PostsList posts={posts} />
    </div>
  );
}

// Wrap in Suspense to handle loading states collectively
function App() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <UserDashboard userId="123" />
    </Suspense>
  );
}
```

### Waterfall vs Parallel Loading

Be mindful of how you structure your async calls. Sequential `use()` calls create waterfalls:

```tsx
// ❌ Waterfall: second request waits for first
function UserWithPosts({ userId }: { userId: string }) {
  const user = use(fetchUser(userId));
  const posts = use(fetchUserPosts(user.id)); // Waits for user to resolve

  return <UserPostsList user={user} posts={posts} />;
}

// ✅ Parallel: both requests start immediately
function UserWithPosts({ userId }: { userId: string }) {
  const userPromise = useMemo(() => fetchUser(userId), [userId]);
  const postsPromise = useMemo(() => fetchUserPosts(userId), [userId]);

  const user = use(userPromise);
  const posts = use(postsPromise);

  return <UserPostsList user={user} posts={posts} />;
}
```

### Progressive Enhancement

`use()` works great for progressive enhancement where you want to show partial data immediately:

```tsx
function ArticlePage({ articleId }: { articleId: string }) {
  return (
    <div>
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleContent articleId={articleId} />
      </Suspense>

      <Suspense fallback={<CommentsSkeleton />}>
        <ArticleComments articleId={articleId} />
      </Suspense>

      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedArticles articleId={articleId} />
      </Suspense>
    </div>
  );
}
```

Each section can load independently, providing a better user experience than waiting for everything to load at once.

## Migration Strategies

### From useEffect + useState

If you're migrating from traditional `useEffect` + `useState` patterns:

```tsx
// Before: manual state management
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then((user) => {
      setUser(user);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{user?.name}</div>;
}

// After: use() + Suspense
function UserProfile({ userId }: { userId: string }) {
  const userPromise = useMemo(() => fetchUser(userId), [userId]);
  const user = use(userPromise);
  return <div>{user.name}</div>;
}
```

### From Data Fetching Libraries

Many data fetching libraries already support Suspense mode, making migration straightforward:

```tsx
// With React Query
function UserProfile({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    suspense: true, // Enable Suspense integration
  });

  return <div>{user.name}</div>;
}

// Or using use() directly with React Query's promise
function UserProfile({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const userPromise = useMemo(
    () => queryClient.fetchQuery(['user', userId], () => fetchUser(userId)),
    [userId, queryClient],
  );

  const user = use(userPromise);
  return <div>{user.name}</div>;
}
```

## Performance Considerations

### When to Use use() vs Traditional Hooks

`use()` shines when you want:

- **Declarative async code**: No manual loading states
- **Better composition**: Multiple async resources in one component
- **Simplified error handling**: Let error boundaries handle failures
- **Server-side rendering**: Works better with RSC and SSR

Stick with traditional hooks when you need:

- **Imperative control**: Manual loading states or conditional fetching
- **Legacy compatibility**: Working with older React versions
- **Fine-grained loading UX**: Different loading states for different parts of your UI

### Bundle Size and Tree Shaking

`use()` is part of React's core bundle, so there's no additional weight. However, be mindful of how you structure your data fetching to avoid including unnecessary code:

```tsx
// ✅ Good: conditional imports
function UserProfile({ userId, includeAnalytics }: Props) {
  const user = use(fetchUser(userId));

  const analytics = includeAnalytics
    ? use(import('./analytics').then((m) => m.fetchAnalytics(userId)))
    : null;

  return (
    <div>
      <UserCard user={user} />
      {analytics && <AnalyticsPanel data={analytics} />}
    </div>
  );
}
```

## Looking Forward

The `use()` hook represents React's vision for simpler, more declarative async programming. Combined with React Server Components and the upcoming cache APIs, it enables patterns like:

- **Automatic deduplication**: The same promise used across components resolves once
- **Streaming SSR**: Server-rendered content can stream in progressively
- **Better DevX**: Less boilerplate, clearer intent, easier debugging

As the ecosystem evolves, expect to see more libraries and frameworks embrace `use()` for cleaner async patterns. The key is understanding when and how to apply it effectively—which often means rethinking your data flow from imperative state management to declarative resource consumption.

Start small by migrating a few simple async components to `use()`, get comfortable with the Suspense boundary patterns, and gradually apply it to more complex data fetching scenarios. Your future self (and your teammates) will thank you for the cleaner, more maintainable code.
