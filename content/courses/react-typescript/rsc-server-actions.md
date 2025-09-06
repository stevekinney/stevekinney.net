---
title: React Server Components and Server Actions
description: Respect the server/client boundary—serialize safely, type async components, and model actions.
date: 2025-09-06T22:23:57.350Z
modified: 2025-09-06T22:23:57.350Z
published: true
tags: ['react', 'typescript', 'server-components', 'server-actions', 'rsc']
---

React Server Components and Server Actions represent a fundamental shift in how we build React applications. Instead of the traditional pattern of fetching data on the client and managing complex state synchronization, Server Components run on the server during rendering, while Server Actions let you execute server-side logic directly from your components. The result? Less JavaScript shipped to the browser, faster initial page loads, and dramatically simplified data flows.

But here's the thing: with this power comes the responsibility to handle the server/client boundary correctly. Data must be serializable, async components need proper typing, and Actions require careful modeling to avoid runtime surprises. In this guide, we'll explore how to leverage TypeScript to make these new patterns both safe and productive.

## Understanding Server Components and Server Actions

Let's start by clarifying what we're working with:

**Server Components** render on the server and can access server-only resources like databases, file systems, and environment variables. They're async by default and their output is streamed to the client.

**Server Actions** are functions that execute on the server but can be called from either Server Components or Client Components. Think of them as type-safe RPC calls with built-in form integration.

Here's a simple example to illustrate the pattern:

```tsx
// app/products/page.tsx - Server Component
import { getProducts, addToCart } from './actions';

export default async function ProductsPage() {
  // ✅ Direct database access in Server Component
  const products = await getProducts();

  return (
    <div>
      <h1>Products</h1>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          addToCart={addToCart} // ✅ Pass Server Action as prop
        />
      ))}
    </div>
  );
}
```

```tsx
// actions.ts - Server Actions
'use server';

import { db } from '@/lib/database';
import { revalidatePath } from 'next/cache';

export async function getProducts() {
  return await db.product.findMany({
    where: { available: true },
    select: {
      id: true,
      name: true,
      price: true,
      description: true,
    },
  });
}

export async function addToCart(productId: string, quantity: number) {
  // Server-side logic with database access
  const result = await db.cartItem.create({
    data: { productId, quantity },
  });

  // Revalidate to update UI
  revalidatePath('/products');

  return { success: true, itemId: result.id };
}
```

The magic here is that TypeScript knows `getProducts()` returns a Promise, `addToCart` is a Server Action that can be called from forms or event handlers, and all the data flowing between server and client is automatically serialized.

## Typing Async Server Components

Server Components are async by default, which means you need to handle Promise types correctly. Let's look at the patterns:

```tsx
// Basic async Server Component typing
async function UserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId); // TypeScript infers Promise<User>

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// ✅ TypeScript knows this component returns Promise<JSX.Element>
type UserProfileComponent = typeof UserProfile;
// Result: (props: { userId: string }) => Promise<JSX.Element>
```

For more complex data fetching with proper error boundaries:

```tsx
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  profile: z.object({
    bio: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

type User = z.infer<typeof UserSchema>;

async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`${process.env.API_URL}/users/${id}`);

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    const rawUser = await response.json();

    // ✅ Runtime validation with Zod
    const result = UserSchema.safeParse(rawUser);

    if (!result.success) {
      console.error('Invalid user data:', result.error);
      throw new Error('Invalid user data received');
    }

    return result.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error; // Let error boundary handle it
  }
}

// Server Component with proper error handling
export default async function UserPage({ params }: { params: { userId: string } }) {
  try {
    const user = await fetchUser(params.userId);

    if (!user) {
      return (
        <div>
          <h1>User not found</h1>
          <p>The user you're looking for doesn't exist.</p>
        </div>
      );
    }

    return <UserProfile user={user} />;
  } catch (error) {
    // This will be caught by the nearest error boundary
    throw new Error(
      `Failed to load user ${params.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// Separate component for cleaner separation of concerns
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      {user.profile.bio && <p>{user.profile.bio}</p>}
      {user.profile.avatarUrl && <img src={user.profile.avatarUrl} alt={`${user.name}'s avatar`} />}
    </div>
  );
}
```

> [!TIP]
> Separate your data fetching logic from your rendering logic. This makes components easier to test and reason about.

## Server Action Type Safety

Server Actions need careful typing to ensure the data flow between server and client is safe. Here's how to build bulletproof Actions:

```ts
// Define your input/output schemas first
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.string().uuid('Invalid category ID'),
});

