---
title: Apollo Client Performance Optimization
description: >-
  Master Apollo Client performance with cache optimization, query batching,
  optimistic updates, and efficient subscription management strategies.
date: 2025-09-20T01:15:00.000Z
modified: '2025-09-20T21:18:31.287Z'
published: true
tags:
  - react
  - performance
  - graphql
  - apollo
  - caching
---

Apollo Client provides powerful tools for GraphQL performance optimization, but they require careful configuration to achieve optimal results. This guide covers advanced Apollo Client techniques for caching, batching, optimistic updates, and subscription management that can dramatically improve your React application's performance.

## Optimizing Apollo Client Cache

Apollo's normalized cache is powerful but needs proper configuration:

```tsx
// Cache configuration for performance
import { InMemoryCache, ApolloClient } from '@apollo/client';

const cache = new InMemoryCache({
  // Type policies for normalization
  typePolicies: {
    Query: {
      fields: {
        // Paginated field with custom merge
        posts: {
          keyArgs: ['filter', 'sort'],
          merge(existing = { edges: [], pageInfo: {} }, incoming) {
            return {
              ...incoming,
              edges: [...(existing.edges || []), ...incoming.edges],
            };
          },
        },

        // Singleton field
        viewer: {
          merge: true,
        },
      },
    },

    User: {
      // Custom cache key
      keyFields: ['uuid'],

      fields: {
        // Computed field
        fullName: {
          read(_, { readField }) {
            const firstName = readField('firstName');
            const lastName = readField('lastName');
            return `${firstName} ${lastName}`;
          },
        },

        // Optimistic field
        isFollowing: {
          read(existing, { readField, toReference }) {
            if (existing !== undefined) return existing;

            // Check if user is in followed list
            const viewerId = readField('id', toReference({ __typename: 'User', id: 'viewer' }));
            const followedIds = readField<string[]>(
              'followedUserIds',
              toReference({ __typename: 'User', id: viewerId }),
            );
            const userId = readField('id');

            return followedIds?.includes(userId as string) || false;
          },
        },
      },
    },

    Post: {
      fields: {
        // Invalidate on update
        comments: {
          merge(existing, incoming, { readField }) {
            // Custom merge strategy for comments
            const merged = existing ? existing.slice(0) : [];
            const existingIdSet = new Set(merged.map((comment: any) => readField('id', comment)));

            incoming.forEach((comment: any) => {
              const id = readField('id', comment);
              if (!existingIdSet.has(id)) {
                merged.push(comment);
              }
            });

            return merged;
          },
        },
      },
    },
  },

  // Possess object identity
  possibleTypes: {
    Node: ['User', 'Post', 'Comment'],
    SearchResult: ['User', 'Post'],
  },

  // Data ID from object
  dataIdFromObject(object: any) {
    switch (object.__typename) {
      case 'User':
        return `User:${object.uuid}`;
      case 'Post':
        return `Post:${object.id}`;
      default:
        return defaultDataIdFromObject(object);
    }
  },
});

// Cache persistence for performance
import { persistCache } from 'apollo3-cache-persist';

async function setupCache() {
  await persistCache({
    cache,
    storage: window.localStorage,
    maxSize: 1048576, // 1MB
    debug: process.env.NODE_ENV === 'development',
  });

  return cache;
}
```

## Query Batching and Deduplication

Reduce network requests with batching:

