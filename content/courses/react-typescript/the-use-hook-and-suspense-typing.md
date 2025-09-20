---
title: Typing the use() Hook and Suspense Data
description: >-
  Consume promises and resources directly—type use() calls, Suspense fallbacks,
  and async component returns.
date: 2025-09-06T22:04:44.914Z
modified: '2025-09-06T17:49:18-06:00'
published: true
tags:
  - react
  - typescript
  - use-hook
  - suspense
  - react-19
  - async
---

React's `use()` hook is a game-changer for handling async data—it lets you consume promises and resources directly without the usual `useEffect` ceremony. Combined with Suspense boundaries, you can build components that handle loading and error states elegantly. The tricky part? Making sure TypeScript understands what's happening when your components start throwing promises around (literally).

We're going to explore how to type the `use()` hook properly, handle Suspense boundaries with confidence, and avoid the footguns that come with mixing async data and TypeScript. By the end, you'll be writing components that feel magical to use but remain completely type-safe under the hood.

## The Fundamentals of use()

The `use()` hook is React's newest way to unwrap promises and context values. Unlike traditional hooks, it can be called conditionally and even inside loops—which makes it incredibly flexible for dynamic data fetching scenarios.

```tsx
import { use } from 'react';

// ✅ Basic promise consumption
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);
  return <h1>Hello, {user.name}!</h1>;
}
```

The magic happens when your component encounters an unresolved promise. React will suspend the component (throwing the promise), and the nearest Suspense boundary catches it, showing a fallback until the promise resolves. Once resolved, React re-renders the component with the actual data.

Here's where TypeScript gets interesting. The `use()` hook needs to understand what type your promise resolves to, and your component needs proper typing for both the suspended and resolved states.

## Typing Promise-Based Data

Let's start with the most common scenario—fetching data from an API and consuming it with `use()`.

```tsx
interface User {
  id: number;
  name: string;
  email: string;
}

interface UserProfileProps {
  userPromise: Promise<User>;
}

function UserProfile({ userPromise }: UserProfileProps) {
  // TypeScript infers that `user` is of type `User`
  const user = use(userPromise);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

The `use()` hook is smart enough to infer the resolved type from your promise. If you pass a `Promise<User>`, you get back a `User`. If you pass a `Promise<string[]>`, you get back a `string[]`. No additional type annotations needed.

But what happens when your promise might reject? That's where error boundaries come into play.

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  const userPromise = fetchUser(123);

  return (
    <ErrorBoundary fallback={<div>Something went wrong!</div>}>
      <Suspense fallback={<div>Loading user...</div>}>
        <UserProfile userPromise={userPromise} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

> [!NOTE]
> Error boundaries catch promise rejections from `use()`, while Suspense boundaries catch the promises themselves during the pending state.

## Creating Typed Resource Factories

For more complex scenarios, you'll often want to create resource factories that return well-typed promises. Here's a pattern that works well with TypeScript:

```tsx
interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

// Generic resource factory with proper typing
function createResource<T>(fetcher: () => Promise<T>): Promise<T> {
  return fetcher();
}

// Usage with automatic type inference
const userResource = createResource(() =>
  fetch('/api/users/123').then((res) => res.json() as Promise<User>),
);

function UserProfile() {
  // TypeScript knows this is User
  const user = use(userResource);
  return <h1>{user.name}</h1>;
}
```

For even more sophisticated resource management, you might want to create a resource that handles caching and deduplication:

```tsx
interface ResourceState<T> {
  promise: Promise<T>;
  status: 'pending' | 'resolved' | 'rejected';
  data?: T;
  error?: Error;
}

function createCachedResource<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Implementation would include caching logic
  // For now, simplified version:
  return fetcher();
}

// Type-safe resource creation
const postsResource = createCachedResource(
  'posts',
  (): Promise<Post[]> => fetch('/api/posts').then((res) => res.json()),
);

