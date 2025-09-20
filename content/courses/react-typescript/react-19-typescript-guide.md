---
title: Complete Guide to React 19 with TypeScript
description: >-
  Master React 19's new features with TypeScript—server components, actions,
  concurrent features, and modern patterns for production applications.
date: 2025-09-20T18:00:00.000Z
modified: '2025-09-20T21:24:31.866Z'
published: true
tags:
  - react-19
  - typescript
  - server-components
  - actions
  - concurrent-features
---

React 19 brings significant improvements to TypeScript integration, making the developer experience cleaner and more intuitive. This guide covers everything from basic type improvements to advanced patterns with server components and concurrent features.

## Core TypeScript Improvements in React 19

### Cleaner Component Type Definitions

React 19 simplifies component typing by embracing modern patterns:

```typescript
// ✅ React 19: Cleaner function component typing
function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// ✅ Still works, but no longer necessary in most cases
const UserCard: React.FC<{ user: User }> = ({ user }) => {
  return <div>{user.name}</div>;
};
```

### Improved Ref Handling

React 19's ref system aligns better with TypeScript's expectations:

```typescript
// ✅ React 19: Refs are more intuitive
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus(); // TypeScript knows this might be null
  };

  return <input ref={inputRef} type="text" />;
}

// ✅ Cleaner forwardRef typing
const FancyInput = forwardRef<HTMLInputElement, { placeholder: string }>(
  ({ placeholder }, ref) => {
    return <input ref={ref} placeholder={placeholder} />;
  }
);
```

## Server Components and Actions

### Typing Server Components

Server Components run on the server and can directly access backend resources:

```typescript
// app/components/UserList.tsx
interface User {
  id: string;
  name: string;
  email: string;
}

// Server Component (no 'use client' directive)
async function UserList() {
  // Direct database access in server components
  const users = await db.user.findMany();

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
}

// Props for server components
interface ServerPageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

async function UserPage({ params, searchParams }: ServerPageProps) {
  const user = await db.user.findUnique({
    where: { id: params.id },
  });

  return <UserProfile user={user} />;
}
```

### Server Actions with Type Safety

Server actions enable form handling and mutations with full type safety:

```typescript
// app/actions/user.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Define schema for validation
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
});

export async function createUser(formData: FormData) {
  // Extract and validate data
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
  };

  const validatedData = CreateUserSchema.parse(rawData);

  try {
    // Perform database operation
    const user = await db.user.create({
      data: validatedData,
    });

    // Revalidate the users page
    revalidatePath('/users');

    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Type-safe action with return type
export async function updateUser(
  id: string,
  data: Partial<z.infer<typeof CreateUserSchema>>,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.user.update({
      where: { id },
      data,
    });
    revalidatePath(`/users/${id}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Client Components Using Server Actions

```typescript
'use client';

import { useState, useTransition } from 'react';
import { createUser } from '@/app/actions/user';

export function CreateUserForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createUser(formData);

      if (!result.success) {
        setError(result.error || 'Failed to create user');
      } else {
        // Handle success (maybe redirect or show success message)
        setError(null);
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <input
        name="name"
        type="text"
        required
        disabled={isPending}
      />
      <input
        name="email"
        type="email"
        required
        disabled={isPending}
      />
      <select name="role" required disabled={isPending}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

## The `use` Hook and Suspense

React 19's `use` hook enables cleaner async data handling:

```typescript
// Types for the use hook
interface UserData {
  id: string;
  name: string;
  posts: Post[];
}

// Create a promise for use hook
function fetchUser(id: string): Promise<UserData> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}

