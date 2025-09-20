---
title: useOptimistic and Typed Optimistic Updates
description: >-
  Model optimistic UI updates safely—design optimistic state and reconcile
  server results with precise types.
date: 2025-09-06T22:04:44.928Z
modified: '2025-09-06T17:49:18-06:00'
published: true
tags:
  - react
  - typescript
  - use-optimistic
  - optimistic-updates
  - react-19
---

React's `useOptimistic` hook lets you show users immediate feedback while their actions are still processing on the server. Think of it as showing a "like" button as already pressed while the API call is still in flight—your users get instant gratification, and you handle the complexities behind the scenes. But here's the thing: without proper TypeScript modeling, optimistic updates can quickly turn into a debugging nightmare when server responses don't match your assumptions.

Let's explore how to build robust, type-safe optimistic UI patterns that gracefully handle the happy path, network failures, and everything in between.

## What Are Optimistic Updates?

Optimistic updates are a UI pattern where you immediately show the expected result of a user action, then reconcile with the actual server response afterward. Instead of showing a loading spinner while waiting for the server, you assume the action will succeed and update the UI accordingly.

Here's the basic flow:

1. User performs an action (clicks "like", submits a form, deletes an item)
2. Immediately update the UI as if the action succeeded
3. Send the request to the server in the background
4. If successful, keep the optimistic state
5. If it fails, revert to the previous state and show an error

The key insight is that most user actions succeed most of the time. By optimizing for the common case, you create a snappier user experience.

## Understanding `useOptimistic`

React 19's `useOptimistic` hook provides a clean abstraction for this pattern. It manages two pieces of state: the actual data and the optimistic version that might differ temporarily.

```ts
import { useOptimistic } from 'react';

function MyComponent() {
  const [likes, setLikes] = useState(42);
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (current, optimisticValue) => current + optimisticValue,
  );

  // optimisticLikes shows immediate updates
  // likes shows the confirmed server state
}
```

The hook takes two parameters:

- **Current state**: The actual, confirmed state from your server
- **Reducer function**: How to apply optimistic updates to that state

## Setting Up Types for Optimistic Updates

Let's build a like system with proper TypeScript modeling. First, we'll define our core types:

```ts
// Base types for our data
type Post = {
  id: string;
  title: string;
  content: string;
  likesCount: number;
  isLikedByUser: boolean;
};

// Actions that can be applied optimistically
type OptimisticLikeAction =
  | { type: 'TOGGLE_LIKE'; postId: string }
  | { type: 'REVERT_LIKE'; postId: string };

// Server response types
type LikeResponse =
  | {
      success: true;
      likesCount: number;
      isLikedByUser: boolean;
    }
  | {
      success: false;
      error: string;
    };
```

Notice how we're modeling both the optimistic actions and the possible server responses. This gives us compile-time safety when handling different scenarios.

## Building a Type-Safe Optimistic Hook

Let's create a reusable hook that encapsulates the optimistic like logic:

```ts
import { useOptimistic, useCallback, useState } from 'react';

function useOptimisticLikes(posts: Post[]) {
  const [error, setError] = useState<string | null>(null);

  const [optimisticPosts, addOptimisticAction] = useOptimistic(
    posts,
    (currentPosts, action: OptimisticLikeAction) => {
      return currentPosts.map((post) => {
        if (post.id !== action.postId) return post;

        switch (action.type) {
          case 'TOGGLE_LIKE':
            return {
              ...post,
              isLikedByUser: !post.isLikedByUser,
              likesCount: post.isLikedByUser ? post.likesCount - 1 : post.likesCount + 1,
            };

          case 'REVERT_LIKE':
            // This handles server failures by reverting optimistic changes
            return {
              ...post,
              isLikedByUser: !post.isLikedByUser,
              likesCount: post.isLikedByUser ? post.likesCount - 1 : post.likesCount + 1,
            };

          default:
            // TypeScript will error if we miss any action types
            const _exhaustive: never = action;
            return post;
        }
      });
    },
  );

  const toggleLike = useCallback(
    async (postId: string) => {
      setError(null);

      // Apply optimistic update immediately
      addOptimisticAction({ type: 'TOGGLE_LIKE', postId });

      try {
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: 'POST',
        });

        const result: LikeResponse = await response.json();

        if (!result.success) {
          // Revert optimistic update on server error
          addOptimisticAction({ type: 'REVERT_LIKE', postId });
          setError(result.error);
        }

        // If successful, the server data will eventually update the posts array,
        // and useOptimistic will reconcile automatically
      } catch (networkError) {
        // Revert on network failure
        addOptimisticAction({ type: 'REVERT_LIKE', postId });
        setError('Network error. Please try again.');
      }
    },
    [addOptimisticAction],
  );

  return {
    posts: optimisticPosts,
    toggleLike,
    error,
  };
}
```

