---
title: useDeferredValue Patterns
description: >-
  Keep typing fluid by deferring expensive derived values. Pair with transitions
  and memoization for silky search UIs.
date: 2025-09-06T22:26:45.103Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - performance
  - hooks
  - concurrent
---

You've built a search component that filters a massive list of products. Your users start typing "iPhone" and immediately notice the input field feels sluggish—each keystroke seems to hang for a split second. The UI thread is getting hammered by expensive operations triggered on every character change, making your otherwise snappy interface feel clunky.

Enter `useDeferredValue`—React's elegant solution for keeping high-priority updates (like user input) responsive while allowing lower-priority updates (like expensive computations) to happen when the browser has spare cycles. Think of it as your UI's way of saying "handle the urgent stuff first, deal with the heavy lifting when we have time."

Unlike debouncing, which delays updates by a fixed amount of time, `useDeferredValue` is adaptive—it defers updates only when React is busy with more important work. When your app is idle, deferred values update immediately. When React is swamped, they gracefully step aside.

## The Basic Pattern

Let's start with a simple example that demonstrates the core concept:

```tsx
import { useDeferredValue, useState, useMemo } from 'react';

function SearchResults({ query }: { query: string }) {
  // Defer the expensive computation
  const deferredQuery = useDeferredValue(query);

  // Only recompute when the deferred value changes
  const results = useMemo(() => {
    return searchExpensiveDatabase(deferredQuery);
  }, [deferredQuery]);

  return (
    <div>
      {results.map((result) => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}

function App() {
  const [query, setQuery] = useState('');

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <SearchResults query={query} />
    </div>
  );
}
```

Here's what happens: When you type rapidly, `query` updates immediately (keeping the input responsive), but `deferredQuery` only updates when React determines it's safe to do so without blocking more urgent updates. The expensive search computation gets the deferred value, so it doesn't interfere with typing.

> [!TIP]
> Always pair `useDeferredValue` with `useMemo` or `useCallback`—otherwise, your components will still re-render on every change, defeating the purpose.

## Real-World Search Interface

Let's build a more complete search interface that demonstrates several patterns working together:

