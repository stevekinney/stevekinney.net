---
title: The cache() API
description: >-
  Stabilize and dedupe expensive work across requests and renders—use cache() to
  turn pure functions into shared resources.
date: 2025-09-06T22:22:56.456Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - caching
  - react-19
---

React's `cache()` function takes pure functions and makes them memoized, deduplicated, and stable across your entire React tree. Think of it as a supercharged version of `useMemo()` that works at the function level instead of the component level—and crucially, shares results between components when they call the same function with the same arguments.

While `cache()` is primarily designed for React Server Components and server-side rendering, understanding how it works gives you powerful tools for optimizing expensive operations across your entire application. You can eliminate redundant API calls, database queries, and heavy computations that would otherwise run multiple times for the same data.

## What Problems Does cache() Solve?

Before diving into how `cache()` works, let's understand the problems it addresses. Consider this scenario: you have a blog post component that needs user information, and several child components that also need that same user data.

```ts
// ❌ Without cache() - multiple redundant calls
async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId); // First API call

  return (
    <div>
      <UserAvatar userId={userId} /> {/* Second API call inside */}
      <UserPosts userId={userId} />  {/* Third API call inside */}
      <h1>{user.name}</h1>
    </div>
  );
}

async function UserAvatar({ userId }: { userId: string }) {
  const user = await fetchUser(userId); // Duplicate call!
  return <img src={user.avatar} alt={user.name} />;
}
```

Without `cache()`, each component makes its own call to `fetchUser()`, even when they're asking for the same user. This creates unnecessary network requests, database hits, and performance bottlenecks.

## Basic Usage

The `cache()` function is simple to use—you wrap any pure function, and React handles deduplication automatically:

```ts
import { cache } from 'react';

// ✅ Cached version - only one call per unique userId per request
const fetchUser = cache(async (userId: string) => {
  console.log(`Fetching user ${userId}`); // This logs only once per userId
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
});

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId); // First call

  return (
    <div>
      <UserAvatar userId={userId} /> {/* Uses cached result */}
      <UserPosts userId={userId} />  {/* Uses cached result */}
      <h1>{user.name}</h1>
    </div>
  );
}

async function UserAvatar({ userId }: { userId: string }) {
  const user = await fetchUser(userId); // Returns cached result instantly
  return <img src={user.avatar} alt={user.name} />;
}
```

With `cache()`, React tracks function calls by their arguments and returns the same result for identical inputs. The "Fetching user" log appears only once per unique `userId`, regardless of how many components call the function.

## Cache Scope and Lifecycle

Understanding when and where `cache()` works is crucial for using it effectively. The cache has specific boundaries:

### Server-Side Scope

In React Server Components and SSR, the cache lasts for the duration of a single request:

```ts
const getPostWithComments = cache(async (postId: string) => {
  // This expensive join query runs only once per postId per request
  return db.query(`
    SELECT posts.*, comments.*
    FROM posts
    LEFT JOIN comments ON posts.id = comments.post_id
    WHERE posts.id = ?
  `, [postId]);
});

// Multiple components can use this without duplicate database hits
async function BlogPost({ postId }: { postId: string }) {
  const data = await getPostWithComments(postId);

  return (
    <article>
      <PostContent postId={postId} /> {/* Uses cache */}
      <CommentSection postId={postId} /> {/* Uses cache */}
    </article>
  );
}
```

### Client-Side Behavior

On the client side, `cache()` behavior depends on your React version and setup. In React 19+, cached functions maintain their cache as long as the function reference stays stable:

```ts
const expensiveCalculation = cache((data: number[]) => {
  console.log('Computing expensive result');
  return data.reduce((acc, val) => acc + Math.sqrt(val), 0);
});

function DataVisualization({ dataset }: { dataset: number[] }) {
  // This computation runs only once until dataset changes
  const result = expensiveCalculation(dataset);

  return (
    <div>
      <Chart data={result} />
      <Summary data={result} /> {/* Uses cached result */}
    </div>
  );
}
```

