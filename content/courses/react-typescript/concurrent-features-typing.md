---
title: Typing Concurrent Features: Transitions and Deferrals
description: Type useTransition, startTransition, and useDeferredValue—model pending UI and deferred derived data.
date: 2025-09-06T22:04:44.921Z
modified: 2025-09-06T22:04:44.921Z
published: true
tags: ['react', 'typescript', 'concurrent-features', 'transitions', 'deferred-value', 'performance']
---

React's concurrent features—`useTransition`, `startTransition`, and `useDeferredValue`—let you mark updates as "non-urgent" to keep your UI responsive during expensive operations. When you're working with TypeScript, these hooks introduce some interesting typing patterns, especially around managing pending states and deferred derived data. Let's explore how to type these features correctly so you can build smooth, performant interfaces without sacrificing type safety.

## Understanding React's Concurrent Primitives

Before diving into the TypeScript specifics, let's quickly review what these hooks actually do:

- **`useTransition`** marks state updates as non-urgent, letting React interrupt them for higher-priority work
- **`startTransition`** is the standalone version that doesn't return pending state
- **`useDeferredValue`** defers a value until more urgent updates have finished

The key insight is that these aren't just performance optimizations—they change your component's temporal behavior, and TypeScript helps you model that complexity correctly.

## Typing `useTransition`

The `useTransition` hook returns a tuple with a boolean indicating whether a transition is pending, and a function to start transitions:

```ts
import { useTransition } from 'react';

function SearchResults() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = (newQuery: string) => {
    // ✅ Immediate update - keeps input responsive
    setQuery(newQuery);

    // ✅ Transition - expensive filtering can be interrupted
    startTransition(() => {
      const filtered = performExpensiveSearch(newQuery);
      setResults(filtered);
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {isPending && <div>Searching...</div>}
      <ResultsList results={results} />
    </div>
  );
}

type SearchResult = {
  id: string;
  title: string;
  content: string;
};
```

The types here are straightforward—`isPending` is always a `boolean`, and `startTransition` takes a function that returns `void`. But the interesting part is modeling what happens during transitions.

## Modeling Pending States with Discriminated Unions

When you have multiple async operations that can be pending, discriminated unions help you model exactly which operation is running:

```ts
type SearchState =
  | { status: 'idle'; results: SearchResult[] }
  | { status: 'searching'; results: SearchResult[]; query: string }
  | { status: 'error'; results: SearchResult[]; error: string };

function useSearchWithTransitions(initialResults: SearchResult[] = []) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<SearchState>({
    status: 'idle',
    results: initialResults,
  });

  const search = (query: string) => {
    startTransition(() => {
      setState({ status: 'searching', results: state.results, query });

      try {
        const newResults = performExpensiveSearch(query);
        setState({ status: 'idle', results: newResults });
      } catch (error) {
        setState({
          status: 'error',
          results: state.results,
          error: error instanceof Error ? error.message : 'Search failed',
        });
      }
    });
  };

  return { state, search, isPending };
}
```

This pattern gives you precise control over what data is available in each state, and TypeScript enforces that you handle all the cases correctly.

## Advanced Transition Patterns: Generic State Management

For more complex scenarios, you can create reusable transition patterns with generics:

```ts
type AsyncState<TData, TError = Error> =
  | { status: 'idle'; data: TData }
  | { status: 'pending'; data: TData }
  | { status: 'success'; data: TData }
  | { status: 'error'; data: TData; error: TError };

function useTransitionState<TData, TError = Error>(
  initialData: TData
) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<AsyncState<TData, TError>>({
    status: 'idle',
    data: initialData
  });

  const execute = async (operation: () => Promise<TData> | TData) => {
    startTransition(async () => {
      setState(prev => ({ ...prev, status: 'pending' }));

      try {
        const result = await operation();
        setState({ status: 'success', data: result });
      } catch (error) {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error as TError
        }));
      }
    });
  };

  return { state, execute, isPending };
}

// Usage with proper typing
function ProductList() {
  const { state, execute } = useTransitionState<Product[]>([]);

  const loadProducts = () => execute(() => fetchProducts());

  // TypeScript knows state.data is Product[] in all cases
  return (
    <div>
      {state.status === 'pending' && <div>Loading...</div>}
      {state.status === 'error' && <div>Error: {state.error.message}</div>}
      <div>
        {state.data.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

## Typing `useDeferredValue`

`useDeferredValue` is simpler to type but introduces temporal complexity—the deferred value might lag behind the actual value:

```ts
import { useDeferredValue, useMemo } from 'react';

interface FilterProps {
  items: Product[];
  query: string;
}

function ExpensiveFilteredList({ items, query }: FilterProps) {
  // ✅ deferredQuery has the same type as query (string)
  const deferredQuery = useDeferredValue(query);

  // Expensive computation only runs when deferredQuery changes
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [items, deferredQuery]);

  // Show visual feedback when values are out of sync
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      {filteredItems.map(item => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  );
}
```

The key insight is that `useDeferredValue` preserves the type of its input—if you pass a `string`, you get a `string` back. But the _value_ might be stale.

## Combining Transitions and Deferred Values

Here's where things get interesting. You can combine both patterns for sophisticated UX:

```ts
interface SearchResults {
  items: Product[];
  totalCount: number;
  facets: SearchFacets;
}