function PostsList() {
  const posts = use(postsResource); // TypeScript knows this is Post[]

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

## Conditional use() Calls and Type Safety

One of the unique features of `use()` is that it can be called conditionally. This creates interesting typing scenarios:

```tsx
interface ConditionalDataProps {
  shouldLoad: boolean;
  dataPromise?: Promise<User>;
}

function ConditionalData({ shouldLoad, dataPromise }: ConditionalDataProps) {
  // TypeScript needs to understand this conditional usage
  const user = shouldLoad && dataPromise ? use(dataPromise) : null;

  if (!user) {
    return <div>No data to display</div>;
  }

  // TypeScript knows `user` is definitely of type `User` here
  return <h1>{user.name}</h1>;
}
```

For more complex conditional logic, you might need to help TypeScript understand the flow:

```tsx
interface MultiResourceProps {
  userPromise?: Promise<User>;
  profilePromise?: Promise<UserProfile>;
  mode: 'user' | 'profile' | 'none';
}

function MultiResource({ userPromise, profilePromise, mode }: MultiResourceProps) {
  if (mode === 'user' && userPromise) {
    const user = use(userPromise);
    return <UserCard user={user} />;
  }

  if (mode === 'profile' && profilePromise) {
    const profile = use(profilePromise);
    return <ProfileCard profile={profile} />;
  }

  return <div>Nothing to show</div>;
}
```

## Typing `Suspense` Boundaries

Suspense boundaries themselves don't need special typing, but the components you wrap in them do. Here's how to create a well-typed async component structure:

```tsx
interface AsyncPageProps {
  userId: string;
}

// The async component that uses `use()`
function AsyncUserPage({ userId }: AsyncPageProps) {
  const userPromise = useMemo(() => fetchUser(userId), [userId]);

  const user = use(userPromise);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>User ID: {user.id}</p>
    </div>
  );
}

// The wrapper that handles Suspense
function UserPage(props: AsyncPageProps) {
  return (
    <Suspense fallback={<UserPageSkeleton />}>
      <AsyncUserPage {...props} />
    </Suspense>
  );
}
```

For components that need to handle multiple async resources, you can compose them nicely:

```tsx
function ComplexAsyncPage({ userId }: { userId: string }) {
  const userPromise = useMemo(() => fetchUser(userId), [userId]);
  const postsPromise = useMemo(() => fetchUserPosts(userId), [userId]);

  // Both promises are consumed independently
  const user = use(userPromise);
  const posts = use(postsPromise);

  return (
    <div>
      <UserHeader user={user} />
      <PostsList posts={posts} />
    </div>
  );
}
```

## Error Handling with Type Safety

When promises reject, you need proper error boundaries. Here's how to create type-safe error handling:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

interface ApiError {
  message: string;
  status: number;
  code: string;
}

function ErrorFallback({ error }: { error: ApiError }) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <p>Status: {error.status}</p>
    </div>
  );
}

function TypedErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>;
}

// Usage
function App() {
  return (
    <TypedErrorBoundary>
      <Suspense fallback={<Loading />}>
        <AsyncUserProfile userId="123" />
      </Suspense>
    </TypedErrorBoundary>
  );
}
```

## Real World Use Cases™

Here are some patterns you'll likely encounter in production applications:

### Typed Search Results

```tsx
interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

function SearchResults<T>({ searchPromise }: { searchPromise: Promise<SearchResult<T>> }) {
  const results = use(searchPromise);

  return (
    <div>
      <p>{results.total} results found</p>
      {results.items.map((item, index) => (
        <SearchResultItem key={index} item={item} />
      ))}
      {results.hasMore && <LoadMoreButton />}
    </div>
  );
}

// Usage with type inference
const userSearchPromise = searchUsers('john'); // Returns Promise<SearchResult<User>>
<SearchResults searchPromise={userSearchPromise} />;
```

### Parallel Data Loading

```tsx
interface DashboardData {
  user: User;
  notifications: Notification[];
  stats: UserStats;
}

