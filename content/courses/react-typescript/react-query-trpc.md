---
title: Typed Data Layer: React Query and tRPC
description: End‑to‑end types—from server router to client calls—plus cached queries with proper key typing.
date: 2025-09-06T22:23:57.350Z
modified: 2025-09-06T22:23:57.350Z
published: true
tags: ['react', 'typescript', 'react-query', 'trpc', 'data-fetching', 'rpc']
---

Building a fully type-safe data layer between your React frontend and backend is one of those things that sounds complicated but becomes surprisingly elegant once you get the pieces in place. When you combine React Query's powerful caching and state management with tRPC's end-to-end type safety, you get something magical: full TypeScript inference from your server functions all the way to your React components, with zero manual type definitions.

Here's what we're solving: traditional REST APIs require you to manually keep your frontend and backend types in sync, React Query's cache keys are just strings (easy to typo), and you're constantly writing boilerplate for data fetching patterns. tRPC eliminates the type drift between client and server, while React Query handles all the messy async state management—and when they work together, your data layer becomes both powerful and completely type-safe.

## What Makes tRPC + React Query Special

Before we dive into implementation, let's understand why this combination is so compelling:

**tRPC gives you**:

- End-to-end type safety from server to client
- Auto-generated client code from your server router
- No more manual API types or keeping schemas in sync
- Compile-time errors when server APIs change

**React Query adds**:

- Intelligent caching with automatic background updates
- Request deduplication and proper loading states
- Optimistic updates and cache invalidation
- Proper error handling and retry logic

Together, they create a data layer where your IDE can autocomplete server function names, parameters, and return types—while React Query handles all the async complexity behind the scenes.

## Setting Up the Foundation

Let's start with a basic tRPC setup. First, install the dependencies:

```bash
# Server packages
npm install @trpc/server @trpc/client @trpc/react-query
npm install @tanstack/react-query zod

# If using Next.js
npm install @trpc/next
```

Here's a minimal tRPC server setup:

```ts
// server/trpc.ts
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Example router with some procedures
export const appRouter = router({
  getUser: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    // Your database call here
    return {
      id: input.id,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date(),
    };
  }),

  getUsers: publicProcedure.query(async () => {
    // Return array of users
    return [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ];
  }),

  createUser: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      // Create user in database
      return {
        id: Math.random().toString(),
        ...input,
        createdAt: new Date(),
      };
    }),
});

export type AppRouter = typeof appRouter;
```

The magic here is that `AppRouter` type—tRPC will use this to generate fully typed client code.

## Client Setup with React Query Integration

Now let's set up the client side. tRPC's React Query integration gives you hooks that work exactly like regular React Query, but with full type safety:

```tsx
// utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/trpc';

export const trpc = createTRPCReact<AppRouter>();
```

Set up your providers—this looks a lot like regular React Query setup:

```tsx
// app.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './utils/trpc';
import { useState } from 'react';

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc', // Your tRPC endpoint
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <UserDashboard />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## Using tRPC Queries in Components

Here's where the magic happens. Your components get fully typed hooks that know about your server functions:

```tsx
// components/UserDashboard.tsx
import { trpc } from '../utils/trpc';

