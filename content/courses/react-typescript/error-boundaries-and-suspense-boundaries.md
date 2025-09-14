---
title: Error Boundaries and Suspense Boundaries
description: Type error and suspense boundaries—ensure fallback components and error info props are accurately modeled.
date: 2025-09-06T22:04:44.917Z
modified: 2025-09-06T22:04:44.917Z
published: true
tags: ['react', 'typescript', 'error-boundaries', 'suspense', 'error-handling']
---

Error boundaries and Suspense boundaries are React's tools for gracefully handling the unexpected—crashes and loading states, respectively. But here's the thing: they're class components and special APIs that don't get the same TypeScript attention as your typical hooks and function components. Let's fix that by learning how to properly type these boundaries so your fallbacks and error handling are as bulletproof as the rest of your application.

Both boundaries serve as safety nets in your component tree. Error boundaries catch JavaScript errors during rendering, in lifecycle methods, and in constructors, while Suspense boundaries handle async operations by catching thrown promises and displaying loading states. Getting the types right ensures your error information is properly structured and your fallback components receive exactly the props they expect.

## Error Boundaries: Catching What Goes Wrong

Error boundaries are class components that implement either `componentDidCatch` or the static `getDerivedStateFromError` method. Since we're working with TypeScript, we need to properly type both the component's state and the error information we receive.

### Basic Error Boundary Implementation

Let's start with a properly typed error boundary that captures both the error and additional error information:

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error information
    this.setState({ errorInfo });

    // Call optional error reporting callback
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback or default error message
      return this.props.fallback ? (
        this.props.fallback(this.state.error, this.state.errorInfo!)
      ) : (
        <div>Something went wrong.</div>
      );
    }

    return this.props.children;
  }
}
```

Notice how we're properly typing the `ErrorInfo` object from React, which contains valuable debugging information like the component stack trace. The fallback prop is a function that receives both the error and error info, giving you full control over how to display error details.

### Typed Fallback Components

Your fallback components should be properly typed to receive the error information they need:

```tsx
interface ErrorFallbackProps {
  error: Error;
  errorInfo?: ErrorInfo;
  resetErrorBoundary?: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, errorInfo, resetErrorBoundary }) => (
  <div className="error-boundary">
    <h2>Oops! Something went wrong</h2>
    <p>{error.message}</p>

    {process.env.NODE_ENV === 'development' && errorInfo && (
      <details>
        <summary>Error Details (Dev Only)</summary>
        <pre>{errorInfo.componentStack}</pre>
      </details>
    )}

    {resetErrorBoundary && <button onClick={resetErrorBoundary}>Try Again</button>}
  </div>
);
```

### Enhanced Error Boundary with Reset Capability

Real-world error boundaries often need the ability to reset their state. Here's how to implement that with proper TypeScript support:

```tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1,
      });
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { maxRetries = 3, fallback: FallbackComponent } = this.props;

    if (hasError && error) {
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          resetErrorBoundary={retryCount < maxRetries ? this.resetErrorBoundary : undefined}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      );
    }

    return this.props.children;
  }
}
```

> [!TIP]
> Use generics when your error boundaries need to handle specific error types. For example, `ErrorBoundary<ApiError>` could provide typed access to API-specific error properties.

## Suspense Boundaries: Handling Async Gracefully

Suspense boundaries are much simpler to type since they're built-in React components, but the fallback prop and error handling still need proper typing:

```tsx
import { Suspense, ReactNode } from 'react';

interface LoadingFallbackProps {
  message?: string;
  progress?: number;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ message = 'Loading...', progress }) => (
  <div className="loading-boundary">
    <div className="spinner" />
    <p>{message}</p>
    {progress !== undefined && (
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);

interface AsyncWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingMessage?: string;
}

const AsyncWrapper: React.FC<AsyncWrapperProps> = ({ children, fallback, loadingMessage }) => (
  <Suspense fallback={fallback || <LoadingFallback message={loadingMessage} />}>
    {children}
  </Suspense>
);
```

### Combining Error and Suspense Boundaries

In practice, you'll often want both error and suspense handling. Here's a typed wrapper that handles both concerns:

```tsx
interface BoundaryWrapperProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

const BoundaryWrapper: React.FC<BoundaryWrapperProps> = ({
  children,
  loadingFallback = <LoadingFallback />,
  errorFallback = ErrorFallback,
  onError,
}) => (
  <ErrorBoundary fallback={errorFallback} onError={onError}>
    <Suspense fallback={loadingFallback}>{children}</Suspense>
  </ErrorBoundary>
);

// Usage with proper type safety
<BoundaryWrapper
  loadingFallback={<LoadingFallback message="Loading user data..." />}
  errorFallback={UserErrorFallback}
  onError={(error, errorInfo) => {
    // TypeScript knows exactly what error and errorInfo contain
    analytics.track('error_boundary_triggered', {
      error: error.message,
      stack: errorInfo.componentStack,
    });
  }}
>
  <UserProfile userId={userId} />
</BoundaryWrapper>;
```

## Real-World Patterns

### Route-Level Boundaries

When building applications with routing, you'll want boundaries at the route level to prevent navigation errors from crashing the entire app:

```tsx
interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName: string;
}