> [!NOTE]
> Client-side caching with `cache()` is still evolving. For production applications, consider it primarily a server-side optimization tool.

## Advanced Patterns

### Caching with Complex Arguments

The `cache()` function uses shallow comparison for arguments, so object references matter:

```ts
const queryProducts = cache(async (filters: ProductFilters) => {
  return db.products.findMany({
    where: filters,
    include: { category: true, reviews: true },
  });
});

// ❌ Creates new object each render - cache miss
function ProductList() {
  const products = queryProducts({ category: 'electronics', inStock: true });
  // ...
}

// ✅ Stable object reference - cache hit
const ELECTRONICS_FILTER = { category: 'electronics', inStock: true };

function ProductList() {
  const products = queryProducts(ELECTRONICS_FILTER);
  // ...
}
```

For dynamic filters, consider using a separate caching strategy or normalizing the filter object:

```ts
const normalizeFilters = (filters: ProductFilters) => {
  // Sort keys to ensure consistent object structure
  const sortedEntries = Object.entries(filters).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(sortedEntries);
};

const queryProducts = cache(async (filters: ProductFilters) => {
  const normalizedFilters = normalizeFilters(filters);
  return db.products.findMany({ where: normalizedFilters });
});
```

### Combining with Other React Features

Cache works beautifully with Suspense and error boundaries:

```ts
const fetchUserProfile = cache(async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch user ${userId}`);
  }
  return response.json();
});

function UserDashboard({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<div>Failed to load user</div>}>
      <Suspense fallback={<div>Loading user...</div>}>
        <UserProfile userId={userId} />
        <UserSettings userId={userId} /> {/* Shares cached data */}
      </Suspense>
    </ErrorBoundary>
  );
}

async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUserProfile(userId);
  return <div>{user.name}</div>;
}

async function UserSettings({ userId }: { userId: string }) {
  const user = await fetchUserProfile(userId); // Same cache entry
  return <div>{user.email}</div>;
}
```

### Cache Invalidation Patterns

Since `cache()` doesn't provide built-in invalidation, you'll need strategies for handling stale data:

```ts
// Strategy 1: Time-based cache busting
const fetchWithTimestamp = cache(async (key: string, timestamp: number) => {
  return fetch(`/api/data/${key}`).then((r) => r.json());
});

function DataComponent({ key }: { key: string }) {
  // Refresh every 5 minutes
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000));
  const data = fetchWithTimestamp(key, timestamp);
  // ...
}

// Strategy 2: Version-based invalidation
let cacheVersion = 0;

const invalidateCache = () => {
  cacheVersion++;
};

const fetchWithVersion = cache(async (key: string, version: number) => {
  return fetch(`/api/data/${key}`).then((r) => r.json());
});

function DataComponent({ key }: { key: string }) {
  const data = fetchWithVersion(key, cacheVersion);
  // ...
}
```

## Real-World Use Cases™

### Database Query Optimization

Perfect for eliminating N+1 query problems in server components:

```ts
const getUserById = cache(async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: { profile: true, settings: true }
  });
});

const getPostsByUserId = cache(async (userId: string) => {
  return prisma.post.findMany({
    where: { authorId: userId },
    include: { comments: true }
  });
});

// Multiple components can use these without duplicate database hits
async function UserPage({ userId }: { userId: string }) {
  const user = await getUserById(userId);
  const posts = await getPostsByUserId(userId);

  return (
    <div>
      <UserHeader user={user} />
      <UserStats userId={userId} /> {/* Reuses getUserById cache */}
      <PostList posts={posts} />
    </div>
  );
}
```

### API Response Deduplication

Eliminate redundant external API calls across your component tree:

```ts
const fetchWeatherData = cache(async (city: string) => {
  const response = await fetch(
    `https://api.weather.com/current?city=${encodeURIComponent(city)}`
  );
  return response.json();
});

