---
title: Concurrent Features Typing Patterns
description: >-
  Master React 19's concurrent features with TypeScript—transitions, deferred
  values, and concurrent rendering with type safety.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - typescript
  - concurrent
  - transitions
  - performance
  - react-19
---

React's concurrent features are like having a traffic controller for your UI updates. Instead of every update blocking everything else, React can now interrupt, prioritize, and defer work to keep your app responsive. But with great power comes great complexity—and that's where TypeScript becomes your safety net. Let's explore how to leverage concurrent rendering, transitions, and deferred values with full type safety.

Think of concurrent features as giving React the ability to multitask. Just like you might pause writing an email to answer an urgent phone call, React can pause rendering a large list to handle a user's button click. TypeScript ensures you're using these powerful features correctly.

## Understanding Concurrent Rendering

Before diving into code, let's understand what concurrent rendering actually means and why it matters for TypeScript developers.

### The Concurrent Mental Model

```tsx
// Traditional rendering: All or nothing
function TraditionalComponent({ items }: { items: Item[] }) {
  // This blocks the main thread until all 10,000 items render
  return (
    <div>
      {items.map((item) => (
        <ExpensiveItem key={item.id} data={item} />
      ))}
    </div>
  );
}

// Concurrent rendering: Interruptible and prioritized
function ConcurrentComponent({ items }: { items: Item[] }) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');

  // High priority: User input
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilter(value); // Updates immediately

    // Low priority: Filtering results
    startTransition(() => {
      // This can be interrupted if user types again
      updateFilteredItems(value);
    });
  };

  return (
    <div>
      <input value={filter} onChange={handleFilterChange} placeholder="Filter items..." />
      {isPending && <div>Updating list...</div>}
      <ItemList items={filteredItems} />
    </div>
  );
}
```

## `useTransition`: Type-Safe Transitions

The `useTransition` hook lets you mark updates as non-urgent. TypeScript helps ensure you're using it correctly.

### Basic Transition Patterns

```tsx
import { useTransition, useState, TransitionStartFunction } from 'react';

// Type-safe transition wrapper
interface TransitionState {
  isPending: boolean;
  startTransition: TransitionStartFunction;
}

function useTypedTransition(): TransitionState {
  const [isPending, startTransition] = useTransition();
  return { isPending, startTransition };
}

// Complex state transitions
interface AppState {
  view: 'list' | 'grid' | 'chart';
  data: DataItem[];
  filter: FilterOptions;
  sort: SortOptions;
}

function DataExplorer() {
  const [state, setState] = useState<AppState>({
    view: 'list',
    data: [],
    filter: defaultFilter,
    sort: defaultSort,
  });

  const { isPending, startTransition } = useTypedTransition();

  // Immediate update for view toggle
  const changeView = (view: AppState['view']) => {
    setState((prev) => ({ ...prev, view }));
  };

  // Deferred update for expensive operations
  const applyFilter = (filter: FilterOptions) => {
    startTransition(() => {
      setState((prev) => ({
        ...prev,
        filter,
        data: filterData(prev.data, filter),
      }));
    });
  };

  return (
    <div className={isPending ? 'updating' : ''}>
      <ViewToggle current={state.view} onChange={changeView} />
      <FilterPanel onApply={applyFilter} />
      {isPending && <LoadingOverlay />}
      <DataView view={state.view} data={state.data} />
    </div>
  );
}
```

### Advanced Transition Patterns

```tsx
// Transition with error handling
interface TransitionWithError<T> {
  isPending: boolean;
  error: Error | null;
  startTransition: (callback: () => Promise<T>) => Promise<T | undefined>;
}

function useTransitionWithError<T>(): TransitionWithError<T> {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<Error | null>(null);

  const safeStartTransition = useCallback(
    async (callback: () => Promise<T>): Promise<T | undefined> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          try {
            setError(null);
            const result = await callback();
            resolve(result);
          } catch (err) {
            setError(err as Error);
            resolve(undefined);
          }
        });
      });
    },
    [startTransition],
  );

  return { isPending, error, startTransition: safeStartTransition };
}

// Usage with async operations
function SearchableList() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const { isPending, error, startTransition } = useTransitionWithError<SearchResult[]>();

  const handleSearch = async (query: string) => {
    const data = await startTransition(async () => {
      const response = await searchAPI(query);
      return response.results;
    });

    if (data) {
      setResults(data);
    }
  };

  return (
    <div>
      <SearchInput onSearch={handleSearch} />
      {error && <ErrorMessage error={error} />}
      {isPending ? <SearchingSkeleton /> : <ResultsList results={results} />}
    </div>
  );
}
```

