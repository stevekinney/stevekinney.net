---
title: Routing and Typed URL Params
description: Make routes typesafe—constrain path params, search params, and loaders so links and pages never disagree.
date: 2025-09-06T22:04:44.949Z
modified: 2025-09-06T22:04:44.949Z
published: true
tags: ['react', 'typescript', 'routing', 'params', 'navigation', 'url-params']
---

URLs are the API of the web—they carry data, state, and intent. But by default, they're just strings, which means your `userId` parameter could be `"definitely-not-a-number"` and TypeScript would happily let you pass it to a function expecting a number. Enter typed routing: a way to make your URLs as type-safe as the rest of your React application, catching mismatched parameters at compile time instead of letting users stumble into broken pages.

Modern React routing libraries like [React Router v6.4+](https://reactrouter.com/), [TanStack Router](https://tanstack.com/router), and [Next.js 13+ App Router](https://nextjs.org/docs/app) all support some form of type-safe routing. We'll explore how to constrain path parameters, validate search parameters, and ensure your data loaders never receive unexpected types—because nobody wants to debug why `parseInt("banana")` returns `NaN` at 2 AM.

## The Problem with String-Based Routing

Traditional routing treats everything as strings. Consider this typical React Router setup:

```tsx
// ❌ No type safety here
import { useParams } from 'react-router-dom';

function UserProfile() {
  const { userId } = useParams(); // userId is string | undefined

  // This could blow up if userId is "not-a-number"
  const id = parseInt(userId!); // Non-null assertion = danger

  return <div>User {id}</div>;
}
```

The issues are obvious:

- `userId` could be `undefined` or a malformed string
- Type assertions (`!`) hide potential runtime errors
- No compile-time guarantee that the route parameter exists
- Search parameters are even more Wild West™

## Setting Up Typed Routes with React Router

Let's start with React Router since it's the most widely used. We'll use [Zod](https://zod.dev) for runtime validation and type inference—the perfect marriage of compile-time and runtime safety.

```bash
npm install react-router-dom zod
npm install -D @types/react-router-dom
```

First, let's create a schema for our route parameters:

```tsx
import { z } from 'zod';

// Define schemas for different route parameter patterns
export const userParamsSchema = z.object({
  userId: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().positive()),
});

export const postParamsSchema = z.object({
  userId: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().positive()),
  postId: z.string().uuid(),
});

// Generate TypeScript types
export type UserParams = z.infer<typeof userParamsSchema>;
export type PostParams = z.infer<typeof postParamsSchema>;
```

Now we can create a typed hook that validates parameters:

```tsx
import { useParams } from 'react-router-dom';
import { z } from 'zod';

function useTypedParams<T>(schema: z.ZodSchema<T>): T {
  const params = useParams();

  const result = schema.safeParse(params);

  if (!result.success) {
    // In a real app, you might want to redirect to a 404 page
    throw new Error(`Invalid route parameters: ${result.error.message}`);
  }

  return result.data;
}

// Usage in components
function UserProfile() {
  const { userId } = useTypedParams(userParamsSchema); // userId is number!

  return <div>User {userId}</div>;
}

function PostDetail() {
  const { userId, postId } = useTypedParams(postParamsSchema);
  // userId is number, postId is string (valid UUID)

  return (
    <div>
      Post {postId} by User {userId}
    </div>
  );
}
```

## Handling Search Parameters

Search parameters (query strings) are trickier because they're optional and can have multiple values. Let's create a typed solution:

```tsx
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';

// Schema for search parameters with sensible defaults
export const searchParamsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .pipe(z.number().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10))
    .pipe(z.number().min(1).max(100).default(10)),
  sort: z.enum(['date', 'title', 'author']).optional().default('date'),
  search: z.string().optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

function useTypedSearchParams<T>(schema: z.ZodSchema<T>): [T, (updates: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  // Convert URLSearchParams to plain object
  const paramsObject = Object.fromEntries(searchParams.entries());

  const result = schema.safeParse(paramsObject);

  const validatedParams = result.success ? result.data : schema.parse({}); // Use defaults if validation fails

  const updateParams = (updates: Partial<T>) => {
    const newParams = { ...validatedParams, ...updates };

    // Convert back to URLSearchParams, filtering out undefined values
    const urlParams = new URLSearchParams();
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        urlParams.set(key, String(value));
      }
    });

    setSearchParams(urlParams);
  };

  return [validatedParams, updateParams];
}

// Usage
function PostsList() {
  const [searchParams, setSearchParams] = useTypedSearchParams(searchParamsSchema);

  // All parameters are properly typed with defaults applied
  const { page, limit, sort, search } = searchParams;

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage });
  };

  return (
    <div>
      <input
        value={search || ''}
        onChange={(e) => setSearchParams({ search: e.target.value })}
        placeholder="Search posts..."
      />
      <select
        value={sort}
        onChange={(e) => setSearchParams({ sort: e.target.value as SearchParams['sort'] })}
      >
        <option value="date">Date</option>
        <option value="title">Title</option>
        <option value="author">Author</option>
      </select>
      {/* Your posts list here */}
    </div>
  );
}
```

## Typed Route Definitions

For even better type safety, let's create a system where route definitions include their parameter schemas:

```tsx
import { z } from 'zod';

// Route definition with embedded schemas
export const routes = {
  home: {
    path: '/',
    params: z.object({}),
    search: z.object({}),
  },
  user: {
    path: '/users/:userId',
    params: userParamsSchema,
    search: z.object({}),
  },
  post: {
    path: '/users/:userId/posts/:postId',
    params: postParamsSchema,
    search: searchParamsSchema,
  },
} as const;

// Type-safe navigation helper
function createTypedNavigate() {
  const navigate = useNavigate();

  return <K extends keyof typeof routes>(
    route: K,
    params: z.infer<(typeof routes)[K]['params']>,
    search?: z.infer<(typeof routes)[K]['search']>,
  ) => {
    let path = routes[route].path;

    // Replace path parameters
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, String(value));
    });

    // Add search parameters
    if (search && Object.keys(search).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(search).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.set(key, String(value));
        }
      });
      path += `?${searchParams.toString()}`;
    }

    navigate(path);
  };
}

// Usage
function SomeComponent() {
  const typedNavigate = createTypedNavigate();

  const goToUserPost = () => {
    typedNavigate(
      'post',
      { userId: 123, postId: 'uuid-here' }, // ✅ Typed parameters
      { page: 2, sort: 'title' }, // ✅ Typed search params
    );
  };

  return <button onClick={goToUserPost}>View Post</button>;
}
```

## Typed Data Loaders

If you're using React Router's data loading features, you can type your loaders too:

```tsx
import { LoaderFunctionArgs } from 'react-router-dom';

// Typed loader function
export async function userLoader({ params }: LoaderFunctionArgs) {
  // Validate parameters at the loader level
  const { userId } = userParamsSchema.parse(params);

  const user = await fetchUser(userId); // userId is guaranteed to be a number

  if (!user) {
    throw new Response('User not found', { status: 404 });
  }

  return user;
}

// Type-safe data access in components
function UserProfile() {
  const user = useLoaderData() as Awaited<ReturnType<typeof userLoader>>;

  return <div>Welcome, {user.name}!</div>;
}
```

> [!TIP]
> For even better type inference with loaders, consider using libraries like [Remix](https://remix.run/) or [TanStack Router](https://tanstack.com/router), which provide first-class TypeScript support for data loading.

## Going Full Type-Safe with TanStack Router

If you want the ultimate in type-safe routing, TanStack Router provides end-to-end type safety out of the box:

```tsx
import { createRoute, createRouter } from '@tanstack/react-router';
import { z } from 'zod';

// Define route with built-in validation
const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/$userId',
  validateSearch: z.object({
    tab: z.enum(['posts', 'followers', 'following']).optional(),
  }),
  component: UserProfile,
});

function UserProfile() {
  const { userId } = userRoute.useParams(); // Fully typed!
  const { tab } = userRoute.useSearch(); // Also typed!

  return (
    <div>
      User {userId} - Tab: {tab || 'posts'}
    </div>
  );
}
```

TanStack Router generates types automatically and catches routing errors at compile time. It's particularly powerful for complex applications where type safety is critical.

## Real-World Considerations

### Performance Implications

Parameter validation happens on every route change, so keep schemas lightweight:

```tsx
// ✅ Good: Simple transformations
const simpleSchema = z.object({
  id: z.string().transform(Number),
});

// ❌ Avoid: Complex async validations in route parameters
const heavySchema = z.object({
  id: z.string().refine(async (id) => await validateInDatabase(id)),
});
```

### Error Boundaries

Wrap your routing components in error boundaries to handle validation failures gracefully:

```tsx
function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<div>Invalid route parameters</div>}
      onError={(error) => {
        console.error('Route validation error:', error);
        // Log to your error tracking service
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Backward Compatibility

If you're adding type safety to an existing app, use progressive enhancement:

```tsx
function useTypedParamsWithFallback<T>(schema: z.ZodSchema<T>) {
  const params = useParams();

  const result = schema.safeParse(params);

  if (result.success) {
    return { data: result.data, isValid: true };
  }

  // Fall back to raw params for backward compatibility
  console.warn('Route params validation failed, using raw params:', result.error);
  return { data: params as T, isValid: false };
}
```

## Testing Typed Routes

Type-safe routes are easier to test since you know exactly what data shape to expect:

```tsx
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

test('renders user profile with valid params', () => {
  const router = createMemoryRouter(
    [
      {
        path: '/users/:userId',
        element: <UserProfile />,
      },
    ],
    {
      initialEntries: ['/users/123'],
    },
  );

  render(<RouterProvider router={router} />);

  expect(screen.getByText('User 123')).toBeInTheDocument();
});

test('handles invalid user ID', () => {
  const router = createMemoryRouter(
    [
      {
        path: '/users/:userId',
        element: <UserProfile />,
        errorElement: <div>Invalid user ID</div>,
      },
    ],
    {
      initialEntries: ['/users/not-a-number'],
    },
  );

  render(<RouterProvider router={router} />);

  expect(screen.getByText('Invalid user ID')).toBeInTheDocument();
});
```

## Next Steps

Typed routing transforms URLs from error-prone strings into reliable, validated data contracts. Start small—add parameter validation to your most critical routes first, then expand the system as you see the benefits.

Consider these enhancements as your routing grows:

- **Route-based code splitting** with typed lazy loading
- **SEO-friendly URLs** with slug validation and transformation
- **Internationalized routing** with locale-aware parameter schemas
- **Analytics integration** that tracks typed route transitions

The goal isn't perfection from day one—it's building a system that catches more errors at compile time and makes your routing logic more predictable. Your future self (and your users) will thank you when they never see another "Cannot read property of undefined" error from malformed URL parameters.