```tsx
// Apollo Link setup for batching
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { RetryLink } from '@apollo/client/link/retry';

const batchLink = new BatchHttpLink({
  uri: '/graphql',
  batchMax: 10, // Max queries per batch
  batchInterval: 20, // Ms to wait before batching
  batchKey: (operation) => {
    // Group by operation type
    const operationType = operation.query.definitions[0].operation;
    return operationType;
  },
});

// Query deduplication
const dedupLink = new ApolloLink((operation, forward) => {
  // Track in-flight queries
  const key = `${operation.operationName}:${JSON.stringify(operation.variables)}`;

  if (inFlightQueries.has(key)) {
    // Return existing promise
    return inFlightQueries.get(key);
  }

  const observable = forward(operation);
  const promise = new Observable((observer) => {
    const subscription = observable.subscribe({
      next: observer.next.bind(observer),
      error: (error) => {
        inFlightQueries.delete(key);
        observer.error(error);
      },
      complete: () => {
        inFlightQueries.delete(key);
        observer.complete();
      },
    });

    return () => subscription.unsubscribe();
  });

  inFlightQueries.set(key, promise);
  return promise;
});

// DataLoader for N+1 prevention
import DataLoader from 'dataloader';

class UserLoader {
  private loader: DataLoader<string, User>;

  constructor() {
    this.loader = new DataLoader(
      async (ids) => {
        // Batch load users
        const users = await db.users.findMany({
          where: { id: { in: ids as string[] } },
        });

        // Map to preserve order
        const userMap = new Map(users.map((u) => [u.id, u]));
        return ids.map((id) => userMap.get(id) || new Error(`User ${id} not found`));
      },
      {
        maxBatchSize: 100,
        cache: true,
        cacheKeyFn: (key) => key,
        batchScheduleFn: (callback) => setTimeout(callback, 10),
      },
    );
  }

  async load(id: string): Promise<User> {
    return this.loader.load(id);
  }

  async loadMany(ids: string[]): Promise<User[]> {
    return this.loader.loadMany(ids);
  }

  clearCache(id?: string): void {
    if (id) {
      this.loader.clear(id);
    } else {
      this.loader.clearAll();
    }
  }
}
```

## Optimistic Updates and Mutations

Make mutations feel instant with optimistic updates:

```tsx
// Optimistic mutation pattern
const ADD_COMMENT = gql`
  mutation AddComment($postId: ID!, $content: String!) {
    addComment(postId: $postId, content: $content) {
      id
      content
      createdAt
      author {
        id
        name
        avatar
      }
      post {
        id
        commentCount
      }
    }
  }
`;

function CommentForm({ postId }: { postId: string }) {
  const [content, setContent] = useState('');
  const [addComment] = useMutation(ADD_COMMENT);

  const handleSubmit = async () => {
    const optimisticComment = {
      __typename: 'Comment',
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      author: {
        __typename: 'User',
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
    };

    await addComment({
      variables: { postId, content },
      optimisticResponse: {
        addComment: optimisticComment,
      },
      update: (cache, { data }) => {
        // Update post's comment list
        cache.modify({
          id: cache.identify({ __typename: 'Post', id: postId }),
          fields: {
            comments(existingComments = []) {
              const newCommentRef = cache.writeFragment({
                data: data.addComment,
                fragment: gql`
                  fragment NewComment on Comment {
                    id
                    content
                    createdAt
                    author {
                      id
                      name
                      avatar
                    }
                  }
                `,
              });

              return [...existingComments, newCommentRef];
            },
            commentCount(existingCount) {
              return existingCount + 1;
            },
          },
        });
      },
      // Rollback on error
      onError: (error) => {
        console.error('Failed to add comment:', error);
        // Apollo automatically rolls back optimistic update
      },
    });

    setContent('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
      />
      <button type="submit">Post</button>
    </form>
  );
}

// Optimistic cache updates for complex operations
function useOptimisticFollow() {
  const [followUser] = useMutation(FOLLOW_USER);

  return useCallback(
    async (userId: string) => {
      await followUser({
        variables: { userId },
        optimisticResponse: {
          followUser: {
            __typename: 'User',
            id: userId,
            isFollowing: true,
          },
        },
        update: (cache) => {
          // Update multiple cache entries
          cache.modify({
            id: cache.identify({ __typename: 'User', id: userId }),
            fields: {
              isFollowing: () => true,
              followerCount: (existing) => existing + 1,
            },
          });

          cache.modify({
            id: cache.identify({ __typename: 'User', id: currentUser.id }),
            fields: {
              followingCount: (existing) => existing + 1,
              following: (existingRefs = [], { toReference }) => {
                const newRef = toReference({ __typename: 'User', id: userId });
                return [...existingRefs, newRef];
              },
            },
          });
        },
      });
    },
    [followUser],
  );
}
```

