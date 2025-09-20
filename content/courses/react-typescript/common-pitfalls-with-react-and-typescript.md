---
title: Common Pitfalls with React and TypeScript
description: >-
  Learn about common pitfalls when using React with TypeScript and how to avoid
  them, including type safety patterns and best practices.
date: 2025-09-20T18:00:00.000Z
modified: '2025-09-20T10:40:36-06:00'
---

## Common Pitfalls and How to Avoid Them

### Pitfall #1: Using `any` as an Escape Hatch

```tsx
// ❌ Bad - defeats the purpose of TypeScript
function handleApiResponse(response: any) {
  return response.data.user.name;
}

// ✅ Good - properly typed with error handling
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

interface User {
  name: string;
  email: string;
}

function handleApiResponse(response: ApiResponse<{ user: User }>) {
  if (response.status === 'error') {
    throw new Error(response.message ?? 'API request failed');
  }
  return response.data.user.name;
}
```

### Pitfall #2: Not Handling Loading and Error States

```tsx
// ❌ Bad - assumes success
function UserComponent({ userId }: { userId: string }) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return <div>{user.name}</div>; // TypeScript error: user might be undefined
}

// ✅ Good - handles all states
function UserComponent({ userId }: { userId: string }) {
  const { data: user, isLoading, hasError, error } = useApiState(() => fetchUser(userId));

  if (isLoading) return <div>Loading...</div>;
  if (hasError) return <div>Error: {error}</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>;
}
```

### Pitfall #3: Overusing `useEffect`

React 19 makes many common `useEffect` patterns unnecessary. Instead of reaching for `useEffect`, consider:

```tsx
// ❌ Overusing useEffect for derived state
function UserProfile({ user }: { user: User }) {
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    setDisplayName(user.firstName + ' ' + user.lastName);
  }, [user.firstName, user.lastName]);

  return <div>{displayName}</div>;
}

// ✅ Just compute it directly
function UserProfile({ user }: { user: User }) {
  const displayName = `${user.firstName} ${user.lastName}`;
  return <div>{displayName}</div>;
}
```