const UpdatePostSchema = CreatePostSchema.partial().extend({
  id: z.string().uuid('Invalid post ID'),
});

type CreatePostInput = z.infer<typeof CreatePostSchema>;
type UpdatePostInput = z.infer<typeof UpdatePostSchema>;

// Standardized action result type
type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// Helper function for consistent action handling
function createAction<TInput, TOutput = unknown>(
  schema: z.ZodSchema<TInput>,
  handler: (input: TInput) => Promise<TOutput>,
) {
  return async function action(input: unknown): Promise<ActionResult<TOutput>> {
    try {
      // Validate input
      const result = schema.safeParse(input);

      if (!result.success) {
        return {
          success: false,
          fieldErrors: result.error.flatten().fieldErrors,
        };
      }

      // Execute handler
      const data = await handler(result.data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Action error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };
}
```

Now we can create type-safe Server Actions:

```ts
'use server';

import { revalidatePath, redirect } from 'next/cache';
import { db } from '@/lib/database';

// Create post action with full type safety
export const createPost = createAction(CreatePostSchema, async (input: CreatePostInput) => {
  const post = await db.post.create({
    data: {
      title: input.title,
      content: input.content,
      categoryId: input.categoryId,
      authorId: await getCurrentUserId(), // Assume this helper exists
    },
  });

  revalidatePath('/posts');

  return {
    postId: post.id,
    slug: post.slug,
  };
});

// Update post action
export const updatePost = createAction(UpdatePostSchema, async (input: UpdatePostInput) => {
  const { id, ...updateData } = input;

  const post = await db.post.update({
    where: { id },
    data: updateData,
  });

  revalidatePath(`/posts/${post.slug}`);

  return {
    postId: post.id,
    updatedAt: post.updatedAt,
  };
});

// Delete action with confirmation
export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    await db.post.delete({
      where: { id: postId },
    });

    revalidatePath('/posts');
    redirect('/posts');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to delete post',
    };
  }
}
```

## Form Integration Patterns

Server Actions integrate beautifully with forms. Here's how to handle different form patterns with proper typing:

```tsx
// Client Component for interactive form
'use client';

import { useActionState } from 'react';
import { createPost } from './actions';

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const rawData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        categoryId: formData.get('categoryId') as string,
      };

      return await createPost(rawData);
    },
    { success: false },
  );

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          required
          aria-invalid={state.fieldErrors?.title ? 'true' : 'false'}
        />
        {state.fieldErrors?.title && <p className="error">{state.fieldErrors.title[0]}</p>}
      </div>

      <div>
        <label htmlFor="content">Content</label>
        <textarea
          id="content"
          name="content"
          required
          aria-invalid={state.fieldErrors?.content ? 'true' : 'false'}
        />
        {state.fieldErrors?.content && <p className="error">{state.fieldErrors.content[0]}</p>}
      </div>

      <div>
        <label htmlFor="categoryId">Category</label>
        <select
          id="categoryId"
          name="categoryId"
          required
          aria-invalid={state.fieldErrors?.categoryId ? 'true' : 'false'}
        >
          <option value="">Select a category</option>
          <option value="tech">Technology</option>
          <option value="design">Design</option>
        </select>
        {state.fieldErrors?.categoryId && (
          <p className="error">{state.fieldErrors.categoryId[0]}</p>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>

      {state.error && <p className="error">{state.error}</p>}

      {state.success && state.data && (
        <p className="success">Post created! ID: {state.data.postId}</p>
      )}
    </form>
  );
}
```

For simpler forms, you can call Server Actions directly:

```tsx
// Server Component with inline form
import { createPost } from './actions';

