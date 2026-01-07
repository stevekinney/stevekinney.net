---
title: useMemo and useCallback in React 19
description: >-
  Use memoization as a scalpel, not a sledgehammer—cache expensive work or
  stabilize identities where it truly pays off.
date: 2025-09-06T21:16:28.100Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - hooks
  - memoization
  - react-19
---

React's `useMemo` and `useCallback` are performance optimization hooks—emphasis on _optimization_. They're not magic bullets that make your app fast, but surgical tools for addressing specific performance bottlenecks. With React 19's compiler optimizations and better default behavior, understanding when and how to use these hooks becomes even more crucial (and thankfully, less frequent).

In this guide, we'll explore when memoization actually helps, when it hurts, and how React 19 changes the game. By the end, you'll know exactly when to reach for these hooks and when to let React's built-in optimizations do the heavy lifting.

## What Memoization Actually Solves

Before diving into the hooks themselves, let's clarify what problems memoization addresses in React:

1. **Expensive calculations**: When a component re-renders, any expensive computations in the render function run again—even if the inputs haven't changed.
2. **Reference equality issues**: New objects and functions created on every render can trigger unnecessary re-renders in child components that depend on reference equality.
3. **Dependency stability**: Hooks like `useEffect` depend on reference equality to determine when to re-run.

Think of memoization as caching—you're storing a result and reusing it until the inputs change. But like all caches, it comes with overhead.

> [!WARNING]
> Memoization isn't free. Every memoized value requires memory to store and comparison logic to check dependencies. Don't memoize unless you're solving a real performance problem.

## `useMemo`: Caching Expensive Calculations

`useMemo` caches the result of a computation and only recalculates when its dependencies change.

### The Basic Pattern

