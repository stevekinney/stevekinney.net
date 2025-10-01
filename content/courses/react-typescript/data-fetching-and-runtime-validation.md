---
title: Data Fetching and Runtime Validation
description: >-
  Fetch safely—type APIs, validate at runtime, and keep server/client boundaries
  honest under React 19.
date: 2025-09-06T22:04:44.916Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - data-fetching
  - validation
  - zod
  - runtime-validation
---

When you're fetching data in React, TypeScript gives you excellent compile-time safety—but it can't magically guarantee that the API you're calling returns what you expect. That's where runtime validation comes in, bridging the gap between TypeScript's static analysis and the wild, unpredictable world of external data sources. React 19's improved async patterns make this even more critical (and thankfully, more elegant) to get right.

Here's the fundamental challenge: your TypeScript types are just compiler hints that disappear at runtime, but your APIs can return anything—malformed data, missing fields, or completely unexpected structures. One typo in a backend migration, and suddenly your `user.firstName` is `undefined`, breaking your entire component tree in ways TypeScript never warned you about.

## The Problem with Naive Type Assertions

Let's start with what not to do. You've probably seen (or written) code like this:

```ts
// ❌ Bad: Just assuming the API returns what you expect
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const user = (await response.json()) as User; // 🚨 Lying to TypeScript
  return user;
}
```

This approach is brittle because you're making an unsafe type assertion (`as User`) without actually validating that the data matches your expectations. When the backend inevitably changes or returns an error response, your component will explode in unpredictable ways.

## Enter Runtime Validation with Zod

[Zod](https://zod.dev) is the gold standard for TypeScript-first schema validation. It lets you define schemas that both validate at runtime _and_ infer TypeScript types—giving you a single source of truth for your data shapes.

```bash
npm install zod
```

Here's how to rewrite our user fetching with proper validation:

```ts
import { z } from 'zod';

// ✅ Good: Schema that validates and provides types
const UserSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Must be a valid email'),
});

// Automatically infer the TypeScript type
type User = z.infer<typeof UserSchema>;

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  const data = await response.json();

  // Runtime validation that throws on invalid data
  return UserSchema.parse(data);
}
```

Now you get both compile-time type safety and runtime validation. If the API returns malformed data, Zod will throw a descriptive error rather than letting invalid data silently corrupt your component state.

## Handling Validation Gracefully

Sometimes you want to handle validation failures more gracefully than throwing exceptions. Zod's `safeParse` method returns a result object instead:

```ts
async function fetchUserSafely(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const result = UserSchema.safeParse(data);

    if (!result.success) {
      console.error('Validation failed:', result.error.errors);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

This approach lets you handle network failures, HTTP errors, and validation failures with different strategies—maybe you retry on network errors but log and return null on validation failures.

## React 19 and the `use` Hook

React 19 introduces the experimental `use` hook, which can consume promises directly. This pairs beautifully with validated data fetching:

```tsx
import { use, Suspense } from 'react';

// Promise that fetches and validates user data
function createUserPromise(id: string) {
  return fetchUser(id); // Our validated fetching function from above
}

function UserProfile({ userId }: { userId: string }) {
  // React 19's use hook consumes the promise
  const user = use(createUserPromise(userId));

  return (
    <div>
      <h1>
        {user.firstName} {user.lastName}
      </h1>
      <p>{user.email}</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<div>Loading user...</div>}>
      <UserProfile userId="123" />
    </Suspense>
  );
}
```

Since our `fetchUser` function already includes validation, any malformed data will cause the promise to reject, triggering React's error boundary handling rather than rendering broken UI.

> [!TIP]
> The `use` hook is still experimental as of React 19. For production code, stick with traditional async patterns or libraries like React Query until it stabilizes.

## Building a Robust Data Fetching Hook

Let's combine everything into a reusable pattern that handles loading states, errors, and validation:

```tsx
import { useState, useEffect } from 'react';
import { z } from 'zod';

type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string };

function useValidatedFetch<T>(url: string, schema: z.ZodSchema<T>, dependencies: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setState({ status: 'loading', data: null, error: null });

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
        const result = schema.safeParse(rawData);

        if (!result.success) {
          const errorMessage = result.error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
          throw new Error(`Validation failed: ${errorMessage}`);
        }

        if (!cancelled) {
          setState({
            status: 'success',
            data: result.data,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: 'error',
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, dependencies);

  return state;
}
```

Now you can use this hook anywhere you need validated data fetching:

```tsx
function UserProfile({ userId }: { userId: string }) {
  const userState = useValidatedFetch(`/api/users/${userId}`, UserSchema, [userId]);

  if (userState.status === 'loading') {
    return <div>Loading user...</div>;
  }

  if (userState.status === 'error') {
    return <div>Error: {userState.error}</div>;
  }

  const { data: user } = userState;

  return (
    <div>
      <h1>
        {user.firstName} {user.lastName}
      </h1>
      <p>{user.email}</p>
    </div>
  );
}
```

## Handling Complex Data Shapes

Real-world APIs often return nested objects, arrays, and optional fields. Zod excels at handling these complex scenarios:

```ts
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code'),
});

const DetailedUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  address: AddressSchema.optional(), // Optional nested object
  tags: z.array(z.string()).default([]), // Array with default
  preferences: z.record(z.string(), z.unknown()).optional(), // Key-value pairs
  createdAt: z.string().transform((date) => new Date(date)), // Transform string to Date
});

type DetailedUser = z.infer<typeof DetailedUserSchema>;
```

This schema handles:

- Nested objects (`address`)
- Optional fields (`.optional()`)
- Arrays with defaults (`.default([])`)
- Flexible key-value objects (`z.record()`)
- Data transformations (`.transform()`)
- Custom validation with regex patterns

## Error Boundaries for Validation Failures

Since validation failures can happen at any time during data fetching, you should wrap your data-fetching components in error boundaries:

```tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class DataValidationBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Data validation error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div>
            <h2>Data Error</h2>
            <p>The data from the server doesn't match what we expected.</p>
            <details>
              <summary>Technical details</summary>
              <pre>{this.state.error?.message}</pre>
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

Wrap your data-driven components:

```tsx
function App() {
  return (
    <DataValidationBoundary>
      <UserProfile userId="123" />
    </DataValidationBoundary>
  );
}
```

## Performance Considerations

Runtime validation does add some overhead, but it's usually negligible compared to network requests. However, there are a few optimization strategies:

### Validate Once, Trust Later

If you're passing validated data through multiple components, you don't need to re-validate it:

```tsx
// ✅ Good: Validate at the boundary, pass typed data down
function UserDashboard({ userId }: { userId: string }) {
  const userState = useValidatedFetch(`/api/users/${userId}`, UserSchema, [userId]);

  if (userState.status === 'success') {
    // userState.data is already validated - pass it down safely
    return (
      <>
        <UserHeader user={userState.data} />
        <UserDetails user={userState.data} />
        <UserActivity user={userState.data} />
      </>
    );
  }

  return <div>Loading...</div>;
}

// These components can trust the data is valid
function UserHeader({ user }: { user: User }) {
  return (
    <h1>
      {user.firstName} {user.lastName}
    </h1>
  );
}
```

### Schema Caching

For frequently used schemas, consider caching the compiled validation functions:

```ts
const schemaCache = new Map();

function getCachedSchema<T>(key: string, schema: z.ZodSchema<T>) {
  if (!schemaCache.has(key)) {
    schemaCache.set(key, schema);
  }
  return schemaCache.get(key);
}
```

### Partial Validation