export default function QuickPostForm() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Post title" required />
      <textarea name="content" placeholder="Post content" required />
      <input name="categoryId" value="general" type="hidden" />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

> [!NOTE]
> When you call a Server Action directly from a form's action prop, it automatically receives FormData as its argument. This is why our `createAction` helper handles unknown input types.

## Handling Complex Data Flows

For more sophisticated applications, you'll need patterns that handle complex data relationships and state synchronization:

```ts
// Complex action with related data
export const createPostWithTags = createAction(
  z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    categoryId: z.string().uuid(),
    tagNames: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
  }),
  async (input) => {
    // Start a database transaction
    return await db.$transaction(async (tx) => {
      // Create the post
      const post = await tx.post.create({
        data: {
          title: input.title,
          content: input.content,
          categoryId: input.categoryId,
          authorId: await getCurrentUserId(),
          published: !input.draft,
        },
      });

      // Handle tags
      if (input.tagNames && input.tagNames.length > 0) {
        // Find existing tags or create new ones
        const tags = await Promise.all(
          input.tagNames.map(async (name) => {
            return await tx.tag.upsert({
              where: { name },
              create: { name },
              update: {},
            });
          }),
        );

        // Connect tags to post
        await tx.postTag.createMany({
          data: tags.map((tag) => ({
            postId: post.id,
            tagId: tag.id,
          })),
        });
      }

      return {
        postId: post.id,
        tagCount: input.tagNames?.length || 0,
      };
    });
  },
);

// Action for bulk operations
export const bulkUpdatePosts = createAction(
  z.object({
    postIds: z.array(z.string().uuid()).min(1),
    updates: z.object({
      published: z.boolean().optional(),
      categoryId: z.string().uuid().optional(),
    }),
  }),
  async (input) => {
    const result = await db.post.updateMany({
      where: {
        id: { in: input.postIds },
      },
      data: input.updates,
    });

    revalidatePath('/admin/posts');

    return {
      updatedCount: result.count,
    };
  },
);
```

## Optimistic Updates with Server Actions

Sometimes you want immediate UI feedback while your Server Action executes. Here's how to implement optimistic updates safely:

```tsx
'use client';

import { useActionState, useOptimistic } from 'react';
import { togglePostPublished } from './actions';

type Post = {
  id: string;
  title: string;
  published: boolean;
};

export function PostList({ initialPosts }: { initialPosts: Post[] }) {
  const [optimisticPosts, setOptimisticPosts] = useOptimistic(
    initialPosts,
    (currentPosts, { postId, published }: { postId: string; published: boolean }) =>
      currentPosts.map((post) => (post.id === postId ? { ...post, published } : post)),
  );

  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      const postId = formData.get('postId') as string;
      const currentPost = initialPosts.find((p) => p.id === postId);

      if (!currentPost) return prevState;

      // Optimistic update
      setOptimisticPosts({
        postId,
        published: !currentPost.published,
      });

      // Execute Server Action
      const result = await togglePostPublished(postId);

      if (!result.success) {
        // Revert optimistic update on error
        setOptimisticPosts({
          postId,
          published: currentPost.published,
        });
      }

      return result;
    },
    { success: true },
  );

  return (
    <div>
      {optimisticPosts.map((post) => (
        <div key={post.id} className="post-item">
          <h3>{post.title}</h3>
          <form action={formAction}>
            <input type="hidden" name="postId" value={post.id} />
            <button type="submit" className={post.published ? 'published' : 'draft'}>
              {post.published ? '✓ Published' : '○ Draft'}
            </button>
          </form>
        </div>
      ))}

      {state.error && <p className="error">Error: {state.error}</p>}
    </div>
  );
}
```

The corresponding Server Action:

```ts
'use server';

export const togglePostPublished = createAction(z.string().uuid(), async (postId: string) => {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { published: true },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  const updated = await db.post.update({
    where: { id: postId },
    data: { published: !post.published },
  });

  revalidatePath('/posts');

  return {
    postId,
    published: updated.published,
  };
});
```

> [!WARNING]
> Be careful with optimistic updates for operations that might fail. Always have a rollback strategy and clear error messaging for users.