## Handling Complex Optimistic State

For more complex scenarios, you might need to model multiple types of optimistic updates. Let's extend our example to handle comments:

```ts
type Comment = {
  id: string;
  postId: string;
  content: string;
  author: string;
  timestamp: Date;
};

type OptimisticCommentAction =
  | { type: 'ADD_COMMENT'; comment: Omit<Comment, 'id'> & { tempId: string } }
  | { type: 'REMOVE_OPTIMISTIC_COMMENT'; tempId: string }
  | { type: 'CONFIRM_COMMENT'; tempId: string; actualId: string };

// Extended post type with comments
type PostWithComments = Post & {
  comments: Comment[];
};
```

Here's the key insight: we use `tempId` for optimistic comments and `actualId` once the server confirms them. This lets us track which comments are confirmed vs. still pending:

```ts
function useOptimisticComments(postsWithComments: PostWithComments[]) {
  const [optimisticPosts, addOptimisticAction] = useOptimistic(
    postsWithComments,
    (currentPosts, action: OptimisticCommentAction) => {
      switch (action.type) {
        case 'ADD_COMMENT': {
          return currentPosts.map((post) =>
            post.id === action.comment.postId
              ? {
                  ...post,
                  comments: [
                    ...post.comments,
                    {
                      id: action.comment.tempId, // Use tempId until confirmed
                      ...action.comment,
                    } as Comment,
                  ],
                }
              : post,
          );
        }

        case 'REMOVE_OPTIMISTIC_COMMENT': {
          return currentPosts.map((post) => ({
            ...post,
            comments: post.comments.filter((comment) => comment.id !== action.tempId),
          }));
        }

        case 'CONFIRM_COMMENT': {
          return currentPosts.map((post) => ({
            ...post,
            comments: post.comments.map((comment) =>
              comment.id === action.tempId ? { ...comment, id: action.actualId } : comment,
            ),
          }));
        }
      }
    },
  );

  const addComment = useCallback(
    async (postId: string, content: string, author: string) => {
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      // Optimistically add the comment
      addOptimisticAction({
        type: 'ADD_COMMENT',
        comment: {
          postId,
          content,
          author,
          timestamp: new Date(),
          tempId,
        },
      });

      try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, author }),
        });

        if (response.ok) {
          const { id } = await response.json();
          // Convert the temporary comment to a real one
          addOptimisticAction({
            type: 'CONFIRM_COMMENT',
            tempId,
            actualId: id,
          });
        } else {
          throw new Error('Failed to post comment');
        }
      } catch (error) {
        // Remove the failed optimistic comment
        addOptimisticAction({
          type: 'REMOVE_OPTIMISTIC_COMMENT',
          tempId,
        });
      }
    },
    [addOptimisticAction],
  );

  return { posts: optimisticPosts, addComment };
}
```

## Reconciling with Server State

One of the trickiest aspects of optimistic updates is handling reconciliation when the server state changes. You need to be thoughtful about how optimistic state merges with fresh server data.

Here's a pattern for handling this with React Query or SWR:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function PostsWithOptimisticUpdates() {
  const queryClient = useQueryClient();

  // Server state
  const { data: serverPosts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  // Optimistic state built on top of server state
  const { posts: optimisticPosts, toggleLike } = useOptimisticLikes(serverPosts);

  const likeMutation = useMutation({
    mutationFn: (postId: string) => likePost(postId),
    onSuccess: () => {
      // Refetch to ensure we have the latest server state
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  return (
    <div>
      {optimisticPosts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => toggleLike(post.id)}
        />
      ))}
    </div>
  );
}
```

> [!TIP]
> When the server data updates, `useOptimistic` automatically reconciles by applying any pending optimistic actions to the new server state. This means your optimistic updates "stick" until explicitly reverted.

## Error Handling Patterns

Robust optimistic updates require thoughtful error handling. Here are some patterns that work well:

### 1. Graceful Degradation

```ts
function useResilientOptimisticUpdates<T, A>(
  serverState: T,
  reducer: (state: T, action: A) => T,
  options: {
    onError?: (error: Error, action: A) => void;
    maxRetries?: number;
  } = {},
) {
  const [optimisticState, addOptimisticAction] = useOptimistic(serverState, reducer);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const performOptimisticAction = useCallback(
    async (
      action: A,
      apiCall: () => Promise<void>,
      actionId: string = Math.random().toString(),
    ) => {
      // Clear any previous errors for this action
      setErrors((prev) => {
        const next = new Map(prev);
        next.delete(actionId);
        return next;
      });

      // Apply optimistic update
      addOptimisticAction(action);

      try {
        await apiCall();
      } catch (error) {
        // Store the error and revert the action
        setErrors((prev) => new Map(prev).set(actionId, error as Error));
        options.onError?.(error as Error, action);

        // You might apply a revert action here depending on your setup
      }
    },
    [addOptimisticAction, options],
  );

  return {
    state: optimisticState,
    performOptimisticAction,
    errors,
    hasErrors: errors.size > 0,
  };
}
```

### 2. Retry Logic

For critical actions, you might want automatic retries:

```ts
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) break;

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw lastError!;
}
```

## Testing Optimistic Updates

Testing optimistic behavior requires simulating both success and failure scenarios:

```ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