### Coordinated Transitions

```tsx
// Multiple transitions with priority
interface PriorityTransition {
  high: TransitionStartFunction;
  medium: TransitionStartFunction;
  low: TransitionStartFunction;
  isPending: {
    high: boolean;
    medium: boolean;
    low: boolean;
    any: boolean;
  };
}

function usePriorityTransitions(): PriorityTransition {
  const [isHighPending, startHighTransition] = useTransition();
  const [isMediumPending, startMediumTransition] = useTransition();
  const [isLowPending, startLowTransition] = useTransition();

  return {
    high: startHighTransition,
    medium: startMediumTransition,
    low: startLowTransition,
    isPending: {
      high: isHighPending,
      medium: isMediumPending,
      low: isLowPending,
      any: isHighPending || isMediumPending || isLowPending,
    },
  };
}

// Dashboard with prioritized updates
function Dashboard({ userId }: { userId: string }) {
  const transitions = usePriorityTransitions();
  const [dashboardData, setDashboardData] = useState<DashboardData>();

  useEffect(() => {
    // High priority: User info
    transitions.high(() => {
      fetchUserInfo(userId).then((info) => {
        setDashboardData((prev) => ({ ...prev, user: info }));
      });
    });

    // Medium priority: Recent activity
    transitions.medium(() => {
      fetchRecentActivity(userId).then((activity) => {
        setDashboardData((prev) => ({ ...prev, activity }));
      });
    });

    // Low priority: Analytics
    transitions.low(() => {
      fetchAnalytics(userId).then((analytics) => {
        setDashboardData((prev) => ({ ...prev, analytics }));
      });
    });
  }, [userId]);

  return (
    <div>
      {transitions.isPending.high && <div>Loading user info...</div>}
      {dashboardData?.user && <UserCard user={dashboardData.user} />}

      {transitions.isPending.medium && <div>Loading activity...</div>}
      {dashboardData?.activity && <ActivityFeed items={dashboardData.activity} />}

      {transitions.isPending.low && <div>Loading analytics...</div>}
      {dashboardData?.analytics && <AnalyticsChart data={dashboardData.analytics} />}
    </div>
  );
}
```

## `useDeferredValue`: Deferred Updates with Types

`useDeferredValue` lets you defer updating a part of the UI. TypeScript ensures the deferred value matches the original type.

### Basic Deferred Values

```tsx
import { useDeferredValue, useState, memo } from 'react';

interface SearchProps {
  data: Item[];
}

function SearchableTable({ data }: SearchProps) {
  const [query, setQuery] = useState('');

  // Deferred value maintains the same type
  const deferredQuery = useDeferredValue(query);

  // Query updates immediately, filtering is deferred
  const filteredData = useMemo(
    () => data.filter((item) => item.name.toLowerCase().includes(deferredQuery.toLowerCase())),
    [data, deferredQuery],
  );

  const isStale = query !== deferredQuery;

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <Table data={filteredData} />
      </div>
    </div>
  );
}
```

### Advanced Deferred Patterns

```tsx
// Deferred value with custom comparison
function useDeferredValueWithComparison<T>(value: T, compare?: (a: T, b: T) => boolean): T {
  const deferred = useDeferredValue(value);

  // Custom comparison logic
  const isEqual = compare ? compare(value, deferred) : value === deferred;

  return isEqual ? value : deferred;
}

// Complex object deferral
interface FilterState {
  text: string;
  categories: string[];
  dateRange: { start: Date; end: Date };
}

function ComplexFilter() {
  const [filter, setFilter] = useState<FilterState>({
    text: '',
    categories: [],
    dateRange: { start: new Date(), end: new Date() },
  });

  // Defer the entire filter object
  const deferredFilter = useDeferredValue(filter);

  // Check if any part is stale
  const isStale = useMemo(() => {
    return JSON.stringify(filter) !== JSON.stringify(deferredFilter);
  }, [filter, deferredFilter]);

  const results = useFilteredResults(deferredFilter);

  return (
    <div>
      <FilterControls value={filter} onChange={setFilter} />
      <ResultsDisplay results={results} isStale={isStale} />
    </div>
  );
}
```

### Combining Deferred Values with `Suspense`