## Error Boundaries and Server Action Failures

Server Actions can fail in various ways—network issues, validation errors, database constraints, or business logic violations. Here's how to handle them gracefully:

```tsx
// Error boundary specifically for Server Action errors
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface ServerActionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class ServerActionErrorBoundary extends Component<
  { children: ReactNode; fallback?: (error: Error, errorId: string) => ReactNode },
  ServerActionErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ServerActionErrorBoundaryState {
    const errorId = Math.random().toString(36).substr(2, 9);

    // Log to monitoring service
    console.error('Server Action Error:', { error, errorId });

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send to error reporting service
    console.error('Server Action Error Details:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error, this.state.errorId)
      ) : (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error details (ID: {this.state.errorId})</summary>
            {this.state.error.message}
          </details>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Use it to wrap components that call Server Actions:

```tsx
export default function PostManagement() {
  return (
    <ServerActionErrorBoundary
      fallback={(error, errorId) => (
        <div className="server-error">
          <h3>Server Action Failed</h3>
          <p>Unable to complete the operation.</p>
          <p>Error ID: {errorId}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      )}
    >
      <CreatePostForm />
      <PostList />
    </ServerActionErrorBoundary>
  );
}
```

## Performance Considerations

Server Components and Server Actions open up new optimization opportunities, but they also introduce new considerations:

### Streaming and Suspense

Combine Server Components with Suspense for better perceived performance:

```tsx
import { Suspense } from 'react';