describe('OptimisticLikes', () => {
  it('shows immediate feedback on like', async () => {
    const mockLikePost = vi.fn().mockResolvedValue({ success: true });

    render(<PostWithLikes onLike={mockLikePost} initialLikes={5} />);

    const likeButton = screen.getByRole('button', { name: /like/i });

    // Should show optimistic update immediately
    fireEvent.click(likeButton);
    expect(screen.getByText('6 likes')).toBeInTheDocument();

    // Server call should happen
    await waitFor(() => {
      expect(mockLikePost).toHaveBeenCalled();
    });
  });

  it('reverts on server failure', async () => {
    const mockLikePost = vi.fn().mockRejectedValue(new Error('Server error'));

    render(<PostWithLikes onLike={mockLikePost} initialLikes={5} />);

    const likeButton = screen.getByRole('button', { name: /like/i });

    fireEvent.click(likeButton);
    expect(screen.getByText('6 likes')).toBeInTheDocument();

    // Should revert after server failure
    await waitFor(() => {
      expect(screen.getByText('5 likes')).toBeInTheDocument();
    });

    // Should show error message
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Real-World Considerations

When implementing optimistic updates in production applications, keep these patterns in mind:

### 1. Conflict Resolution

When multiple users modify the same data simultaneously, you need strategies for handling conflicts:

```ts
type ConflictResolution = 'server-wins' | 'client-wins' | 'merge' | 'prompt-user';

function resolveOptimisticConflict<T>(
  serverVersion: T,
  optimisticVersion: T,
  strategy: ConflictResolution,
): T {
  switch (strategy) {
    case 'server-wins':
      return serverVersion;

    case 'client-wins':
      return optimisticVersion;

    case 'merge':
      // Custom merge logic based on your data structure
      return { ...serverVersion, ...optimisticVersion };

    case 'prompt-user':
      // Show a UI dialog for manual resolution
      throw new ConflictError(serverVersion, optimisticVersion);

    default:
      const _exhaustive: never = strategy;
      return serverVersion;
  }
}
```

### 2. Bandwidth Considerations

For users on slow connections, consider batching optimistic updates:

```ts
function useBatchedOptimisticUpdates<T>(
  batchWindow = 500, // ms
) {
  const [pendingActions, setPendingActions] = useState<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const addAction = useCallback(
    (action: T) => {
      setPendingActions((prev) => [...prev, action]);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to flush batch
      timeoutRef.current = setTimeout(() => {
        flushPendingActions();
      }, batchWindow);
    },
    [batchWindow],
  );

  // Implementation details for flushing...
}
```

### 3. Accessibility

Don't forget to announce optimistic state changes to screen readers:

```ts
function useOptimisticAnnouncements() {
  const announce = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only'; // Screen reader only
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
}
```

## Wrapping Up

Optimistic updates with `useOptimistic` can dramatically improve perceived performance, but they require careful TypeScript modeling to handle edge cases gracefully. The key principles to remember:

1. **Model your actions explicitly** with discriminated unions
2. **Plan for failure** with revert mechanisms
3. **Test both happy and sad paths** thoroughly
4. **Consider reconciliation** when server state updates
5. **Handle conflicts** between optimistic and server state

When implemented thoughtfully, optimistic updates create delightfully responsive interfaces that feel instant to users while maintaining data integrity behind the scenes. The TypeScript safety net ensures you catch edge cases at compile time rather than in production—because nothing ruins the optimistic experience quite like a runtime error.

The patterns we've explored here scale from simple like buttons to complex collaborative editing scenarios. Start with the basics, add complexity as needed, and always remember: optimism is great, but a little pessimistic planning goes a long way.
