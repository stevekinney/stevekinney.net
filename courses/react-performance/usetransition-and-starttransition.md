---
title: useTransition and startTransition
description: >-
  Mark non-urgent updates so urgent ones stay snappy—keep typing smooth while
  expensive UI catches up in the background.
date: 2025-09-06T21:59:36.420Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - hooks
  - concurrent
---

React 18 introduced concurrent features that help keep your app responsive even when doing expensive work. At the heart of this is the concept of **transitions**—marking some updates as less urgent so the more important ones (like responding to user input) don't get blocked. Think of it like traffic management: express lanes for urgent updates, regular lanes for everything else.

`useTransition` and `startTransition` let you defer non-urgent state updates, preventing them from blocking the UI thread while users are actively typing, clicking, or scrolling. Instead of freezing up during heavy computations, your app stays interactive while the expensive work happens in the background.

## The Problem: Blocking Updates

Before we dive into the solution, let's understand what we're solving. Consider this search component that filters a large list:

```tsx
// ❌ This blocks the UI during expensive filtering
function SearchResults() {
  const [query, setQuery] = useState('');
  const [items] = useState(generateLargeDataset()); // 10,000+ items

  // This filtering happens synchronously and blocks typing
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
      {filteredItems.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

When you type in the search box, each keystroke triggers expensive filtering that blocks the UI. The input feels sluggish because React can't update the input value until the filtering completes. Not exactly the smooth experience your users expect.

## Enter `useTransition`

`useTransition` gives you a way to mark updates as "transitions"—non-urgent updates that can be interrupted by more important work:

```tsx
import { useTransition, useState } from 'react';

