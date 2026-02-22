---
title: Typing Higher-Order Components Without Tears
description: >-
  Wrap components and keep their props—model HOCs with generics, Omit, and
  proper ref forwarding.
date: 2025-09-06T22:04:44.912Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - hocs
  - higher-order-components
  - composition
---

Higher-Order Components (HOCs) were React's original answer to component reusability before hooks arrived on the scene. While hooks have largely replaced HOCs for most use cases, you'll still encounter them in the wild—especially in older codebases or when integrating with libraries that haven't migrated to hooks yet. The challenge? Getting TypeScript to understand what your HOC is doing without losing your mind (or your component's prop types) in the process.

Here's the thing: HOCs are just functions that take a component and return a new component with additional behavior. The tricky part is making sure TypeScript understands which props your wrapped component receives, which ones your HOC injects, and how to properly forward refs. Let's walk through building well-typed HOCs that preserve the original component's interface while adding our enhancements.

## The Basic HOC Pattern

Before we dive into typing complexities, let's establish what we're working with. A basic HOC follows this pattern:

```ts
// ❌ Untyped version (don't do this)
const withLoading = (WrappedComponent) => {
  return (props) => {
    if (props.isLoading) {
      return <div>Loading...</div>;
    }
    return <WrappedComponent {...props} />;
  };
};
```

This works at runtime, but TypeScript has no idea what's happening. Let's fix that step by step.

## Typing Your First HOC

The key insight for typing HOCs is understanding that you're working with **generics**—your HOC should work with any component type while preserving that component's specific props. Here's our first properly typed HOC:

```ts
import { ComponentType } from 'react';

// Define props that our HOC injects
interface WithLoadingProps {
  isLoading?: boolean;
}

// Generic HOC that works with any component
function withLoading<T extends {}>(
  WrappedComponent: ComponentType<T>
): ComponentType<T & WithLoadingProps> {
  return function WithLoadingComponent(props: T & WithLoadingProps) {
    const { isLoading, ...restProps } = props;

    if (isLoading) {
      return <div>Loading...</div>;
    }

    // TypeScript knows restProps has type T
    return <WrappedComponent {...(restProps as T)} />;
  };
}
```

Let's break this down:

- **`T extends {}`**: Our generic constraint ensures `T` is an object (component props)
- **`ComponentType<T>`**: TypeScript's type for React components that accept props of type `T`
- **`T & WithLoadingProps`**: The wrapped component gets both its original props AND our injected props
- **Type assertion `as T`**: After destructuring, we assert the remaining props match the original component's expectations

## Real-World Example: Authentication HOC

Here's a more practical example—an HOC that handles authentication logic:

```ts
import { ComponentType, useContext } from 'react';
import { AuthContext } from './AuthContext';

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

// Props our HOC injects into wrapped components
interface WithAuthProps {
  user: AuthUser;
  logout: () => void;
}

// Props our HOC expects from consumers
interface AuthRequiredProps {
  fallback?: ComponentType;
}

function withAuth<T extends {}>(
  WrappedComponent: ComponentType<T & WithAuthProps>
): ComponentType<T & AuthRequiredProps> {
  return function WithAuthComponent(props: T & AuthRequiredProps) {
    const { fallback: Fallback = DefaultLoginForm, ...restProps } = props;
    const { user, logout, isAuthenticated } = useContext(AuthContext);

    if (!isAuthenticated || !user) {
      return <Fallback />;
    }

    // Inject auth props into the wrapped component
    return (
      <WrappedComponent
        {...(restProps as T)}
        user={user}
        logout={logout}
      />
    );
  };
}

const DefaultLoginForm = () => <div>Please log in</div>;

// Usage with full type safety
interface DashboardProps {
  title: string;
}

const Dashboard = ({ title, user, logout }: DashboardProps & WithAuthProps) => (
  <div>
    <h1>{title}</h1>
    <p>Welcome, {user.name}!</p>
    <button onClick={logout}>Sign Out</button>
  </div>
);

const AuthenticatedDashboard = withAuth(Dashboard);

// TypeScript knows this component expects title and optional fallback
<AuthenticatedDashboard title="My Dashboard" />
```

Notice how the wrapped `Dashboard` component gets both its original `title` prop and the injected auth props (`user`, `logout`), while consumers of `AuthenticatedDashboard` only need to provide the original props plus any HOC-specific ones.

## Handling Props You Want to Exclude

Sometimes your HOC consumes certain props and shouldn't pass them down. Use TypeScript's `Omit` utility type:

```ts
interface WithTimestampProps {
  timestamp?: number;
  showTimestamp?: boolean;
}

function withTimestamp<T extends {}>(
  WrappedComponent: ComponentType<T>
): ComponentType<T & WithTimestampProps> {
  return function WithTimestampComponent(props: T & WithTimestampProps) {
    const { timestamp = Date.now(), showTimestamp = true, ...restProps } = props;

    return (
      <div>
        {showTimestamp && (
          <small>Last updated: {new Date(timestamp).toLocaleString()}</small>
        )}
        <WrappedComponent {...(restProps as T)} />
      </div>
    );
  };
}

// Or if you want to be more explicit about which props are consumed:
function withTimestampExplicit<T extends {}>(
  WrappedComponent: ComponentType<T>
): ComponentType<T & WithTimestampProps> {
  return function WithTimestampComponent(
    props: T & WithTimestampProps
  ) {
    const { timestamp, showTimestamp, ...restProps } = props;

    // Explicitly omit the HOC props from what gets passed down
    return (
      <div>
        {/* render timestamp logic */}
        <WrappedComponent {...(restProps as Omit<T & WithTimestampProps, keyof WithTimestampProps>)} />
      </div>
    );
  };
}
```

> [!TIP]
> When your HOC consumes props that shouldn't reach the wrapped component, the destructuring approach is usually cleaner than complex `Omit` types.

## Forwarding Refs Like a Pro

Here's where things get spicy. If your wrapped component uses `forwardRef`, your HOC needs to preserve that behavior:

```ts
import { ComponentType, forwardRef, ForwardedRef } from 'react';

// HOC that preserves ref forwarding
function withErrorBoundary<T extends {}, R = any>(
  WrappedComponent: ComponentType<T & { ref?: ForwardedRef<R> }>
) {
  return forwardRef<R, T>((props: T, ref) => {
    // In a real implementation, you'd have error boundary logic here
    return <WrappedComponent {...props} ref={ref} />;
  });
}

// Usage with ref forwarding preserved
const MyInput = forwardRef<HTMLInputElement, { placeholder: string }>((props, ref) => (
  <input ref={ref} {...props} />
));

const SafeInput = withErrorBoundary(MyInput);

// This works! TypeScript knows SafeInput can receive a ref
const inputRef = useRef<HTMLInputElement>(null);
<SafeInput ref={inputRef} placeholder="Type here..." />
```

The key insight is using `forwardRef` in your HOC and ensuring the generic types line up correctly.

## `withErrorBoundary<P>` vs `useErrorBoundary()`

Wrap any component in a typed error boundary HOC, and compare DX with a hook-based approach.

```tsx
import React, { Component, ComponentType, ErrorInfo, ReactNode } from 'react';

type ErrorFallbackProps<E extends Error = Error> = {
  error: E;
  reset?: () => void;
};

type WithErrorBoundaryOptions<E extends Error = Error> = {
  Fallback?: ComponentType<ErrorFallbackProps<E>>;
  onError?: (error: E, info: ErrorInfo) => void;
};

export function withErrorBoundary<P, E extends Error = Error>(
  Wrapped: ComponentType<P>,
  options: WithErrorBoundaryOptions<E> = {},
) {
  const { Fallback, onError } = options;

  return class ErrorBoundary extends Component<P, { error?: E }> {
    static displayName = `withErrorBoundary(${Wrapped.displayName || Wrapped.name || 'Component'})`;

    static getDerivedStateFromError(error: E) {
      return { error };
    }

    componentDidCatch(error: E, info: ErrorInfo) {
      onError?.(error, info);
    }

    reset = () => this.setState({ error: undefined });

    render(): ReactNode {
      if (this.state?.error) {
        return Fallback ? <Fallback error={this.state.error} reset={this.reset} /> : null;
      }
      return <Wrapped {...(this.props as P)} />;
    }
  };
}

// Hook alternative: more composable ergonomics in function components
export function useErrorBoundary<E extends Error = Error>() {
  const [error, setError] = React.useState<E | null>(null);
  const reset = React.useCallback(() => setError(null), []);
  const capture = React.useCallback((e: E) => setError(e), []);
  return { error, capture, reset } as const;
}

// Usage comparison
const Fallback = ({ error, reset }: ErrorFallbackProps) => (
  <div role="alert">
    <pre>{error.message}</pre>
    <button onClick={reset}>Try again</button>
  </div>
);

// HOC
const SafeProfile = withErrorBoundary(Profile, { Fallback });

// Hook
function ProfileWithHook(props: ProfileProps) {
  const { error, capture, reset } = useErrorBoundary();
  if (error) return <Fallback error={error} reset={reset} />;
  return <Profile {...props} onError={capture} />;
}
```