```tsx
// Type-safe deferred suspense pattern
interface DeferredSuspenseProps<T> {
  value: T;
  children: (value: T, isStale: boolean) => React.ReactNode;
  fallback?: React.ReactNode;
}

function DeferredSuspense<T>({
  value,
  children,
  fallback = <div>Loading...</div>,
}: DeferredSuspenseProps<T>) {
  const deferredValue = useDeferredValue(value);
  const isStale = value !== deferredValue;

  return <Suspense fallback={fallback}>{children(deferredValue, isStale)}</Suspense>;
}

// Usage with async data
function AsyncDataView({ query }: { query: string }) {
  return (
    <DeferredSuspense value={query}>
      {(deferredQuery, isStale) => (
        <div style={{ opacity: isStale ? 0.6 : 1 }}>
          <AsyncResults query={deferredQuery} />
        </div>
      )}
    </DeferredSuspense>
  );
}
```

## Concurrent Rendering Patterns

Let's explore patterns that leverage concurrent rendering for better user experience.

### Time Slicing Pattern

```tsx
// Break large renders into chunks
interface TimeSlicedListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  chunkSize?: number;
  delay?: number;
}

function TimeSlicedList<T extends { id: string }>({
  items,
  renderItem,
  chunkSize = 10,
  delay = 0,
}: TimeSlicedListProps<T>) {
  const [renderedCount, setRenderedCount] = useState(chunkSize);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (renderedCount < items.length) {
      startTransition(() => {
        setTimeout(() => {
          setRenderedCount((prev) => Math.min(prev + chunkSize, items.length));
        }, delay);
      });
    }
  }, [renderedCount, items.length, chunkSize, delay]);

  const visibleItems = items.slice(0, renderedCount);
  const hasMore = renderedCount < items.length;

  return (
    <div>
      {visibleItems.map((item) => (
        <div key={item.id}>{renderItem(item)}</div>
      ))}
      {hasMore && (
        <div className="loading-more">Loading {items.length - renderedCount} more items...</div>
      )}
    </div>
  );
}
```

### Interruptible Sorting

```tsx
// Type-safe interruptible sorting
type SortDirection = 'asc' | 'desc';
type SortField<T> = keyof T;

interface SortConfig<T> {
  field: SortField<T>;
  direction: SortDirection;
}

interface InterruptibleSortResult<T> {
  sortedData: T[];
  issorting: boolean;
  sort: (config: SortConfig<T>) => void;
  cancel: () => void;
}

function useInterruptibleSort<T>(
  data: T[],
  initialConfig?: SortConfig<T>,
): InterruptibleSortResult<T> {
  const [sortedData, setSortedData] = useState(data);
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController>();

  const sort = useCallback(
    (config: SortConfig<T>) => {
      // Cancel previous sort
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      startTransition(() => {
        // Simulate expensive sort that can be interrupted
        const sorted = [...data].sort((a, b) => {
          if (abortControllerRef.current?.signal.aborted) {
            return 0;
          }

          const aVal = a[config.field];
          const bVal = b[config.field];

          if (config.direction === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });

        if (!abortControllerRef.current?.signal.aborted) {
          setSortedData(sorted);
        }
      });
    },
    [data, startTransition],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    sortedData,
    isSorting: isPending,
    sort,
    cancel,
  };
}
```

### Progressive Enhancement with Concurrent Features

```tsx
// Gradually enhance UI based on interaction
interface ProgressiveListProps<T> {
  items: T[];
  renderBasic: (item: T) => React.ReactNode;
  renderEnhanced: (item: T) => React.ReactNode;
}

function ProgressiveList<T extends { id: string }>({
  items,
  renderBasic,
  renderEnhanced,
}: ProgressiveListProps<T>) {
  const [enhancedIds, setEnhancedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const enhanceItem = (id: string) => {
    startTransition(() => {
      setEnhancedIds((prev) => new Set(prev).add(id));
    });
  };

  return (
    <div>
      {items.map((item) => {
        const isEnhanced = enhancedIds.has(item.id);

        return (
          <div key={item.id} onMouseEnter={() => !isEnhanced && enhanceItem(item.id)}>
            {isEnhanced ? renderEnhanced(item) : renderBasic(item)}
          </div>
        );
      })}
    </div>
  );
}
```

## `Suspense` List and Concurrent `Suspense`

TypeScript patterns for coordinating multiple Suspense boundaries.

### `SuspenseList` Patterns