## Subscription Performance

Implement efficient real-time updates:

```tsx
// WebSocket subscriptions with performance considerations
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';

const wsLink = new WebSocketLink({
  uri: 'wss://api.example.com/graphql',
  options: {
    reconnect: true,
    reconnectionAttempts: 5,
    connectionParams: () => ({
      authToken: getAuthToken(),
    }),
    // Lazy connection - only connect when needed
    lazy: true,
    // Keep alive
    keepAlive: 10000,
    // Connection timeout
    timeout: 30000,
  },
});

// Smart subscription management
function useSmartSubscription<T>(subscription: DocumentNode, options?: SubscriptionOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    // Only subscribe when component is visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !subscriptionRef.current) {
          // Start subscription
          subscriptionRef.current = client
            .subscribe({
              query: subscription,
              variables: options?.variables,
            })
            .subscribe({
              next: ({ data }) => setData(data),
              error: setError,
            });
        } else if (!entry.isIntersecting && subscriptionRef.current) {
          // Pause subscription when not visible
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
      },
      { threshold: 0.1 },
    );

    const element = document.getElementById(options?.elementId || 'root');
    if (element) observer.observe(element);

    return () => {
      observer.disconnect();
      subscriptionRef.current?.unsubscribe();
    };
  }, [subscription, options]);

  return { data, error };
}

// Subscription with deduplication
const MESSAGE_SUBSCRIPTION = gql`
  subscription OnMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) {
      id
      content
      author {
        id
        name
      }
      createdAt
    }
  }
`;

function MessageList({ channelId }: { channelId: string }) {
  const { data: queryData } = useQuery(MESSAGES_QUERY, {
    variables: { channelId },
  });

  const { data: subData } = useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { channelId },
    // Prevent duplicate messages
    onSubscriptionData: ({ client, subscriptionData }) => {
      const newMessage = subscriptionData.data?.messageAdded;
      if (!newMessage) return;

      const existing = client.readQuery({
        query: MESSAGES_QUERY,
        variables: { channelId },
      });

      // Check for duplicates
      const messageExists = existing?.messages?.some((msg: any) => msg.id === newMessage.id);

      if (!messageExists) {
        client.writeQuery({
          query: MESSAGES_QUERY,
          variables: { channelId },
          data: {
            messages: [...(existing?.messages || []), newMessage],
          },
        });
      }
    },
  });

  const messages = queryData?.messages || [];

  return (
    <div>
      {messages.map((message: any) => (
        <div key={message.id}>
          <strong>{message.author.name}:</strong> {message.content}
        </div>
      ))}
    </div>
  );
}
```

## Related Topics

- **GraphQL Fundamentals**: Start with the basics in [GraphQL & React Performance](./graphql-react-performance.md)
- **Fragment Optimization**: Learn query organization with Fragment Colocation patterns
- **Bundle Optimization**: Reduce Apollo Client bundle size with selective imports
- **Performance Monitoring**: Track GraphQL performance in production
- **Real-Time Data**: For advanced subscription patterns, see [Real-Time Data Performance](./real-time-data-performance.md)

## Next Steps

Apollo Client optimization requires:

1. **Cache Strategy**: Design your cache structure before implementing queries
2. **Batching Setup**: Configure query batching for your application patterns
3. **Optimistic Updates**: Implement optimistic UI for better perceived performance
4. **Subscription Management**: Use smart subscription patterns to minimize resource usage
5. **Performance Monitoring**: Track cache hit rates and query performance

Master these Apollo Client techniques to build GraphQL applications that perform well at scale while maintaining excellent user experience.