// Component using the use hook
function UserProfile({ userPromise }: { userPromise: Promise<UserData> }) {
  // use hook unwraps the promise
  const user = use(userPromise);

  return (
    <div>
      <h1>{user.name}</h1>
      <ul>
        {user.posts.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}

// Parent component with Suspense
function UserPage({ userId }: { userId: string }) {
  const userPromise = useMemo(
    () => fetchUser(userId),
    [userId]
  );

  return (
    <Suspense fallback={<UserSkeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

## Form Handling with useActionState

React 19 introduces `useActionState` for form state management:

```typescript
import { useActionState } from 'react';

// Define the state shape
interface FormState {
  message?: string;
  errors?: {
    name?: string;
    email?: string;
  };
}

// Server action with form state
async function submitForm(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  'use server';

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  // Validation
  const errors: FormState['errors'] = {};
  if (!name) errors.name = 'Name is required';
  if (!email) errors.email = 'Email is required';

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // Process the form
  try {
    await saveToDatabase({ name, email });
    return { message: 'Success!' };
  } catch (error) {
    return { message: 'Failed to submit form' };
  }
}

// Component using useActionState
function ContactForm() {
  const [state, formAction] = useActionState(submitForm, {});

  return (
    <form action={formAction}>
      <div>
        <input name="name" type="text" />
        {state.errors?.name && (
          <span className="error">{state.errors.name}</span>
        )}
      </div>

      <div>
        <input name="email" type="email" />
        {state.errors?.email && (
          <span className="error">{state.errors.email}</span>
        )}
      </div>

      <button type="submit">Submit</button>

      {state.message && (
        <p className="message">{state.message}</p>
      )}
    </form>
  );
}
```

## Optimistic Updates with useOptimistic

React 19's `useOptimistic` hook provides type-safe optimistic updates:

```typescript
import { useOptimistic } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => Promise<void>;
}

function TodoList({ todos, onToggle }: TodoListProps) {
  const [optimisticTodos, addOptimisticUpdate] = useOptimistic(
    todos,
    (currentTodos, { id, completed }: { id: string; completed: boolean }) => {
      return currentTodos.map(todo =>
        todo.id === id ? { ...todo, completed } : todo
      );
    }
  );

  async function handleToggle(id: string, currentState: boolean) {
    // Optimistically update the UI
    addOptimisticUpdate({ id, completed: !currentState });

    // Perform the actual update
    try {
      await onToggle(id);
    } catch (error) {
      // The UI will automatically revert if the promise rejects
      console.error('Failed to toggle todo:', error);
    }
  }

  return (
    <ul>
      {optimisticTodos.map(todo => (
        <li key={todo.id}>
          <label>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id, todo.completed)}
            />
            {todo.text}
          </label>
        </li>
      ))}
    </ul>
  );
}
```

## Concurrent Features Typing

### useTransition for Non-Blocking Updates

```typescript
import { useState, useTransition } from 'react';

interface SearchResultsProps {
  query: string;
}

function SearchResults({ query }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(searchTerm: string) {
    // Mark update as non-urgent
    startTransition(() => {
      // This state update won't block user input
      const filtered = performExpensiveSearch(searchTerm);
      setResults(filtered);
    });
  }

  return (
    <div>
      <input
        type="text"
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />

      {isPending && <div className="spinner">Searching...</div>}

      <ul style={{ opacity: isPending ? 0.5 : 1 }}>
        {results.map(result => (
          <li key={result.id}>{result.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useDeferredValue for Performance

```typescript
import { useDeferredValue, useMemo } from 'react';

interface FilteredListProps {
  items: string[];
  filter: string;
}

function FilteredList({ items, filter }: FilteredListProps) {
  // Defer updates to this value
  const deferredFilter = useDeferredValue(filter);

  // Expensive filtering only runs when deferred value updates
  const filteredItems = useMemo(
    () => items.filter(item =>
      item.toLowerCase().includes(deferredFilter.toLowerCase())
    ),
    [items, deferredFilter]
  );

  const isStale = filter !== deferredFilter;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      {filteredItems.map(item => (
        <div key={item}>{item}</div>
      ))}
    </div>
  );
}
```

## TypeScript Configuration for React 19

### Recommended tsconfig.json

```json
{
  "compilerOptions": {
    // Modern output
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",

    // React 19 settings
    "jsx": "react-jsx",
    "allowJs": false,
    "skipLibCheck": true,

    // Strict type checking
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Module resolution
    "baseUrl": ".",
    "paths": {
      "@/*": ["./app/*"],
      "@components/*": ["./app/components/*"],
      "@lib/*": ["./app/lib/*"]
    },

    // Output
    "noEmit": true,
    "incremental": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["app/**/*.ts", "app/**/*.tsx", "next-env.d.ts"],
  "exclude": ["node_modules", ".next", "out"]
}
```

## Advanced Patterns

### Async Server Components with Error Boundaries

```typescript
// Error boundary for async components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AsyncErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Async server component
async function DataComponent({ id }: { id: string }) {
  const data = await fetchData(id);

  if (!data) {
    throw new Error('Data not found');
  }

  return <DataDisplay data={data} />;
}

// Usage with error boundary
function Page({ id }: { id: string }) {
  return (
    <AsyncErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<Loading />}>
        <DataComponent id={id} />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
```

### Streaming SSR with TypeScript

```typescript
// Types for streaming data
interface StreamedData<T> {
  initial: Partial<T>;
  promise: Promise<T>;
}

// Component that handles streamed data
function StreamedContent<T>({
  streamedData
}: {
  streamedData: StreamedData<T>
}) {
  // Initial render with partial data
  if (!streamedData.promise) {
    return <PartialContent data={streamedData.initial} />;
  }

  // Full render after streaming completes
  const fullData = use(streamedData.promise);
  return <FullContent data={fullData} />;
}
```

## Best Practices

### 1. Type Server Actions Properly

```typescript
// ✅ Good: Explicit return types for server actions
async function deleteUser(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  'use server';
  // Implementation
}

// ❌ Bad: No return type
async function deleteUser(id: string) {
  'use server';
  // Implementation
}
```

### 2. Validate at Runtime

```typescript
// ✅ Good: Runtime validation for server actions
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function login(formData: FormData) {
  'use server';

  const result = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!result.success) {
    return { error: result.error.flatten() };
  }

  // Process validated data
}
```

### 3. Handle Loading and Error States

```typescript
// ✅ Good: Complete state handling
function DataComponent() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, startTransition] = useTransition();

  // Handle all states in UI
  if (error) return <ErrorDisplay error={error} />;
  if (isPending) return <LoadingSpinner />;
  if (!data) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

## Common Pitfalls

### Server vs Client Component Boundaries

```typescript
// ❌ Bad: Passing functions to server components
async function ServerComponent({ onClick }: { onClick: () => void }) {
  // This won't work - functions can't be serialized
}

// ✅ Good: Keep interactive props in client components
('use client');
function ClientComponent({ onClick }: { onClick: () => void }) {
  // Functions work in client components
}
```

### Form Action Types

```typescript
// ❌ Bad: Wrong formData type
async function action(data: object) {
  'use server';
  // data is FormData, not a plain object
}

// ✅ Good: Correct FormData type
async function action(formData: FormData) {
  'use server';
  // Properly typed
}
```

## Related Topics

- **[Server Components Types](react-server-components-types.md)** - Deep dive into RSC typing
- **[Form Actions and useActionState](forms-actions-and-useactionstate.md)** - Form handling patterns
- **[Concurrent Features](concurrent-features-typing-patterns.md)** - Advanced concurrent patterns
- **[TSConfig for React 19](tsconfig-for-react-19.md)** - Configuration details

## Next Steps

Now that you understand React 19's TypeScript features:

- Explore **[React Compiler Integration](react-compiler-typescript-integration.md)**
- Learn about **[Streaming SSR](streaming-ssr-typescript.md)**
- Master **[Error Boundaries and Suspense](error-boundaries-and-suspense-boundaries.md)**