```tsx
import { SuspenseList, Suspense } from 'react';

type RevealOrder = 'forwards' | 'backwards' | 'together';

interface SuspenseListConfig {
  revealOrder: RevealOrder;
  tail?: 'collapsed' | 'hidden';
}

interface TypedSuspenseListProps {
  children: React.ReactNode;
  config: SuspenseListConfig;
}

function TypedSuspenseList({ children, config }: TypedSuspenseListProps) {
  return (
    <SuspenseList revealOrder={config.revealOrder} tail={config.tail}>
      {children}
    </SuspenseList>
  );
}

// Orchestrated loading sequence
function ProfilePage({ userId }: { userId: string }) {
  return (
    <TypedSuspenseList
      config={{
        revealOrder: 'forwards',
        tail: 'collapsed',
      }}
    >
      <Suspense fallback={<HeaderSkeleton />}>
        <ProfileHeader userId={userId} />
      </Suspense>

      <Suspense fallback={<BioSkeleton />}>
        <ProfileBio userId={userId} />
      </Suspense>

      <Suspense fallback={<PostsSkeleton />}>
        <ProfilePosts userId={userId} />
      </Suspense>
    </TypedSuspenseList>
  );
}
```

### Nested Concurrent Boundaries

```tsx
// Type-safe nested suspense configuration
interface SuspenseNode {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  fallback: React.ReactNode;
  children?: SuspenseNode[];
  priority?: 'high' | 'medium' | 'low';
}

function renderSuspenseTree(node: SuspenseNode): React.ReactElement {
  const Component = node.component;

  const content = (
    <>
      <Component {...(node.props || {})} />
      {node.children?.map((child) => renderSuspenseTree(child))}
    </>
  );

  if (node.priority === 'high') {
    // High priority: No suspense boundary
    return content;
  }

  return (
    <Suspense key={node.id} fallback={node.fallback}>
      {content}
    </Suspense>
  );
}

// Usage
const pageStructure: SuspenseNode = {
  id: 'root',
  component: Layout,
  fallback: <LayoutSkeleton />,
  children: [
    {
      id: 'header',
      component: Header,
      fallback: <HeaderSkeleton />,
      priority: 'high',
    },
    {
      id: 'content',
      component: Content,
      fallback: <ContentSkeleton />,
      children: [
        {
          id: 'sidebar',
          component: Sidebar,
          fallback: <SidebarSkeleton />,
          priority: 'low',
        },
        {
          id: 'main',
          component: MainContent,
          fallback: <MainSkeleton />,
          priority: 'medium',
        },
      ],
    },
  ],
};
```

## Activity and Priority Management

Managing UI priorities with TypeScript for optimal concurrent rendering.

### Activity Manager

```tsx
// Track and prioritize UI activities
interface Activity {
  id: string;
  type: 'user-input' | 'data-fetch' | 'animation' | 'background';
  priority: number; // 0-100, higher is more important
  timestamp: number;
}

class ActivityManager {
  private activities = new Map<string, Activity>();
  private listeners = new Set<(activities: Activity[]) => void>();

  register(activity: Omit<Activity, 'timestamp'>): void {
    this.activities.set(activity.id, {
      ...activity,
      timestamp: Date.now(),
    });
    this.notifyListeners();
  }

  unregister(id: string): void {
    this.activities.delete(id);
    this.notifyListeners();
  }

  getHighestPriority(): Activity | undefined {
    return Array.from(this.activities.values()).sort((a, b) => b.priority - a.priority)[0];
  }

  subscribe(listener: (activities: Activity[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const activities = Array.from(this.activities.values());
    this.listeners.forEach((listener) => listener(activities));
  }
}

// Hook for activity-aware rendering
function useActivityPriority(activityType: Activity['type']): {
  isPriority: boolean;
  startActivity: () => void;
  endActivity: () => void;
} {
  const [isPriority, setIsPriority] = useState(false);
  const manager = useMemo(() => new ActivityManager(), []);
  const activityId = useId();

  useEffect(() => {
    return manager.subscribe((activities) => {
      const highest = activities[0];
      setIsPriority(highest?.id === activityId);
    });
  }, [manager, activityId]);

  const startActivity = useCallback(() => {
    manager.register({
      id: activityId,
      type: activityType,
      priority: getPriorityForType(activityType),
    });
  }, [manager, activityId, activityType]);

  const endActivity = useCallback(() => {
    manager.unregister(activityId);
  }, [manager, activityId]);

  return { isPriority, startActivity, endActivity };
}

function getPriorityForType(type: Activity['type']): number {
  switch (type) {
    case 'user-input':
      return 100;
    case 'animation':
      return 75;
    case 'data-fetch':
      return 50;
    case 'background':
      return 25;
  }
}
```

## Performance Monitoring for Concurrent Features