function useAdvancedSearch() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    items: [],
    totalCount: 0,
    facets: {},
  });

  // Defer the expensive search operation
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!deferredQuery) {
      setResults({ items: [], totalCount: 0, facets: {} });
      return;
    }

    startTransition(async () => {
      try {
        const searchResults = await performAdvancedSearch(deferredQuery);
        setResults(searchResults);
      } catch (error) {
        // Handle error appropriately
        console.error('Search failed:', error);
      }
    });
  }, [deferredQuery]);

  // Type-safe helper to determine UI state
  const searchState = useMemo(() => {
    const isStale = query !== deferredQuery;
    const hasResults = results.items.length > 0;

    return {
      isSearching: isPending,
      isStale,
      hasResults,
      showSpinner: isPending && !hasResults,
      showStaleOverlay: isStale && hasResults,
    } as const; // ✅ Ensures literal types
  }, [isPending, query, deferredQuery, results.items.length]);

  return {
    query,
    setQuery,
    results,
    searchState,
  };
}
```

The `as const` assertion ensures TypeScript treats boolean flags as literal types rather than generic booleans, giving you better autocomplete and type checking.

## Error Handling with Transitions

React 18's concurrent features need careful error boundary integration. Here's a typed approach:

```ts
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class TransitionErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log to your error reporting service
    console.error('Transition error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert">
          <h2>Something went wrong during a background update</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage with transition-heavy components
function App() {
  return (
    <TransitionErrorBoundary>
      <SearchWithTransitions />
      <FilteredProductList />
    </TransitionErrorBoundary>
  );
}
```

## Real-World Use Case™: Typed Search with Debouncing

Here's a production-ready pattern that combines all these concepts:

```ts
interface SearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

function useTypedSearch<TItem>(
  searchFn: (query: string) => Promise<TItem[]>,
  options: SearchOptions = {}
) {
  const { debounceMs = 300, minQueryLength = 2 } = options;
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TItem[]>([]);

  const deferredQuery = useDeferredValue(query);
  const debouncedQuery = useDebounce(deferredQuery, debounceMs);

  useEffect(() => {
    if (debouncedQuery.length < minQueryLength) {
      setResults([]);
      return;
    }

    startTransition(async () => {
      try {
        const searchResults = await searchFn(debouncedQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      }
    });
  }, [debouncedQuery, searchFn, minQueryLength]);

  const searchStatus = useMemo(() => ({
    isSearching: isPending,
    isStale: query !== debouncedQuery,
    hasResults: results.length > 0,
    isEmpty: query.length >= minQueryLength && results.length === 0 && !isPending
  }), [isPending, query, debouncedQuery, results.length, minQueryLength]);

  return {
    query,
    setQuery,
    results,
    searchStatus
  };
}

// Custom debounce hook for completeness
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function ProductSearch() {
  const { query, setQuery, results, searchStatus } = useTypedSearch(
    searchProducts,
    { debounceMs: 400, minQueryLength: 3 }
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />

      {searchStatus.isSearching && <div>Searching...</div>}
      {searchStatus.isEmpty && <div>No results found</div>}

      <div style={{ opacity: searchStatus.isStale ? 0.7 : 1 }}>
        {results.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

## Performance Tips and Gotchas

A few important considerations when typing concurrent features:

> [!WARNING]
> **Stale Closures**: Be careful with event handlers inside transitions. They might capture stale values. Always use the functional form of state updates when possible.

```ts
// ❌ Potential stale closure
const handleClick = () => {
  startTransition(() => {
    setCount(count + 1); // Might use stale count
  });
};

// ✅ Always fresh
const handleClick = () => {
  startTransition(() => {
    setCount((prev) => prev + 1);
  });
};
```

> [!TIP]
> **Type Your Loading States**: Use discriminated unions to model exactly what's loading, not just generic boolean flags.

```ts
// ❌ Ambiguous
const [isLoading, setIsLoading] = useState(false);

// ✅ Specific
type LoadingState =
  | { type: 'idle' }
  | { type: 'searching'; query: string }
  | { type: 'filtering'; facet: string };
```

## What's Next

React's concurrent features unlock smooth, responsive UIs when typed correctly. The key patterns are:

1. Use discriminated unions to model temporal states precisely
2. Combine `useTransition` with `useDeferredValue` for layered responsiveness
3. Type your loading and error states explicitly
4. Wrap transition-heavy components in appropriate error boundaries

These patterns scale well as your app grows—you can build reusable hooks that encapsulate the complexity while maintaining full type safety. The investment in proper typing pays off when you can refactor confidently, knowing TypeScript will catch any temporal logic errors.

Next up, we'll explore how to type React's new server components and streaming patterns, where concurrent features become even more powerful.