const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({ children, routeName }) => (
  <ErrorBoundary
    fallback={(error, errorInfo) => (
      <RouteFallback error={error} errorInfo={errorInfo} routeName={routeName} />
    )}
    onError={(error, errorInfo) => {
      logError(`Route ${routeName} error:`, error, errorInfo);
    }}
  >
    <Suspense fallback={<RouteLoadingSpinner />}>{children}</Suspense>
  </ErrorBoundary>
);

interface RouteFallbackProps extends ErrorFallbackProps {
  routeName: string;
}

const RouteFallback: React.FC<RouteFallbackProps> = ({ error, routeName }) => (
  <div className="route-error">
    <h1>Page Unavailable</h1>
    <p>The {routeName} page encountered an error:</p>
    <code>{error.message}</code>
    <button onClick={() => window.location.reload()}>Refresh Page</button>
  </div>
);
```

### Context-Aware Error Boundaries

Sometimes you need error boundaries that understand their context and can provide more specific error handling:

```tsx
interface ContextualErrorBoundaryProps {
  children: ReactNode;
  context: string;
  criticalErrors?: string[]; // Error types that should bubble up
}

class ContextualErrorBoundary extends Component<ContextualErrorBoundaryProps, ErrorBoundaryState> {
  // ... basic error boundary implementation

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { criticalErrors = [], context } = this.props;

    // If this is a critical error type, re-throw to bubble up
    if (criticalErrors.some((criticalError) => error.message.includes(criticalError))) {
      throw error;
    }

    // Otherwise, handle locally
    this.setState({ errorInfo });

    logError(`${context} boundary caught error:`, error, errorInfo);
  }

  // ... rest of implementation
}

// Usage
<ContextualErrorBoundary
  context="UserDashboard"
  criticalErrors={['AuthenticationError', 'NetworkError']}
>
  <UserDashboard />
</ContextualErrorBoundary>;
```

## Error Information Types

TypeScript's `ErrorInfo` interface provides structured information about where errors occurred. Here's how to leverage it properly:

```tsx
import { ErrorInfo } from 'react';

// ErrorInfo contains:
// - componentStack: string (component hierarchy where error occurred)
// - errorBoundary?: Component (the boundary that caught the error)
// - errorBoundaryStack?: string (stack trace of the boundary)

const logDetailedError = (error: Error, errorInfo: ErrorInfo) => {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Send to your error reporting service
  errorReportingService.report(errorReport);
};
```

## Common Pitfalls and Solutions

### Don't Catch Everything

Error boundaries only catch errors in the component tree below them. They don't catch:

- Errors in event handlers
- Errors in async code
- Errors during server-side rendering
- Errors in the error boundary itself

```tsx
// ❌ This won't be caught by error boundaries
const BadComponent = () => {
  const handleClick = () => {
    throw new Error('Event handler error');
  };

  return <button onClick={handleClick}>Click me</button>;
};

// ✅ Wrap async operations properly
const GoodAsyncComponent = () => {
  const [error, setError] = useState<Error | null>(null);

  const handleAsyncOperation = async () => {
    try {
      await riskyAsyncOperation();
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  if (error) throw error; // Now the error boundary can catch it

  return <button onClick={handleAsyncOperation}>Safe Async</button>;
};
```

### Type-Safe Error Reporting

When integrating with error reporting services, ensure your error data is properly typed:

```tsx
interface ErrorReport {
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  errorInfo: {
    componentStack: string;
  };
  metadata: {
    userId?: string;
    route: string;
    timestamp: string;
  };
}

const reportError = (
  error: Error,
  errorInfo: ErrorInfo,
  metadata: Omit<ErrorReport['metadata'], 'timestamp'>,
): void => {
  const report: ErrorReport = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    errorInfo: {
      componentStack: errorInfo.componentStack,
    },
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };

  errorReportingService.send(report);
};
```

## Next Steps

Error boundaries and Suspense boundaries are essential for building resilient React applications. With proper TypeScript integration, you can ensure that your error handling is as robust as your main application logic. The key is to:

1. **Type your error information** comprehensively so debugging is straightforward
2. **Create reusable boundary components** that can be composed throughout your app
3. **Handle different error contexts** appropriately rather than using a one-size-fits-all approach
4. **Integrate with monitoring services** to track errors in production

Your error boundaries become documentation for how your app handles failure, and proper typing makes that documentation executable and verifiable. That's a pretty solid foundation for shipping reliable software.