function WeatherDashboard({ city }: { city: string }) {
  return (
    <div>
      <CurrentWeather city={city} />     {/* First API call */}
      <WeatherForecast city={city} />    {/* Uses cache */}
      <WeatherAlerts city={city} />      {/* Uses cache */}
    </div>
  );
}
```

### Expensive Computations

Cache heavy calculations that depend on stable inputs:

```ts
const calculateComplexMetrics = cache((rawData: DataPoint[]) => {
  console.log('Running expensive calculation...');

  return {
    mean: rawData.reduce((sum, point) => sum + point.value, 0) / rawData.length,
    standardDeviation: calculateStdDev(rawData),
    percentiles: calculatePercentiles(rawData),
    trendAnalysis: performTrendAnalysis(rawData)
  };
});

function AnalyticsDashboard({ data }: { data: DataPoint[] }) {
  const metrics = calculateComplexMetrics(data);

  return (
    <div>
      <MetricsSummary metrics={metrics} />
      <TrendChart metrics={metrics} />      {/* Reuses calculation */}
      <PercentileChart metrics={metrics} />  {/* Reuses calculation */}
    </div>
  );
}
```

## Performance Considerations

While `cache()` is powerful, use it thoughtfully:

### Memory Usage

Cached results stay in memory until the cache scope ends. For server requests, this means until the request completes. Be mindful of large data structures:

```ts
// ❌ Potentially memory-heavy
const loadEntireDataset = cache(async () => {
  return db.hugeTable.findMany(); // Could be gigabytes
});

// ✅ More targeted caching
const loadUserSubset = cache(async (userId: string) => {
  return db.users.findUnique({
    where: { id: userId },
    include: { recentActivity: { take: 10 } },
  });
});
```

### Function Purity

Only cache pure functions—functions that return the same output for the same input and have no side effects:

```ts
// ❌ Not pure - has side effects
const logAndFetch = cache(async (id: string) => {
  console.log(`Fetching user ${id}`); // Side effect
  await incrementCounter(); // Side effect
  return fetchUser(id);
});

// ✅ Pure function - perfect for caching
const fetchUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

### Argument Complexity

Simple arguments work best. Complex objects require careful consideration:

```ts
// ✅ Simple, stable arguments
const fetchUser = cache(async (id: string) => {
  /* ... */
});
const calculateSum = cache((numbers: number[]) => {
  /* ... */
});

// ⚠️ Complex arguments - ensure stability
const complexQuery = cache(async (filters: ComplexFilters) => {
  // Make sure filters object is stable across calls
});
```

## When NOT to Use cache()

Cache isn't always the right choice:

1. **Frequently changing data**: If inputs change on every call, caching provides no benefit
2. **Side-effectful functions**: Functions that modify external state shouldn't be cached
3. **Memory-constrained environments**: Large cached results can cause memory issues
4. **Client-side React 18 and below**: Limited support and unpredictable behavior

## Next Steps

Now that you understand `cache()`, you can eliminate redundant work across your React applications. Consider how this pairs with other React 19 features like Server Components and the `use()` hook for building efficient, performant applications.

## Related Topics

- **[The use() Hook](./the-use-hook.md)** - Consuming cached promises with the use() hook
- **[React Server Components (RSC)](./react-server-components-rsc.md)** - Server-side caching strategies
- **[Suspense for Data Fetching](./suspense-for-data-fetching.md)** - Integrating cache() with Suspense
- **[Memory Management Deep Dive](./memory-management-deep-dive.md)** - Understanding cache memory implications

## Prerequisites

- Understanding of React Server Components
- Knowledge of async/await patterns
- Experience with database queries and API calls
- Basic understanding of function purity

## Practical Examples

Common use cases for cache() API:

- **Blog platforms** - Caching user data across post components
- **E-commerce sites** - Product information shared between components
- **Data dashboards** - Expensive calculations used in multiple visualizations
- **Content management** - Author details displayed in various contexts

The key insight is treating expensive operations as shared resources rather than component-local concerns. With `cache()`, you can write components that naturally collaborate to minimize redundant work while maintaining clean, readable code.

> [!TIP]
> Start by identifying expensive operations that multiple components perform with the same inputs. Database queries, API calls, and heavy computations are prime candidates for `cache()` optimization.