// Fast component that renders immediately
function PostHeader({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

// Slow component that fetches data
async function PostComments({ postId }: { postId: string }) {
  // This might take a while...
  const comments = await fetchComments(postId);

  return (
    <div>
      {comments.map((comment) => (
        <div key={comment.id}>{comment.content}</div>
      ))}
    </div>
  );
}

export default async function PostPage({ params }: { params: { postId: string } }) {
  // This loads quickly
  const post = await fetchPost(params.postId);

  return (
    <div>
      <PostHeader title={post.title} />
      <div>{post.content}</div>

      {/* Comments load independently */}
      <Suspense fallback={<div>Loading comments...</div>}>
        <PostComments postId={params.postId} />
      </Suspense>
    </div>
  );
}
```

### Caching Server Action Results

For expensive Server Actions, implement caching:

```ts
import { unstable_cache as cache } from 'next/cache';

// Cache expensive computations
const getCachedAnalytics = cache(
  async (userId: string, dateRange: string) => {
    // Expensive analytics computation
    return await computeUserAnalytics(userId, dateRange);
  },
  ['user-analytics'],
  {
    revalidate: 3600, // 1 hour
    tags: ['analytics'],
  },
);

export const generateReport = createAction(
  z.object({
    userId: z.string().uuid(),
    dateRange: z.enum(['week', 'month', 'year']),
  }),
  async (input) => {
    const analytics = await getCachedAnalytics(input.userId, input.dateRange);

    // Generate report from cached data
    const report = await generateReportFromAnalytics(analytics);

    return {
      reportId: report.id,
      downloadUrl: report.url,
    };
  },
);
```

### Background Processing

For long-running Server Actions, consider background processing:

```ts
// Queue system integration
import { Queue } from '@/lib/queue';

export const processLargeDataset = createAction(
  z.object({
    datasetId: z.string().uuid(),
    options: z.object({
      format: z.enum(['csv', 'json']),
      includeMetadata: z.boolean(),
    }),
  }),
  async (input) => {
    // Start background job
    const job = await Queue.add('process-dataset', {
      datasetId: input.datasetId,
      options: input.options,
      userId: await getCurrentUserId(),
    });

    return {
      jobId: job.id,
      estimatedDuration: '5-10 minutes',
    };
  },
);

// Check job status action
export const checkJobStatus = createAction(z.string(), async (jobId: string) => {
  const job = await Queue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  return {
    status: job.progress,
    result: job.returnvalue,
    error: job.failedReason,
  };
});
```

## Real-World Patterns and Best Practices

Here are some production-ready patterns for common use cases:

### Multi-Step Forms with Server Actions

```tsx
// Multi-step form state management
type FormStep = 'personal' | 'payment' | 'confirmation';

interface FormState {
  currentStep: FormStep;
  data: {
    personal?: PersonalInfo;
    payment?: PaymentInfo;
  };
  errors?: Record<string, string[]>;
  submitting?: boolean;
}

export const processFormStep = createAction(
  z.object({
    step: z.enum(['personal', 'payment', 'submit']),
    data: z.record(z.any()),
    currentData: z.record(z.any()).optional(),
  }),
  async (input) => {
    switch (input.step) {
      case 'personal': {
        const personalData = PersonalInfoSchema.parse(input.data);
        return {
          step: 'payment' as const,
          data: { personal: personalData },
        };
      }

      case 'payment': {
        const paymentData = PaymentInfoSchema.parse(input.data);
        return {
          step: 'confirmation' as const,
          data: {
            ...input.currentData,
            payment: paymentData,
          },
        };
      }

      case 'submit': {
        // Process final submission
        const orderId = await createOrder(input.currentData);
        return {
          step: 'confirmation' as const,
          orderId,
          completed: true,
        };
      }
    }
  },
);
```

### Real-Time Updates

```tsx
'use client';

import { useEffect, useState } from 'react';
import { refreshData } from './actions';

export function LiveDataComponent({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await refreshData(lastUpdate);

        if (result.success && result.data) {
          setData(result.data);
          setLastUpdate(Date.now());
        }
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div>
      {data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
      <p>Last updated: {new Date(lastUpdate).toLocaleTimeString()}</p>
    </div>
  );
}
```

## Testing Server Components and Actions

Testing these new patterns requires some specific approaches:

```ts
// Testing Server Components
import { render } from '@testing-library/react';
import { jest } from '@jest/globals';
import UserProfile from './UserProfile';

// Mock the database
jest.mock('@/lib/database', () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

import { db } from '@/lib/database';

describe('UserProfile Server Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user data correctly', async () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    // Server Components return promises, so we await them
    const ProfileComponent = await UserProfile({ userId: '1' });
    const { getByText } = render(<>{ProfileComponent}</>);

    expect(getByText('John Doe')).toBeInTheDocument();
    expect(getByText('john@example.com')).toBeInTheDocument();
  });

  it('handles user not found', async () => {
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const ProfileComponent = await UserProfile({ userId: 'nonexistent' });
    const { getByText } = render(<>{ProfileComponent}</>);

    expect(getByText('User not found')).toBeInTheDocument();
  });
});

// Testing Server Actions
import { createPost } from './actions';

describe('createPost Server Action', () => {
  it('creates post with valid data', async () => {
    const validData = {
      title: 'Test Post',
      content: 'This is a test post',
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
    };

    const result = await createPost(validData);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('postId');
  });

  it('returns validation errors for invalid data', async () => {
    const invalidData = {
      title: '', // Empty title should fail
      content: 'Content',
      categoryId: 'invalid-uuid',
    };

    const result = await createPost(invalidData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toHaveProperty('title');
    expect(result.fieldErrors).toHaveProperty('categoryId');
  });
});
```

## Next Steps and Production Considerations

React Server Components and Server Actions represent a significant shift in React development. Here's what to focus on as you adopt these patterns:

1. **Start with Server Components**: Begin by moving data fetching logic from client to server components
2. **Progressive enhancement**: Ensure your Server Actions work without JavaScript for better resilience
3. **Monitoring and observability**: Set up proper logging and error tracking for server-side operations
4. **Performance testing**: Measure the impact on both server resources and client bundle sizes

The patterns we've covered scale from simple forms to complex multi-step workflows. The key is maintaining strict boundaries between server and client code while leveraging TypeScript to catch serialization issues before they reach production.

By embracing async components, type-safe actions, and proper error boundaries, you're building applications that are both more performant and more maintainable. The server/client boundary becomes a feature, not a limitation—giving you the best of both worlds with the safety net of TypeScript ensuring everything works correctly.

Server Components and Server Actions aren't just about performance; they're about building better architectures that are easier to reason about, test, and maintain. Welcome to the future of React development.