```tsx
import { useDeferredValue, useState, useMemo, useTransition, Suspense } from 'react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

function ProductSearch() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [isPending, startTransition] = useTransition();

  // Defer the expensive filtering operation
  const deferredQuery = useDeferredValue(query);
  const deferredCategory = useDeferredValue(category);

  const filteredProducts = useMemo(() => {
    if (!deferredQuery && deferredCategory === 'all') {
      return products; // Return all products if no filters
    }

    return products.filter((product) => {
      const matchesQuery =
        deferredQuery === '' ||
        product.name.toLowerCase().includes(deferredQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(deferredQuery.toLowerCase());

      const matchesCategory = deferredCategory === 'all' || product.category === deferredCategory;

      return matchesQuery && matchesCategory;
    });
  }, [deferredQuery, deferredCategory]);

  const handleCategoryChange = (newCategory: string) => {
    startTransition(() => {
      setCategory(newCategory);
    });
  };

  return (
    <div className="product-search">
      <div className="search-controls">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="search-input"
        />

        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="category-filter"
        >
          <option value="all">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
        </select>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ProductList products={filteredProducts} isStale={isPending || query !== deferredQuery} />
      </Suspense>
    </div>
  );
}

function ProductList({ products, isStale }: { products: Product[]; isStale: boolean }) {
  return (
    <div className={`product-list ${isStale ? 'stale' : ''}`}>
      {products.map((product) => (
        <div key={product.id} className="product-card">
          <h3>{product.name}</h3>
          <p className="category">{product.category}</p>
          <p className="price">${product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

This example combines several powerful patterns:

- **Deferred values** for both search query and category filter
- **Transitions** for category changes (since they're typically less urgent than typing)
- **Visual feedback** when results are stale (notice the `isStale` prop)
- **Memoized computation** to prevent unnecessary filtering

## Advanced Pattern: Cascading Deferrals

Sometimes you have multiple levels of expensive computation. Here's a pattern for handling cascading deferrals:

```tsx
function DataDashboard() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState<FilterOptions>({});

  // First level: defer the raw data fetching
  const deferredDateRange = useDeferredValue(dateRange);

  const rawData = useMemo(() => {
    return fetchAnalyticsData(deferredDateRange);
  }, [deferredDateRange]);

  // Second level: defer the filtering of that data
  const deferredFilters = useDeferredValue(filters);

  const filteredData = useMemo(() => {
    return applyFilters(rawData, deferredFilters);
  }, [rawData, deferredFilters]);

  // Third level: defer the expensive chart calculations
  const chartData = useMemo(() => {
    return generateChartData(filteredData);
  }, [filteredData]);

  return (
    <div>
      <DateRangePicker value={dateRange} onChange={setDateRange} />
      <FilterControls value={filters} onChange={setFilters} />
      <ExpensiveChart data={chartData} />
    </div>
  );
}
```

Each level of deferral protects the more urgent updates above it. Date range changes won't block filter updates, and filter changes won't block the chart rendering.

## Handling Loading States

One challenge with `useDeferredValue` is managing loading states. Here's a clean pattern for showing users when results are stale:

```tsx
function SearchWithLoadingState() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    // Simulate expensive search
    return performExpensiveSearch(deferredQuery);
  }, [deferredQuery]);

  // Key insight: results are "stale" when the current query
  // doesn't match the deferred query
  const isStale = query !== deferredQuery;

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />

      <div className="results-container">
        {isStale && <div className="loading-overlay">Searching...</div>}
        <div className={isStale ? 'results stale' : 'results'}>
          {results.map((result) => (
            <div key={result.id}>{result.title}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

The `isStale` check is your friend—it tells you when the UI is showing outdated results while new ones are being computed.

## When NOT to Use `useDeferredValue`

Not every expensive operation benefits from `useDeferredValue`. Here are some cases where it's not the right tool:

```tsx
// ❌ Don't defer critical user feedback
function LoginForm() {
  const [email, setEmail] = useState('');
  const deferredEmail = useDeferredValue(email); // Bad idea!

  const validationErrors = useMemo(() => {
    return validateEmail(deferredEmail);
  }, [deferredEmail]);

  // User expects immediate validation feedback
  return (
    <div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      {validationErrors.map((error) => (
        <div key={error}>{error}</div>
      ))}
    </div>
  );
}

// ❌ Don't defer simple computations
function SimpleCounter() {
  const [count, setCount] = useState(0);
  const deferredCount = useDeferredValue(count); // Unnecessary overhead

  return <div>Count: {deferredCount}</div>;
}

// ✅ DO use it for expensive, non-critical updates
function AnalyticsDashboard() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const expensiveStats = useMemo(() => {
    return calculateComplexAnalytics(deferredQuery);
  }, [deferredQuery]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ComplexChart data={expensiveStats} />
    </div>
  );
}
```

## Combining with Concurrent Features

`useDeferredValue` works beautifully with React's other concurrent features:

```tsx
function ModernSearchApp() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    return searchDatabase(deferredQuery);
  }, [deferredQuery]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery); // High priority - updates immediately

    // Low priority updates can be wrapped in transitions
    startTransition(() => {
      updateRecentSearches(newQuery);
      logSearchAnalytics(newQuery);
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Search..."
      />

      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults results={results} isLoading={isPending || query !== deferredQuery} />
      </Suspense>
    </div>
  );
}
```

## Performance Tips

Here are some practical tips for getting the most out of `useDeferredValue`:

### Measure Before Optimizing

```tsx
// Use React DevTools Profiler to identify actual bottlenecks
function ExpensiveComponent({ data }: { data: string }) {
  const deferredData = useDeferredValue(data);

  const result = useMemo(() => {
    console.time('expensive-computation');
    const result = doExpensiveWork(deferredData);
    console.timeEnd('expensive-computation');
    return result;
  }, [deferredData]);

  return <div>{result}</div>;
}
```

### Granular Deferrals

Sometimes it's better to defer specific parts rather than entire objects:

```tsx
// ❌ Defers the entire filter object
const deferredFilters = useDeferredValue(filters);

// ✅ Defer only the expensive parts
const deferredSearchTerm = useDeferredValue(filters.searchTerm);
const deferredCategory = useDeferredValue(filters.category);
// Keep sort order immediate since it's not expensive
const sortOrder = filters.sortOrder;
```

### Custom Hooks for Common Patterns

Create reusable hooks for common deferral patterns:

```tsx
function useDeferredSearch<T>(
  items: T[],
  query: string,
  searchFn: (items: T[], query: string) => T[],
) {
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    return searchFn(items, deferredQuery);
  }, [items, deferredQuery, searchFn]);

  const isStale = query !== deferredQuery;

  return { results, isStale };
}

// Usage
function ProductSearch() {
  const [query, setQuery] = useState('');
  const { results, isStale } = useDeferredSearch(products, query, (products, q) =>
    products.filter((p) => p.name.includes(q)),
  );

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ProductList products={results} isStale={isStale} />
    </div>
  );
}
```

## Common Gotchas

### Gotcha #1: Missing Memoization

```tsx
// ❌ Still re-renders on every change
function BadExample({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);

  // This runs on every render!
  const results = expensiveComputation(deferredQuery);

  return <div>{results}</div>;
}

// ✅ Properly memoized
function GoodExample({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    return expensiveComputation(deferredQuery);
  }, [deferredQuery]);

  return <div>{results}</div>;
}
```

### Gotcha #2: Deferring the Wrong Thing

```tsx
// ❌ Deferring the final result instead of the input
function BadExample({ items, query }: { items: Item[]; query: string }) {
  const filteredItems = items.filter((item) => item.name.includes(query));
  const deferredItems = useDeferredValue(filteredItems); // Wrong!

  return <ItemList items={deferredItems} />;
}

// ✅ Defer the input, memoize the computation
function GoodExample({ items, query }: { items: Item[]; query: string }) {
  const deferredQuery = useDeferredValue(query);

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.name.includes(deferredQuery));
  }, [items, deferredQuery]);

  return <ItemList items={filteredItems} />;
}
```

## Wrapping Up

`useDeferredValue` is a powerful tool for building responsive UIs that handle expensive operations gracefully. The key principles to remember:

## Related Topics

- **[useTransition and startTransition](./usetransition-and-starttransition.md)** - Combine non-blocking transitions with deferred values for comprehensive performance optimization
- **[Real-Time Data Performance](./real-time-data-performance.md)** - Use useDeferredValue to handle high-frequency updates without blocking the UI
- **[Concurrent React Scheduling](./concurrent-react-scheduling.md)** - Understand how React prioritizes and schedules deferred updates
- **[Windowing and Virtualization](./windowing-and-virtualization.md)** - Defer expensive list operations for better scrolling performance
- **[Avoiding Over-Memoization](./avoiding-over-memoization.md)** - Balance deferred values with proper memoization strategies

- **Defer the inputs**, not the outputs
- **Always memoize** the expensive computation
- **Use it for non-critical updates** that shouldn't block user interactions
- **Combine with transitions** for comprehensive performance optimization
- **Provide visual feedback** when values are stale

When used correctly, `useDeferredValue` can transform a sluggish interface into one that feels snappy and responsive—even when doing heavy computational work under the hood. Your users will appreciate the fluid typing experience, even if they never realize the complex performance optimizations happening behind the scenes.

Remember: the best performance optimization is the one your users never notice, because everything just feels fast and responsive. That's exactly what `useDeferredValue` helps you achieve.