HOC works well for class or third‑party components; the hook is more ergonomic in new function components and keeps error handling closer to the failure site.

## Advanced Pattern: Conditional Props

Sometimes you want your HOC to conditionally require certain props based on configuration:

```ts
interface BaseLoadingProps {
  isLoading?: boolean;
}

interface CustomLoadingProps extends BaseLoadingProps {
  loadingComponent: ComponentType;
}

// Overloaded function signatures for different use cases
function withConditionalLoading<T extends {}>(
  WrappedComponent: ComponentType<T>
): ComponentType<T & BaseLoadingProps>;

function withConditionalLoading<T extends {}>(
  WrappedComponent: ComponentType<T>,
  useCustomLoading: true
): ComponentType<T & CustomLoadingProps>;

function withConditionalLoading<T extends {}>(
  WrappedComponent: ComponentType<T>,
  useCustomLoading?: boolean
) {
  return function WithConditionalLoadingComponent(
    props: T & (typeof useCustomLoading extends true ? CustomLoadingProps : BaseLoadingProps)
  ) {
    const { isLoading, ...restProps } = props;

    if (isLoading) {
      if (useCustomLoading) {
        const { loadingComponent: LoadingComponent } = props as CustomLoadingProps;
        return <LoadingComponent />;
      }
      return <div>Loading...</div>;
    }

    return <WrappedComponent {...(restProps as T)} />;
  };
}

// Usage - TypeScript enforces the right props based on the overload
const BasicWrapped = withConditionalLoading(MyComponent);
// Only needs isLoading prop

const CustomWrapped = withConditionalLoading(MyComponent, true);
// Requires both isLoading AND loadingComponent props
```

## Common Pitfalls and How to Avoid Them

### The `any` Escape Hatch 👎

```ts
// ❌ Tempting but defeats the purpose
function badHOC(WrappedComponent: any): any {
  return (props: any) => <WrappedComponent {...props} />;
}

// ✅ Properly typed version
function goodHOC<T extends {}>(
  WrappedComponent: ComponentType<T>
): ComponentType<T> {
  return function HOCComponent(props: T) {
    return <WrappedComponent {...props} />;
  };
}
```

### Missing Generic Constraints

```ts
// ❌ Too permissive - T could be anything
function problematicHOC<T>(component: ComponentType<T>) {
  // TypeScript can't guarantee T has object properties
}

// ✅ Constrain T to be an object
function betterHOC<T extends {}>(component: ComponentType<T>) {
  // Now TypeScript knows T is an object type
}
```

### Incorrect Prop Spreading

```ts
// ❌ Loses type safety
function unsafeHOC<T>(WrappedComponent: ComponentType<T>) {
  return (props: any) => <WrappedComponent {...props} />;
}

// ✅ Maintains type safety through proper generics
function safeHOC<T extends {}>(WrappedComponent: ComponentType<T>) {
  return function SafeComponent(props: T) {
    return <WrappedComponent {...props} />;
  };
}
```

## When to Use HOCs vs. Hooks

> [!NOTE]
> Modern React heavily favors hooks over HOCs for most use cases. Consider HOCs when:
>
> - You need to wrap third-party components that don't support hooks
> - You're working with class components that can't use hooks
> - You need to conditionally render entirely different components
> - You're building a library that needs to work with any component type

For new code, prefer custom hooks:

```ts
// ✅ Modern approach with hooks
function useAuth() {
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  return { user, logout, isAuthenticated };
}

// Much simpler component
function Dashboard({ title }: { title: string }) {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <LoginForm />;

  return (
    <div>
      <h1>{title}</h1>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

## Wrapping Up

Typing HOCs properly requires understanding generics, component types, and prop manipulation in TypeScript. The patterns we've covered will handle most Real World Use Cases™:

- Use generics with object constraints (`T extends {}`)
- Leverage `ComponentType<T>` for component typing
- Use intersection types (`T & InjectedProps`) for prop combining
- Don't forget `forwardRef` for ref-forwarding components
- Prefer hooks over HOCs in new code

Remember, the goal is making your HOCs type-safe without sacrificing the flexibility that made them useful in the first place. When you get the types right, your HOCs become powerful, reusable tools that integrate seamlessly with the rest of your TypeScript React codebase.

Next time you encounter an HOC (or need to build one), you'll have the TypeScript knowledge to wrap it properly—no tears required.
