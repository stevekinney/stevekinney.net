---
title: Concurrent React and Scheduling
description: Learn how React can pause and resume work to keep interactions smooth—design components that play nicely with the scheduler.
date: 2025-09-06T21:57:38.385Z
modified: 2025-09-06T21:57:38.385Z
published: true
tags: ['react', 'performance', 'concurrent', 'scheduling']
---

React 18 introduced concurrent features that fundamentally change how React processes updates. Instead of blocking the main thread until every component renders, React can now pause and resume work—keeping your app responsive even during expensive operations. This isn't just about making things faster; it's about making the _right things_ fast and ensuring user interactions never feel sluggish.

Understanding React's scheduler helps you write components that cooperate with the system rather than fight against it. You'll learn to distinguish between urgent and non-urgent work, leverage built-in prioritization, and design interfaces that feel smooth regardless of the complexity happening underneath.

## How React's Scheduler Works

Before concurrent features, React's rendering was like a single-lane highway—once React started rendering, it couldn't stop until the entire component tree was complete. If you had a heavy component that took 200ms to render, your entire UI would freeze for that duration.

React's concurrent scheduler introduces **time-slicing** and **priority-based scheduling**. Think of it as upgrading from a single-lane highway to a smart traffic system with multiple lanes, priority rules, and the ability to pause lower-priority traffic when emergency vehicles need to pass.

Here's the key insight: not all updates are created equal. A user clicking a button expects immediate feedback, while updating a data visualization can wait a few milliseconds. The scheduler uses this priority hierarchy:

```ts
// From React's internal priority levels (simplified)
enum Priority {
  ImmediatePriority = 1, // User input, focus events
  UserBlockingPriority = 2, // Click handlers, form inputs
  NormalPriority = 3, // Data fetching, network requests
  LowPriority = 4, // Analytics, logging
  IdlePriority = 5, // Background cleanup tasks
}
```

The scheduler can interrupt lower-priority work when higher-priority work arrives, ensuring your app stays responsive to user interactions.

## Understanding Transitions

The most practical way to leverage React's scheduler is through **transitions**. A transition marks an update as non-urgent, allowing React to interrupt it for more important work.

```ts
import { useTransition, useState } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery); // Urgent: update input immediately

    startTransition(() => {
      // Non-urgent: expensive filtering can be interrupted
      const filtered = expensiveSearch(searchQuery);
      setResults(filtered);
    });
  };

  return (
    <div>
      <input
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      {isPending && <div>Searching...</div>}
      <ResultsList results={results} />
    </div>
  );
}
```

This pattern keeps the input responsive—users see their typing immediately—while the expensive search operation happens in the background and can be interrupted if they keep typing.

## Deferred Values for Expensive Computations

Sometimes you don't control the state update (maybe it's coming from a parent component), but you still want to defer expensive work. `useDeferredValue` lets you create a "delayed" version of a value that lags behind during rapid updates.

```ts
import { useDeferredValue, useMemo } from 'react';

function ExpensiveChart({ data }: { data: number[] }) {
  const deferredData = useDeferredValue(data);

  const chartElements = useMemo(() => {
    // This expensive computation uses the deferred value
    return deferredData.map((value, index) => (
      <ChartBar key={index} value={value} />
    ));
  }, [deferredData]);

  return (
    <div>
      {/* Show a hint that data is updating */}
      {data !== deferredData && (
        <div className="opacity-50">Updating chart...</div>
      )}
      <div className="chart">{chartElements}</div>
    </div>
  );
}
```

When `data` changes rapidly, `deferredData` will lag behind, preventing expensive chart recalculations on every keystroke. React will batch the updates and process them when it has spare time.

## Avoiding Common Scheduling Pitfalls

### Don't Wrap Everything in Transitions

Transitions are for non-urgent updates that can be interrupted. Don't wrap urgent interactions like button clicks or form submissions:

```ts
// ❌ Bad: Makes button feel unresponsive
function Button({ onClick }: { onClick: () => void }) {
  const [, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(onClick)}
    >
      Submit
    </button>
  );
}

// ✅ Good: Button responds immediately
function Button({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}>
      Submit
    </button>
  );
}
```

### Be Mindful of Transition Boundaries

Transitions only affect the updates inside the `startTransition` callback. Updates outside remain urgent:

```ts
// ❌ This won't work as expected
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [, startTransition] = useTransition();

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery); // Still urgent!

    startTransition(() => {
      const filtered = expensiveFilter(newQuery);
      setResults(filtered); // Only this is in the transition
    });
  };
}
```

If you want both updates to be part of the transition, include them both:

```ts
// ✅ Both updates are now non-urgent
const handleSearch = (newQuery: string) => {
  startTransition(() => {
    setQuery(newQuery);
    const filtered = expensiveFilter(newQuery);
    setResults(filtered);
  });
};
```

## Real-World Scheduling Patterns

### Progressive Enhancement Pattern

Show immediate feedback for urgent updates while deferring expensive secondary work:

```ts
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [recommendations, setRecommendations] = useState<User[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Urgent: Load user data immediately
    fetchUser(userId).then(setUser);

    // Non-urgent: Recommendations can wait
    startTransition(() => {
      fetchRecommendations(userId).then(setRecommendations);
    });
  }, [userId]);

  return (
    <div>
      {user ? (
        <UserCard user={user} />
      ) : (
        <UserCardSkeleton />
      )}

      {recommendations.length > 0 && (
        <RecommendationsList users={recommendations} />
      )}
    </div>
  );
}
```

### Optimistic Updates with Fallback

Combine transitions with optimistic updates for smooth interactions:

```ts
function TodoItem({ todo, onToggle }: { todo: Todo; onToggle: (id: string) => void }) {
  const [isOptimistic, setIsOptimistic] = useState(false);
  const [, startTransition] = useTransition();

  const handleToggle = () => {
    setIsOptimistic(true); // Immediate visual feedback

    startTransition(() => {
      onToggle(todo.id); // The actual update can be deferred
      setIsOptimistic(false);
    });
  };

  return (
    <div
      className={`todo-item ${isOptimistic ? 'updating' : ''}`}
      onClick={handleToggle}
    >
      <Checkbox checked={todo.completed} />
      <span>{todo.text}</span>
    </div>
  );
}
```

## Working with External Libraries

Not all libraries are concurrent-ready. Some perform synchronous operations that can't be interrupted:

```ts
// ❌ Problematic: Heavy synchronous work
function DataGrid({ data }: { data: any[] }) {
  const deferredData = useDeferredValue(data);

  // This heavy calculation still blocks the main thread
  const processedData = heavySyncProcessing(deferredData);

  return <Grid data={processedData} />;
}

// ✅ Better: Break work into chunks
function DataGrid({ data }: { data: any[] }) {
  const deferredData = useDeferredValue(data);
  const [processedData, setProcessedData] = useState([]);

  useEffect(() => {
    // Process data in chunks with yielding
    processDataInChunks(deferredData, setProcessedData);
  }, [deferredData]);

  return <Grid data={processedData} />;
}

async function processDataInChunks(data: any[], setResult: (data: any[]) => void) {
  const chunks = chunkArray(data, 100);
  const results = [];

  for (const chunk of chunks) {
    const processed = processChunk(chunk);
    results.push(...processed);

    // Yield control back to the browser
    await new Promise(resolve => setTimeout(resolve, 0));
    setResult([...results]);
  }
}
```

## Performance Monitoring and Debugging

React DevTools Profiler helps you understand how your transitions behave:

```ts
// Add labels to make transitions easier to identify in DevTools
function SearchResults() {
  const [, startTransition] = useTransition();

  const handleSearch = (query: string) => {
    startTransition(() => {
      // This label appears in React DevTools
      React.unstable_trace('search-filtering', () => {
        const results = expensiveSearch(query);
        setResults(results);
      });
    });
  };
}
```

You can also measure transition performance in production:

```ts
import { unstable_trace } from 'react';

function trackTransitionPerformance(name: string, fn: () => void) {
  const start = performance.now();

  unstable_trace(name, () => {
    fn();

    // Log timing data to your analytics
    const duration = performance.now() - start;
    analytics.track('transition-performance', { name, duration });
  });
}
```

## When Not to Use Concurrent Features

Concurrent features aren't always the answer. Avoid them when:

- **Critical business logic**: Don't defer validation or security checks
- **Simple, fast updates**: The overhead isn't worth it for trivial operations
- **External timing requirements**: Some operations need precise timing control

```ts
// ❌ Don't defer critical validation
function PaymentForm() {
  const [, startTransition] = useTransition();

  const handleSubmit = (data: PaymentData) => {
    startTransition(() => {
      validatePayment(data); // This should be immediate!
      submitPayment(data);
    });
  };
}

// ✅ Keep validation urgent, defer non-critical work
function PaymentForm() {
  const [, startTransition] = useTransition();

  const handleSubmit = async (data: PaymentData) => {
    const isValid = await validatePayment(data); // Urgent
    if (!isValid) return;

    await submitPayment(data); // Also urgent

    // Non-urgent: Analytics and cleanup can wait
    startTransition(() => {
      trackPaymentSuccess(data);
      clearFormCache();
    });
  };
}
```

## Next Steps

React's concurrent features give you fine-grained control over when work happens, but they're tools that require thoughtful application. Start by identifying the expensive operations in your app—data processing, complex renders, or heavy computations—and experiment with wrapping them in transitions.

The goal isn't to make everything concurrent, but to ensure user interactions always feel responsive while non-critical work happens in the background. Your users will notice the difference, even if they can't quite put their finger on why your app feels more polished than the competition.

For deeper exploration, check out the [React 18 Working Group discussions](https://github.com/reactwg/react-18/discussions) where many of these patterns were first discussed, and consider how server components (another React 18 feature) can reduce the client-side work that needs scheduling in the first place.