function UserDashboard() {
  // ✅ Fully typed query - IDE knows return type and loading states
  const { data: users, isLoading, error } = trpc.getUsers.useQuery();

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Users</h1>
      {users?.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

function UserCard({ user }: { user: { id: string; name: string; email: string } }) {
  // Query with parameters - also fully typed
  const { data: userData, isLoading } = trpc.getUser.useQuery({
    id: user.id,
  });

  if (isLoading) return <div>Loading {user.name}...</div>;

  return (
    <div className="user-card">
      <h3>{userData?.name}</h3>
      <p>{userData?.email}</p>
      <small>Created: {userData?.createdAt.toLocaleDateString()}</small>
    </div>
  );
}
```

Notice how there's no manual typing needed—tRPC inferred the return types from your server router, and React Query provides all the loading states and error handling.

## Mutations with Optimistic Updates

tRPC mutations work seamlessly with React Query's optimistic update patterns:

```tsx
function CreateUserForm() {
  const utils = trpc.useUtils();

  const createUser = trpc.createUser.useMutation({
    // Optimistically update the cache
    onMutate: async (newUser) => {
      await utils.getUsers.cancel();

      const previousUsers = utils.getUsers.getData();

      // Optimistically add the new user
      utils.getUsers.setData(undefined, (old = []) => [
        ...old,
        {
          id: 'temp-' + Date.now(),
          ...newUser,
        },
      ]);

      return { previousUsers };
    },

    // If mutation fails, rollback
    onError: (err, newUser, context) => {
      utils.getUsers.setData(undefined, context?.previousUsers);
    },

    // Always refetch after error or success
    onSettled: () => {
      utils.getUsers.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createUser.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={createUser.isLoading}>
        {createUser.isLoading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

## Advanced Query Patterns

### Dependent Queries

Sometimes you need to chain queries—fetch a user, then fetch their posts:

```tsx
function UserWithPosts({ userId }: { userId: string }) {
  const { data: user } = trpc.getUser.useQuery({ id: userId });

  // Only fetch posts if we have a user
  const { data: posts, isLoading: postsLoading } = trpc.getUserPosts.useQuery(
    { userId },
    {
      enabled: !!user, // Dependent query pattern
    },
  );

  if (!user) return <div>Loading user...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      {postsLoading ? (
        <div>Loading posts...</div>
      ) : (
        posts?.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
```

### Infinite Queries

For pagination, tRPC plays nicely with React Query's infinite queries:

```tsx
// Server procedure with cursor-based pagination
export const appRouter = router({
  getPostsPaginated: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const posts = await getPosts({
        cursor: input.cursor,
        limit: input.limit + 1, // Get one extra to determine if there's more
      });

      const hasNextPage = posts.length > input.limit;
      const items = hasNextPage ? posts.slice(0, -1) : posts;

      return {
        items,
        nextCursor: hasNextPage ? items[items.length - 1].id : null,
      };
    }),
});
```

```tsx
// Client component with infinite scroll
function InfinitePostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.getPostsPaginated.useInfiniteQuery(
      { limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Cache Management and Invalidation

One of React Query's superpowers is intelligent cache management. With tRPC, you get typed utilities for managing the cache:

```tsx
function useUserActions(userId: string) {
  const utils = trpc.useUtils();

  const updateUser = trpc.updateUser.useMutation({
    onSuccess: (updatedUser) => {
      // Invalidate and refetch specific user
      utils.getUser.invalidate({ id: userId });

      // Update user in the users list cache
      utils.getUsers.setData(undefined, (oldUsers = []) =>
        oldUsers.map((user) => (user.id === userId ? { ...user, ...updatedUser } : user)),
      );

      // Invalidate any related queries
      utils.getUserPosts.invalidate({ userId });
    },
  });

  const deleteUser = trpc.deleteUser.useMutation({
    onSuccess: () => {
      // Remove from all relevant caches
      utils.getUser.invalidate({ id: userId });
      utils.getUsers.invalidate();
      utils.getUserPosts.invalidate({ userId });
    },
  });

  return {
    updateUser,
    deleteUser,
  };
}
```

## Optimizing with Prefetching

You can prefetch data before it's needed—great for hover states or predictable navigation:

```tsx
function UserListItem({ user }: { user: { id: string; name: string } }) {
  const utils = trpc.useUtils();

  const prefetchUserDetails = () => {
    // Prefetch user details on hover
    utils.getUser.prefetch({ id: user.id });
  };

  return (
    <div onMouseEnter={prefetchUserDetails} className="user-item">
      <Link to={`/users/${user.id}`}>{user.name}</Link>
    </div>
  );
}
```

For server-side rendering or static generation, you can prefetch queries:

```tsx
// In Next.js, prefetch during SSG/SSR
export async function getStaticProps() {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: {},
  });

  await ssg.getUsers.prefetch();

  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
  };
}
```

## Error Handling Strategies

tRPC integrates with React Query's error handling, but you can customize error behavior:

```tsx
// Global error handling
function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // Don't retry 4xx errors, but retry 5xx
              if (error instanceof TRPCError && error.data?.httpStatus < 500) {
                return false;
              }
              return failureCount < 3;
            },
            onError: (error) => {
              console.error('Query error:', error);
              // Could show toast notification here
            },
          },
          mutations: {
            onError: (error) => {
              console.error('Mutation error:', error);
              // Handle mutation errors globally
            },
          },
        },
      }),
  );

  // ... rest of setup
}
```

```tsx
// Component-level error handling
function UserProfile({ userId }: { userId: string }) {
  const {
    data: user,
    error,
    isError,
    refetch,
  } = trpc.getUser.useQuery(
    { id: userId },
    {
      retry: false, // Override global retry for this query
      onError: (error) => {
        if (error.data?.code === 'NOT_FOUND') {
          // Handle user not found specifically
          navigate('/users');
        }
      },
    },
  );

  if (isError) {
    return (
      <div className="error-state">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Try Again</button>
      </div>
    );
  }

  // ... rest of component
}
```

## Performance Considerations

### Query Batching

tRPC automatically batches multiple queries made in the same tick:

```tsx
function Dashboard() {
  // These will be batched into a single request
  const { data: user } = trpc.getUser.useQuery({ id: '1' });
  const { data: posts } = trpc.getUserPosts.useQuery({ userId: '1' });
  const { data: notifications } = trpc.getNotifications.useQuery();

  // All three queries sent in one HTTP request!
}
```

### Selective Invalidation

Be surgical about cache invalidation to avoid unnecessary refetches:

```tsx
const createPost = trpc.createPost.useMutation({
  onSuccess: (newPost) => {
    // ✅ Good: Only invalidate queries that actually changed
    utils.getUserPosts.invalidate({ userId: newPost.authorId });

    // ❌ Avoid: Don't invalidate everything
    // utils.invalidate();
  },
});
```

### Subscription Patterns

For real-time features, tRPC supports subscriptions (though this requires WebSocket setup):

```tsx
// Server
export const appRouter = router({
  onPostAdded: publicProcedure.subscription(() => {
    return observable<Post>((emit) => {
      // Set up WebSocket or SSE listener
      const unsubscribe = onNewPost((post) => {
        emit.next(post);
      });

      return unsubscribe;
    });
  }),
});
```

```tsx
// Client
function PostFeed() {
  const { data: posts } = trpc.getPosts.useQuery();

  // Subscribe to new posts
  trpc.onPostAdded.useSubscription(undefined, {
    onData: (newPost) => {
      utils.getPosts.setData(undefined, (oldPosts = []) => [newPost, ...oldPosts]);
    },
  });

  return (
    <div>
      {posts?.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

## Real-World Architecture Patterns

### Query Organization

As your app grows, organize queries logically:

```ts
// routers/users.ts
export const usersRouter = router({
  getUser: publicProcedure.input(z.object({ id: z.string() })).query(/* ... */),

  getUserPosts: publicProcedure.input(z.object({ userId: z.string() })).query(/* ... */),

  updateUser: publicProcedure.input(UserUpdateSchema).mutation(/* ... */),
});

// routers/posts.ts
export const postsRouter = router({
  getPosts: publicProcedure.query(/* ... */),
  createPost: publicProcedure.mutation(/* ... */),
});

// Main router
export const appRouter = router({
  users: usersRouter,
  posts: postsRouter,
});
```

```tsx
// Usage with nested routers
const { data: user } = trpc.users.getUser.useQuery({ id: '1' });
const createPost = trpc.posts.createPost.useMutation();
```

### Custom Hooks for Business Logic

Encapsulate complex query patterns in custom hooks:

```tsx
function useUserWithPosts(userId: string) {
  const userQuery = trpc.users.getUser.useQuery({ id: userId });
  const postsQuery = trpc.users.getUserPosts.useQuery({ userId }, { enabled: !!userQuery.data });

  return {
    user: userQuery.data,
    posts: postsQuery.data,
    isLoading: userQuery.isLoading || postsQuery.isLoading,
    error: userQuery.error || postsQuery.error,
    refetch: () => {
      userQuery.refetch();
      postsQuery.refetch();
    },
  };
}
```

## Common Pitfalls and Solutions

### Cache Key Confusion

Remember that tRPC generates cache keys based on procedure names and inputs:

```tsx
// ❌ These create separate cache entries
trpc.getUser.useQuery({ id: '1' });
trpc.getUser.useQuery({ id: '1', includeProfile: true });

// ✅ Use consistent input shapes
const UserQueryInput = z.object({
  id: z.string(),
  includeProfile: z.boolean().default(false),
});
```

### Over-Invalidation

Avoid invalidating too broadly:

```tsx
const updateUser = trpc.updateUser.useMutation({
  onSuccess: () => {
    // ❌ Bad: Invalidates all queries
    utils.invalidate();

    // ✅ Good: Surgical invalidation
    utils.users.getUser.invalidate({ id: userId });
    utils.users.getUserPosts.invalidate({ userId });
  },
});
```

### Memory Leaks with Subscriptions

Always clean up subscriptions:

```tsx
function useRealtimeData(userId: string) {
  useEffect(() => {
    const subscription = trpc.onUserUpdate.useSubscription(
      { userId },
      {
        onData: (data) => {
          // Handle update
        },
      },
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [userId]);
}
```

## Next Steps

The combination of tRPC and React Query creates a incredibly productive development experience—you get end-to-end type safety, intelligent caching, and all the async state management patterns you need. Once you've got the basics down, consider exploring:

- **Authentication patterns** with tRPC middleware for protected procedures
- **File uploads** and handling non-JSON data with tRPC
- **Error monitoring** to track query failures in production
- **Advanced cache patterns** like cache warming and background updates
- **Testing strategies** for components that use tRPC queries

The key insight is that modern type-safe data fetching isn't just about preventing bugs (though it does that beautifully)—it's about creating a development experience where your tools understand your data flow and can help you build features faster and more confidently.