Track the impact of concurrent features with TypeScript.

### Concurrent Metrics

```tsx
interface ConcurrentMetrics {
  transitionCount: number;
  deferredUpdateCount: number;
  interruptionCount: number;
  averageTransitionTime: number;
  priorities: Record<string, number>;
}

class ConcurrentMetricsCollector {
  private metrics: ConcurrentMetrics = {
    transitionCount: 0,
    deferredUpdateCount: 0,
    interruptionCount: 0,
    averageTransitionTime: 0,
    priorities: {},
  };

  private transitionTimes: number[] = [];

  recordTransition(duration: number, wasInterrupted: boolean): void {
    this.metrics.transitionCount++;
    if (wasInterrupted) {
      this.metrics.interruptionCount++;
    }

    this.transitionTimes.push(duration);
    this.metrics.averageTransitionTime =
      this.transitionTimes.reduce((a, b) => a + b, 0) / this.transitionTimes.length;
  }

  recordDeferredUpdate(): void {
    this.metrics.deferredUpdateCount++;
  }

  recordPriority(priority: string): void {
    this.metrics.priorities[priority] = (this.metrics.priorities[priority] || 0) + 1;
  }

  getMetrics(): ConcurrentMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      transitionCount: 0,
      deferredUpdateCount: 0,
      interruptionCount: 0,
      averageTransitionTime: 0,
      priorities: {},
    };
    this.transitionTimes = [];
  }
}

// Hook for monitoring concurrent features
function useConcurrentMetrics() {
  const collector = useMemo(() => new ConcurrentMetricsCollector(), []);
  const [metrics, setMetrics] = useState(collector.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(collector.getMetrics());
    }, 1000);

    return () => clearInterval(interval);
  }, [collector]);

  const trackTransition = useCallback(
    (fn: () => void) => {
      const start = performance.now();
      let wasInterrupted = false;

      try {
        fn();
      } catch (e) {
        if (e === 'Interrupted') {
          wasInterrupted = true;
        }
        throw e;
      } finally {
        const duration = performance.now() - start;
        collector.recordTransition(duration, wasInterrupted);
      }
    },
    [collector],
  );

  return { metrics, trackTransition };
}
```

## Best Practices and Patterns

### Do's and Don'ts

```tsx
// ✅ DO: Use transitions for non-urgent updates
function GoodPattern() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setQuery(value); // Urgent: Update input immediately

    startTransition(() => {
      // Non-urgent: Update results can be interrupted
      const filtered = performExpensiveSearch(value);
      setResults(filtered);
    });
  };

  return (
    <>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <div>Searching...</div>}
      <ResultsList results={results} />
    </>
  );
}

// ❌ DON'T: Use transitions for urgent updates
function BadPattern() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      // Don't defer user feedback!
      alert('Button clicked!');
    });
  };

  return <button onClick={handleClick}>Click me</button>;
}

// ✅ DO: Combine multiple concurrent features
function CombinedPattern({ data }: { data: Item[] }) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const [isPending, startTransition] = useTransition();

  const filteredData = useMemo(
    () => data.filter((item) => item.name.includes(deferredFilter)),
    [data, deferredFilter],
  );

  const handleSort = () => {
    startTransition(() => {
      // Expensive sort operation
      sortData(filteredData);
    });
  };

  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <button onClick={handleSort} disabled={isPending}>
        Sort
      </button>
      <DataTable data={filteredData} />
    </div>
  );
}
```

### Testing Concurrent Features

```tsx
// Test utilities for concurrent features
import { act, renderHook } from '@testing-library/react';

async function waitForTransition() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('Concurrent Features', () => {
  it('should defer updates with useTransition', async () => {
    const { result } = renderHook(() => {
      const [isPending, startTransition] = useTransition();
      const [value, setValue] = useState(0);

      return {
        isPending,
        value,
        update: () => startTransition(() => setValue((prev) => prev + 1)),
      };
    });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.update();
    });

    expect(result.current.isPending).toBe(true);

    await waitForTransition();

    expect(result.current.isPending).toBe(false);
    expect(result.current.value).toBe(1);
  });
});
```

## Wrapping Up

Concurrent features in React 19 with TypeScript give you fine-grained control over rendering priorities and user experience. By understanding transitions, deferred values, and concurrent patterns, you can build applications that stay responsive even under heavy load.

Remember: concurrent features aren't about making things faster—they're about making things feel faster by prioritizing what matters most to users. Use TypeScript to ensure you're applying these powerful features correctly, and your users will experience the difference in every interaction.