function Dashboard({ userId }: { userId: string }) {
  // Create all promises upfront for parallel loading
  const [userPromise, notificationsPromise, statsPromise] = useMemo(
    () => [fetchUser(userId), fetchNotifications(userId), fetchUserStats(userId)],
    [userId],
  );

  // Consume them all with proper typing
  const user = use(userPromise);
  const notifications = use(notificationsPromise);
  const stats = use(statsPromise);

  return (
    <div>
      <UserHeader user={user} />
      <StatsWidget stats={stats} />
      <NotificationList notifications={notifications} />
    </div>
  );
}
```

## Common Pitfalls and How to Avoid Them

### Don't Create Promises in Render

```tsx
// ❌ Bad: Creates new promise on every render
function BadExample({ userId }: { userId: string }) {
  const user = use(fetchUser(userId)); // New promise every time!
  return <h1>{user.name}</h1>;
}

// ✅ Good: Memoize the promise
function GoodExample({ userId }: { userId: string }) {
  const userPromise = useMemo(() => fetchUser(userId), [userId]);
  const user = use(userPromise);
  return <h1>{user.name}</h1>;
}
```

### Handle Promise Resolution Timing

```tsx
// ✅ Good: Handle the case where data might not be available
function SafeComponent({ dataPromise }: { dataPromise: Promise<Data> | null }) {
  if (!dataPromise) {
    return <div>No data requested</div>;
  }

  const data = use(dataPromise);
  return <DataDisplay data={data} />;
}
```

### Type Your Promise Factories Properly

```tsx
// ❌ Bad: Loses type information
const createUserFetcher = (id: string) => fetch(`/api/users/${id}`).then((res) => res.json());

// ✅ Good: Explicit return type
const createUserFetcher = (id: string): Promise<User> =>
  fetch(`/api/users/${id}`).then((res) => res.json() as User);

// ✅ Even better: Runtime validation
const createUserFetcher = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();
  return UserSchema.parse(data); // Assuming you're using Zod
};
```

> [!WARNING]
> Always validate API responses at runtime. TypeScript types don't exist at runtime, so external data needs validation.

## Advanced Patterns

### Typed Resource Composition

```tsx
interface CompositeResource<T, U> {
  primary: T;
  secondary: U;
}

function createCompositeResource<T, U>(
  primaryPromise: Promise<T>,
  secondaryPromise: Promise<U>,
): Promise<CompositeResource<T, U>> {
  return Promise.all([primaryPromise, secondaryPromise]).then(([primary, secondary]) => ({
    primary,
    secondary,
  }));
}

// Usage
function CompositeView({ userId }: { userId: string }) {
  const compositePromise = useMemo(
    () => createCompositeResource(fetchUser(userId), fetchUserPreferences(userId)),
    [userId],
  );

  const { primary: user, secondary: preferences } = use(compositePromise);

  return (
    <div>
      <UserProfile user={user} />
      <PreferencesPanel preferences={preferences} />
    </div>
  );
}
```

### Resource with Loading States

```tsx
interface ResourceWithMeta<T> {
  data: T;
  loading: boolean;
  error?: Error;
}

// This is more of a conceptual pattern since use() handles this automatically
function createResourceWithMeta<T>(promise: Promise<T>): Promise<ResourceWithMeta<T>> {
  return promise.then(
    (data) => ({ data, loading: false }),
    (error) => ({ data: null as any, loading: false, error }),
  );
}
```

## Next Steps

The `use()` hook and Suspense create a powerful foundation for handling async data in React applications. With proper TypeScript integration, you can build components that are both performant and type-safe.

Key takeaways:

- Always memoize promises to avoid unnecessary re-fetches
- Use proper error boundaries alongside Suspense boundaries
- Validate external data at runtime, not just at compile time
- Create typed resource factories for reusable async patterns
- Remember that `use()` can be called conditionally—embrace this flexibility

As you build more complex applications, consider exploring libraries like [TanStack Query](https://tanstack.com/query/latest) or [SWR](https://swr.vercel.app/) that provide additional features like caching, background updates, and more sophisticated error handling—all with excellent TypeScript support.