```tsx
import { useMemo } from 'react';

function ExpensiveComponent({ items, searchTerm }: Props) {
  const filteredItems = useMemo(() => {
    console.log('Filtering items...'); // This should only run when dependencies change
    return items
      .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchTerm]);

  return (
    <div>
      {filteredItems.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

Without `useMemo`, this filtering and sorting would happen on every render—even if `items` and `searchTerm` haven't changed. With thousands of items, that's wasteful.

### When `useMemo` Actually Helps

Here are the scenarios where `useMemo` provides real value:

**1. Computationally expensive operations**

```tsx
function DataAnalyzer({ dataset }: { dataset: number[] }) {
  // ✅ Good: Expensive statistical calculation
  const statistics = useMemo(() => {
    const sorted = [...dataset].sort((a, b) => a - b);
    const mean = dataset.reduce((sum, n) => sum + n, 0) / dataset.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const standardDeviation = Math.sqrt(
      dataset.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / dataset.length,
    );

    return { mean, median, standardDeviation };
  }, [dataset]);

  return <div>{/* Render statistics */}</div>;
}
```

**2. Complex data transformations**

```tsx
function UserList({ users, filters }: Props) {
  // ✅ Good: Complex filtering and transformation
  const processedUsers = useMemo(() => {
    return users
      .filter((user) => {
        if (filters.department && user.department !== filters.department) return false;
        if (filters.active !== undefined && user.active !== filters.active) return false;
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          return (
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
      .map((user) => ({
        ...user,
        displayName: `${user.name} (${user.department})`,
        initials: user.name
          .split(' ')
          .map((part) => part[0])
          .join(''),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, filters]);

  return <div>{/* Render processed users */}</div>;
}
```

**3. Stabilizing object references for child components**

```tsx
interface ChartConfig {
  type: 'line' | 'bar';
  colors: string[];
  animations: boolean;
}

function Dashboard({ data, chartType }: Props) {
  // ✅ Good: Prevents unnecessary re-renders of expensive Chart component
  const chartConfig: ChartConfig = useMemo(
    () => ({
      type: chartType,
      colors: ['#ff6384', '#36a2eb', '#ffce56'],
      animations: true,
    }),
    [chartType],
  );

  return <ExpensiveChart data={data} config={chartConfig} />;
}

const ExpensiveChart = React.memo(({ data, config }: ChartProps) => {
  // Expensive rendering logic here
  console.log('Chart re-rendering'); // Should only log when data or config changes
  return <div>{/* Complex chart rendering */}</div>;
});
```

### When `useMemo` Doesn't Help (and Can Hurt)

**1. Simple calculations**

```tsx
function UserCard({ user }: { user: User }) {
  // ❌ Bad: The memoization overhead exceeds the computation cost
  const displayName = useMemo(() => {
    return `${user.firstName} ${user.lastName}`;
  }, [user.firstName, user.lastName]);

  // ✅ Better: Just do it inline
  const displayName = `${user.firstName} ${user.lastName}`;
}
```

**2. Always-changing dependencies**

```tsx
function Timer() {
  const [time, setTime] = useState(Date.now());

  // ❌ Bad: time changes constantly, so memoization never helps
  const formattedTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(time));
  }, [time]);

  // ✅ Better: Just format it directly
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(time));
}
```

**3. Primitive values**

```tsx
function Counter({ count }: { count: number }) {
  // ❌ Bad: Primitives are already "memoized" by reference
  const doubled = useMemo(() => count * 2, [count]);

  // ✅ Better: Direct calculation
  const doubled = count * 2;
}
```

## `useCallback`: Stabilizing Function References

`useCallback` memoizes a function definition—not its result. This is primarily useful for preventing unnecessary re-renders of child components that rely on function reference equality.

### The Basic Pattern

```tsx
function TodoList({ todos }: { todos: Todo[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // ✅ Function reference stays stable unless editingId changes
  const handleToggleEdit = useCallback((id: string) => {
    setEditingId((current) => (current === id ? null : id));
  }, []);

  return (
    <div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggleEdit={handleToggleEdit}
          isEditing={editingId === todo.id}
        />
      ))}
    </div>
  );
}

const TodoItem = React.memo(({ todo, onToggleEdit, isEditing }: TodoItemProps) => {
  console.log(`Rendering TodoItem ${todo.id}`); // Should minimize logs

  return (
    <div>
      <span>{todo.text}</span>
      <button onClick={() => onToggleEdit(todo.id)}>{isEditing ? 'Cancel' : 'Edit'}</button>
    </div>
  );
});
```

Without `useCallback`, `handleToggleEdit` would be a new function on every render, causing all `TodoItem` components to re-render even when their `todo` prop hasn't changed.

### Real-World `useCallback` Patterns

**1. Event handlers for memoized components**

```tsx
function UserManagement({ users }: { users: User[] }) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // ✅ Stable function reference prevents unnecessary re-renders
  const handleUserSelect = useCallback((userId: string, selected: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedUsers(new Set(users.map((u) => u.id)));
  }, [users]);

  return (
    <div>
      <button onClick={handleSelectAll}>Select All</button>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          selected={selectedUsers.has(user.id)}
          onSelect={handleUserSelect}
        />
      ))}
    </div>
  );
}
```

**2. Callback functions with external dependencies**

```tsx
function SearchResults({ searchTerm, onResultClick }: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);

  // ✅ Function depends on searchTerm, so it's included in dependencies
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      // Log the search context with the click
      analytics.track('search_result_clicked', {
        searchTerm,
        resultId: result.id,
        resultType: result.type,
      });

      onResultClick(result);
    },
    [searchTerm, onResultClick],
  );

  return (
    <div>
      {results.map((result) => (
        <ResultCard key={result.id} result={result} onClick={handleResultClick} />
      ))}
    </div>
  );
}
```

### When `useCallback` Becomes Pointless

**1. No memoized children**

```tsx
function BadExample({ items }: { items: Item[] }) {
  // ❌ Bad: No memoized children, so stable reference doesn't matter
  const handleClick = useCallback((id: string) => {
    console.log(`Clicked ${id}`);
  }, []);

  return (
    <div>
      {items.map((item) => (
        // Non-memoized component will re-render anyway
        <ItemCard key={item.id} item={item} onClick={() => handleClick(item.id)} />
      ))}
    </div>
  );
}
```

**2. Functions that always change**

```tsx
function BadCounter() {
  const [count, setCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1);

  // ❌ Bad: Dependencies change frequently, negating memoization benefits
  const handleIncrement = useCallback(() => {
    setCount((prev) => prev + multiplier);
    console.log(`New count will be: ${count + multiplier}`);
  }, [count, multiplier]); // Both values change often!
}
```

## React 19: The Game Changer

React 19 introduces significant changes that affect when you need these hooks:

### React Compiler Optimizations

The React Compiler in React 19 can automatically optimize many cases where you'd previously need manual memoization:

```tsx
// React 19 can optimize this automatically
function AutoOptimized({ items, filter }: Props) {
  // The compiler may automatically memoize this transformation
  const filteredItems = items
    .filter((item) => item.category === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  // The compiler may automatically stabilize this function reference
  const handleItemClick = (id: string) => {
    console.log(`Clicked item ${id}`);
  };

  return (
    <div>
      {filteredItems.map((item) => (
        <ItemCard key={item.id} item={item} onClick={() => handleItemClick(item.id)} />
      ))}
    </div>
  );
}
```

### When to Still Use Manual Memoization

Even with React 19's improvements, manual memoization is still valuable in specific cases:

**1. Cross-component boundaries the compiler can't see**

```tsx
// ✅ Still valuable: External API calls or complex integrations
function WeatherWidget({ location }: { location: string }) {
  const weatherData = useMemo(() => {
    // Complex weather calculation that the compiler can't optimize
    return calculateWeatherMetrics(location);
  }, [location]);

  return <div>{/* weather display */}</div>;
}
```

**2. Expensive third-party library integrations**

```tsx
function ChartComponent({ data }: { data: ChartData }) {
  // ✅ Still needed: Third-party library optimizations
  const chartOptions = useMemo(() => {
    return expensiveChartLibrary.generateConfig(data);
  }, [data]);

  return <ExpensiveChart options={chartOptions} />;
}
```

## Measuring Performance Impact

Before adding memoization, measure the performance impact. React DevTools Profiler is your best friend here:

```tsx
function ProfiledComponent({ data }: Props) {
  // Add console.time to measure expensive operations
  console.time('data-processing');

  const processedData = useMemo(() => {
    const result = expensiveDataProcessing(data);
    console.timeEnd('data-processing');
    return result;
  }, [data]);

  return <div>{/* component content */}</div>;
}
```

> [!TIP]
> Use React DevTools Profiler to record component render times before and after adding memoization. If the improvement is negligible (< 16ms for 60fps), skip the memoization.

## Best Practices and Guidelines

### The Memoization Decision Tree

1. **Is the computation actually expensive?** (> 5ms consistently)
   - If no: Don't memoize
   - If yes: Continue

2. **Do the dependencies change frequently?**
   - If yes: Memoization won't help much
   - If no: Continue

3. **Are you solving a real performance problem?**
   - If no: Don't prematurely optimize
   - If yes: Memoize

### Dependency Array Best Practices

```tsx
function GoodExample({ user, settings }: Props) {
  // ✅ Good: All dependencies included
  const userPreferences = useMemo(() => {
    return {
      theme: settings.theme,
      language: user.preferredLanguage,
      notifications: settings.notifications && user.allowNotifications,
    };
  }, [settings.theme, settings.notifications, user.preferredLanguage, user.allowNotifications]);

  // ✅ Good: No dependencies needed (uses setter function)
  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);
}
```

### Common Gotchas

**1. Missing dependencies**

```tsx
function BuggyComponent({ items, filter }: Props) {
  const [sortOrder, setSortOrder] = useState('asc');

  // ❌ Bug: Missing sortOrder in dependencies
  const sortedItems = useMemo(() => {
    return items
      .filter((item) => item.type === filter)
      .sort((a, b) => {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
  }, [items, filter]); // Missing sortOrder!
}
```

**2. Objects as dependencies**

```tsx
function TrickyComponent({ config }: { config: Config }) {
  // ❌ Potentially problematic: config object might be new every render
  const processedData = useMemo(() => {
    return processData(config);
  }, [config]);

  // ✅ Better: Depend on specific properties
  const processedData = useMemo(() => {
    return processData(config);
  }, [config.apiUrl, config.timeout, config.retries]);
}
```

## Testing Memoized Components

Memoized components require special testing considerations:

```tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

describe('MemoizedComponent', () => {
  it('should not recalculate when irrelevant props change', () => {
    const expensiveCalculation = vi.fn(() => 'calculated result');

    function TestComponent({ data, irrelevantProp }: Props) {
      const result = useMemo(() => expensiveCalculation(data), [data]);
      return <div>{result}</div>;
    }

    const { rerender } = render(<TestComponent data="test" irrelevantProp="value1" />);

    expect(expensiveCalculation).toHaveBeenCalledTimes(1);

    // Re-render with different irrelevant prop
    rerender(<TestComponent data="test" irrelevantProp="value2" />);

    // Should not call expensive calculation again
    expect(expensiveCalculation).toHaveBeenCalledTimes(1);
  });
});
```

## When Not to Worry About Memoization

React 19's improvements mean you can often skip manual optimization in these cases:

- Simple components with minimal computation
- Components that re-render infrequently
- Development builds (focus on production performance)
- Small lists (< 100 items typically)
- Apps without performance issues

Remember: **premature optimization is the root of all evil**. Start with clean, readable code. Add memoization when you have actual performance problems, not imaginary ones.

## Wrapping Up