// ✅ Smooth typing with transitions
function SearchResults() {
  const [query, setQuery] = useState('');
  const [filteredQuery, setFilteredQuery] = useState('');
  const [items] = useState(generateLargeDataset());
  const [isPending, startTransition] = useTransition();

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(filteredQuery.toLowerCase()),
  );

  const handleSearch = (value: string) => {
    setQuery(value); // Urgent: update input immediately

    startTransition(() => {
      setFilteredQuery(value); // Non-urgent: defer filtering
    });
  };

  return (
    <div>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search..." />
      {isPending && <div>Filtering...</div>}
      {filteredItems.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

Here's what's happening:

- **Immediate update**: `setQuery(value)` runs synchronously, so typing stays responsive
- **Deferred update**: `setFilteredQuery(value)` inside `startTransition` gets lower priority
- **Loading state**: `isPending` tells us when the transition is still processing

The input updates immediately while the expensive filtering happens in the background. If the user keeps typing, React will interrupt the ongoing filtering to handle the new input.

## `useTransition` Hook Deep Dive

The `useTransition` hook returns a tuple with two elements:

```tsx
const [isPending, startTransition] = useTransition();
```

### isPending

A boolean indicating whether any transition is currently pending. Use this to show loading indicators:

```tsx
function FilteredList() {
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {isPending && <div className="loading-spinner">Updating results...</div>}
      {/* Your filtered content */}
    </div>
  );
}
```

### startTransition

A function that wraps state updates you want to mark as transitions:

```tsx
const handleExpensiveUpdate = (newData) => {
  // Urgent updates outside the transition
  setLoadingState(true);

  startTransition(() => {
    // Non-urgent updates inside the transition
    setFilteredData(processData(newData));
    setCurrentPage(1);
    setSelectedItems([]);
  });
};
```

Multiple state updates inside `startTransition` are batched together as a single, interruptible transition.

## startTransition (Standalone)

You don't always need the `isPending` state. For cases where you just want to mark updates as non-urgent, import `startTransition` directly:

```tsx
import { startTransition } from 'react';

function TabContainer() {
  const [activeTab, setActiveTab] = useState('home');
  const [tabContent, setTabContent] = useState(getHomeContent());

  const switchTab = (tab: string) => {
    setActiveTab(tab); // Urgent: update tab highlight immediately

    startTransition(() => {
      // Non-urgent: load expensive tab content
      setTabContent(getContentForTab(tab));
    });
  };

  return (
    <div>
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'active' : ''}
            onClick={() => switchTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="tab-content">{tabContent}</div>
    </div>
  );
}
```

The tab highlighting happens immediately (great UX), while the potentially expensive content loading happens as a transition.

## Real-World Patterns

### Search with Debouncing

Combine transitions with debouncing for even better search performance:

```tsx
function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  // Debounce the search to avoid excessive API calls
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      startTransition(() => {
        // This could be an API call or expensive filtering
        performSearch(searchQuery).then(setResults);
      });
    }, 300),
    [],
  );

  useEffect(() => {
    if (query) {
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query, debouncedSearch]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />

      {isPending && <div>Searching...</div>}

      <div className="results">
        {results.map((result) => (
          <SearchResult key={result.id} item={result} />
        ))}
      </div>
    </div>
  );
}
```

### Data Visualization Updates

Perfect for charts and graphs that need expensive recalculations:

```tsx
function DataDashboard() {
  const [filters, setFilters] = useState(defaultFilters);
  const [chartData, setChartData] = useState([]);
  const [isPending, startTransition] = useTransition();

  const updateFilters = (newFilters: Filters) => {
    setFilters(newFilters); // Update UI immediately

    startTransition(() => {
      // Expensive data processing doesn't block filter UI
      const processedData = processLargeDataset(rawData, newFilters);
      setChartData(processedData);
    });
  };

  return (
    <div>
      <FilterControls filters={filters} onChange={updateFilters} />

      {isPending && <div className="chart-loading">Updating visualization...</div>}

      <Chart data={chartData} />
    </div>
  );
}
```

## When NOT to Use Transitions

Transitions aren't always the answer. Avoid them for:

### Critical User Feedback

Don't defer updates that provide immediate feedback for user actions:

```tsx
// ❌ Don't defer form validation feedback
const handleSubmit = () => {
  startTransition(() => {
    setErrors(validateForm(formData)); // User needs immediate feedback
  });
};

// ✅ Show validation errors immediately
const handleSubmit = () => {
  setErrors(validateForm(formData));
};
```

### Navigation Updates

Route changes should feel instant:

```tsx
// ❌ Don't defer navigation
const handleNavigation = (route: string) => {
  startTransition(() => {
    navigate(route); // Users expect immediate navigation
  });
};

// ✅ Navigate immediately, defer expensive route data
const handleNavigation = (route: string) => {
  navigate(route);

  startTransition(() => {
    loadRouteData(route).then(setRouteData);
  });
};
```

### Small, Fast Updates

For trivial state changes, transitions add unnecessary complexity:

```tsx
// ❌ Overkill for simple updates
const [count, setCount] = useState(0);

const increment = () => {
  startTransition(() => {
    setCount((c) => c + 1); // This is already fast
  });
};

// ✅ Keep it simple
const increment = () => {
  setCount((c) => c + 1);
};
```

## Performance Considerations

### Measuring Impact

Use React DevTools Profiler to measure the actual impact:

```tsx
// Before adding transitions, profile this component
function ExpensiveList({ items, query }) {
  const filteredItems = useMemo(() => {
    // Expensive filtering logic
    return items.filter((item) => complexFilterLogic(item, query));
  }, [items, query]);

  return (
    <div>
      {filteredItems.map((item) => (
        <ExpensiveListItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

> [!TIP]
> Only add transitions if you can measure a real improvement in user experience. Don't optimize prematurely.

### Memory Considerations

Transitions can keep multiple versions of data in memory simultaneously:

```tsx
function OptimizedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  // Cleanup old results to prevent memory leaks
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isPending) {
        // Clean up any cached expensive computations
        cleanupExpensiveOperations();
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isPending]);

  // ... rest of component
}
```

## Migration Strategy

Converting existing components to use transitions:

### Step 1: Identify Expensive Operations

Look for operations that cause noticeable UI freezing:

- Large list filtering/sorting
- Complex calculations
- Heavy DOM updates
- Data processing

### Step 2: Split State

Separate immediate updates from expensive ones:

```tsx
// Before: Single state causes blocking updates
const [searchState, setSearchState] = useState({
  query: '',
  results: [],
});

// After: Split for different update priorities
const [query, setQuery] = useState('');
const [results, setResults] = useState([]);
```

### Step 3: Add Transitions Incrementally

Start with the most problematic components:

```tsx
// Start here: Most obvious wins
function ProductSearch() {
  const [isPending, startTransition] = useTransition();
  // ... transition logic
}

// Then move to: Secondary bottlenecks
function DataTable() {
  // ... apply same pattern
}
```

### Step 4: Measure and Iterate

Use performance profiling to validate improvements and find the next optimization target.

## Common Gotchas

### Stale Closures in Transitions

Be careful with closures inside `startTransition`:

```tsx
// ❌ This captures stale values
const handleUpdate = () => {
  startTransition(() => {
    // `someValue` might be stale if the transition is interrupted
    setResults(processData(someValue));
  });
};

// ✅ Get fresh values inside the transition
const handleUpdate = () => {
  startTransition(() => {
    setResults((currentResults) => processData(getCurrentValue()));
  });
};
```

### Transitions Don't Make Code Faster

Transitions don't magically speed up your code—they just prevent slow code from blocking urgent updates:

```tsx
// ❌ Still slow, just non-blocking
startTransition(() => {
  setResults(reallySlowOperation(data)); // This is still slow!
});

// ✅ Combine with other optimizations
startTransition(() => {
  // Use web workers, memoization, virtualization, etc.
  setResults(optimizedOperation(data));
});
```

## Next Steps

Now that you understand transitions, you're ready to build more responsive React applications. The key is identifying which updates are urgent (user input, navigation) versus which can wait (search results, data visualization).
