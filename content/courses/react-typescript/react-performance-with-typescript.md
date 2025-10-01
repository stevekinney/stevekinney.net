---
title: React Performance with TypeScript
description: >-
  Use types to encode identity contracts—memo boundaries, readonly data, stable
  references, and type-safe performance monitoring.
date: 2025-09-06T22:23:57.383Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - typescript
  - performance
  - optimization
---

TypeScript isn't just about catching bugs at compile time—it's also a surprisingly powerful tool for encoding performance contracts in your React applications. When you use types to make performance boundaries explicit, you transform performance from a runtime guessing game into a design-time decision. We're going to explore how strategic typing can guide memo boundaries, prevent unnecessary re-renders, help you build components that are both fast and maintainable, and provide type-safe performance monitoring.

The secret sauce here is using TypeScript's type system to make performance intentions explicit rather than implicit. Instead of crossing your fingers and hoping React.memo works as expected, you can design types that make it impossible to accidentally break your performance optimizations.

## The Problem: Performance Through Hope

Let's start with a common scenario that looks innocent but hides performance landmines:

```tsx
// ❌ This looks fine but has hidden performance issues
interface UserProfileProps {
  user: {
    id: string;
    name: string;
    avatar: string;
    preferences: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  };
  onUpdate: (user: any) => void;
}

const UserProfile = React.memo(({ user, onUpdate }: UserProfileProps) => {
  return (
    <div>
      <img src={user.avatar} alt={user.name} />
      <h2>{user.name}</h2>
      <button onClick={() => onUpdate({ ...user, lastSeen: Date.now() })}>Update Last Seen</button>
    </div>
  );
});
```

This component will re-render every time the parent re-renders, even though we wrapped it with `React.memo`. Why? Because the `onUpdate` function is likely being recreated on every render, and that `any` type is doing us no favors in understanding what data actually matters for this component.

## Solution 1: Identity-Based Memo Boundaries

The first pattern is to use types to encode which props actually matter for rendering. Instead of hoping `React.memo` will figure it out, we make the performance contract explicit:

```tsx
// ✅ Types that encode memo boundaries
interface UserProfileData {
  readonly id: string;
  readonly name: string;
  readonly avatar: string;
}

interface UserProfileActions {
  readonly onUpdateLastSeen: (userId: string) => void;
}

interface UserProfileProps extends UserProfileData, UserProfileActions {}

const UserProfile = React.memo(
  ({ id, name, avatar, onUpdateLastSeen }: UserProfileProps) => {
    return (
      <div>
        <img src={avatar} alt={name} />
        <h2>{name}</h2>
        <button onClick={() => onUpdateLastSeen(id)}>Update Last Seen</button>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only the data props matter for rendering
    return (
      prevProps.id === nextProps.id &&
      prevProps.name === nextProps.name &&
      prevProps.avatar === nextProps.avatar
    );
  },
);
```

Now we've separated our data from our actions and made it clear which props actually affect rendering. The `readonly` modifiers signal that these values shouldn't change unexpectedly, and our custom comparison function only checks the props that matter for rendering.

> [!TIP]
> Use separate interfaces for data and actions. Data props affect rendering; action props typically don't (assuming they're stable references).

## Solution 2: Stable Reference Types

Here's a pattern I've found incredibly useful: encoding reference stability directly in the type system.

```tsx
// ✅ Types that enforce stable references
type StableCallback<T extends any[], R> = {
  readonly _brand: 'stable';
} & ((...args: T) => R);

// Type-level function to mark callbacks as stable
function useStableCallback<T extends any[], R>(
  callback: (...args: T) => R,
  deps: React.DependencyList,
): StableCallback<T, R> {
  return React.useCallback(callback, deps) as StableCallback<T, R>;
}

interface UserListProps {
  users: readonly UserProfileData[];
  onUserUpdate: StableCallback<[string], void>;
  onUserDelete: StableCallback<[string], void>;
}

const UserList = React.memo(({ users, onUserUpdate, onUserDelete }: UserListProps) => {
  return (
    <div>
      {users.map((user) => (
        <UserProfile key={user.id} {...user} onUpdateLastSeen={onUserUpdate} />
      ))}
    </div>
  );
});

// Usage in parent component
function UserDashboard() {
  const [users, setUsers] = useState<UserProfileData[]>([]);

  // TypeScript enforces that we use useStableCallback
  const handleUserUpdate = useStableCallback((userId: string) => {
    // Update logic here
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, lastSeen: Date.now() } : user)),
    );
  }, []);

  const handleUserDelete = useStableCallback((userId: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
  }, []);

  return <UserList users={users} onUserUpdate={handleUserUpdate} onUserDelete={handleUserDelete} />;
}
```

The `StableCallback` type acts as a compile-time contract: any function marked with this type promises to have a stable reference. You can't accidentally pass an unstable callback without TypeScript complaining.

## Solution 3: Readonly Data Contracts

One of the biggest sources of performance issues is accidentally mutating data that should be immutable. TypeScript's `readonly` modifiers can help, but we can take it further:

```tsx
// ✅ Deep readonly types for performance contracts
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

interface UserState {
  users: User[];
  filters: {
    status: 'active' | 'inactive';
    department: string[];
  };
}

// This prevents any accidental mutations
type ReadonlyUserState = DeepReadonly<UserState>;

interface UserTableProps {
  data: ReadonlyUserState;
  onDataChange: StableCallback<[ReadonlyUserState], void>;
}

const UserTable = React.memo(({ data, onDataChange }: UserTableProps) => {
  // TypeScript prevents us from accidentally mutating data
  // data.users.push(newUser); // ❌ Compile error!

  const handleAddUser = (newUser: User) => {
    // We're forced to create new objects, which is memo-friendly
    onDataChange({
      ...data,
      users: [...data.users, newUser],
    });
  };

  return (
    // Table implementation
    <table>{/* Table rows */}</table>
  );
});
```

By using `DeepReadonly`, we make immutability a compile-time contract rather than a runtime hope. This prevents the classic performance bug where someone accidentally mutates a prop, causing unnecessary re-renders.

## Solution 4: Computed Value Types

Sometimes you want to pass derived data to components, but you want to make sure that derivation is memoized. Here's a pattern for encoding that contract in types:

```tsx
// ✅ Types for memoized computations
type MemoizedValue<T> = {
  readonly _memoized: true;
} & T;

function useMemoizedValue<T>(factory: () => T, deps: React.DependencyList): MemoizedValue<T> {
  return React.useMemo(factory, deps) as MemoizedValue<T>;
}

interface UserStatsProps {
  stats: MemoizedValue<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    averageAge: number;
  }>;
}

const UserStats = React.memo(({ stats }: UserStatsProps) => {
  return (
    <div className="stats-grid">
      <div>Total: {stats.totalUsers}</div>
      <div>Active: {stats.activeUsers}</div>
      <div>Inactive: {stats.inactiveUsers}</div>
      <div>Avg Age: {Math.round(stats.averageAge)}</div>
    </div>
  );
});

// Usage
function UserDashboard({ users }: { users: User[] }) {
  const stats = useMemoizedValue(
    () => ({
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === 'active').length,
      inactiveUsers: users.filter((u) => u.status === 'inactive').length,
      averageAge: users.reduce((sum, u) => sum + u.age, 0) / users.length || 0,
    }),
    [users],
  );

  return <UserStats stats={stats} />;
}
```

The `MemoizedValue` type ensures that any expensive computed values are properly memoized before being passed to components. If someone tries to pass a non-memoized computed value, TypeScript will catch it.

## Type-Safe Performance Monitoring

You can create type-safe performance monitoring to catch regressions:

```tsx
// ✅ Typed performance monitoring hook
interface PerformanceMetrics {
  readonly renderTime: number;
  readonly updateCount: number;
  readonly lastUpdate: number;
}

function usePerformanceMonitor(componentName: string): PerformanceMetrics {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    const renderTime = now - lastRenderTimeRef.current;

    if (renderTime > 16) {
      // Slower than 60fps
      console.warn(
        `${componentName} render took ${renderTime.toFixed(2)}ms ` +
          `(render #${renderCountRef.current})`,
      );
    }

    lastRenderTimeRef.current = now;
  });

  return {
    renderTime: performance.now() - lastRenderTimeRef.current,
    updateCount: renderCountRef.current,
    lastUpdate: lastRenderTimeRef.current,
  };
}

// ✅ Usage in components
function ExpensiveComponent({ data }: { data: ComplexData[] }) {
  const metrics = usePerformanceMonitor('ExpensiveComponent');

  // Your component logic...

  return (
    <div>
      {/* Your UI */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: '10px', color: 'gray' }}>
          Renders: {metrics.updateCount}, Last: {metrics.renderTime.toFixed(1)}ms
        </div>
      )}
    </div>
  );
}
```

## Creating Stable References with Types

The first step toward performance is ensuring stable references. TypeScript can help us catch unstable patterns before they become performance problems.

### Typed Constants and Factories

Instead of creating objects inline, create them outside the component or use proper memoization:

```tsx
// ✅ Stable reference - created once
const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  notifications: true,
} as const;

// ✅ Or use a factory with proper typing
type CreateSettingsOptions = {
  theme: 'light' | 'dark';
  notifications: boolean;
};

const createUserSettings = (options: CreateSettingsOptions) => ({
  ...DEFAULT_SETTINGS,
  ...options,
});

function UserProfile({ userId }: { userId: string }) {
  const [users, setUsers] = useState<User[]>([]);

  // ✅ Memoized with proper dependency tracking
  const userSettings = useMemo(
    () => createUserSettings({ theme: 'dark', notifications: true }),
    [], // No dependencies = stable reference
  );

  // ✅ Stable callback with useCallback
  const handleSettingsChange = useCallback((key: keyof CreateSettingsOptions, value: boolean) => {
    // Update settings logic
  }, []);

  return (
    <UserCard
      user={users.find((u) => u.id === userId)}
      settings={userSettings}
      onSettingsChange={handleSettingsChange}
    />
  );
}
```

### Type-Safe Callback Patterns

One common pattern is creating typed callback factories to ensure stable references:

```tsx
type CallbackFactory<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? (...args: Args) => Return
    : never;
};

const createStableCallbacks = <T extends Record<string, Function>>(
  callbacks: T,
  deps: readonly unknown[],
): CallbackFactory<T> => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => callbacks, deps) as CallbackFactory<T>;
};

// Usage:
function TodoList({ todos }: { todos: Todo[] }) {
  const callbacks = createStableCallbacks(
    {
      onToggle: (id: string) => {
        // Toggle logic
      },
      onDelete: (id: string) => {
        // Delete logic
      },
      onEdit: (id: string, text: string) => {
        // Edit logic
      },
    },
    [],
  ); // Only recreate if dependencies change

  return (
    <div>
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} {...callbacks} />
      ))}
    </div>
  );
}
```

## Typed Selectors for Precise Re-renders

One of the biggest performance wins comes from using selectors that only trigger re-renders when relevant data actually changes. Here's how to create type-safe selectors:

```tsx
// ✅ Generic selector hook with proper typing
function useSelector<TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn?: (a: TResult, b: TResult) => boolean,
) {
  const [state, setState] = useState<TState>(() => getInitialState());

  return useMemo(
    () => selector(state),
    [state, selector], // Runs when state or selector changes
  );
}

// ✅ Memoized selectors prevent unnecessary recalculations
const selectUserById = (userId: string) =>
  useMemo(() => (state: AppState) => state.users.find((user) => user.id === userId), [userId]);

const selectUserProjects = (userId: string) =>
  useMemo(
    () => (state: AppState) => state.projects.filter((project) => project.ownerId === userId),
    [userId],
  );

// Usage in component:
function UserDashboard({ userId }: { userId: string }) {
  const userSelector = selectUserById(userId);
  const projectsSelector = selectUserProjects(userId);

  const user = useSelector(userSelector);
  const projects = useSelector(projectsSelector);

  // Only re-renders when this specific user or their projects change
  return (
    <div>
      <UserCard user={user} />
      <ProjectsList projects={projects} />
    </div>
  );
}
```

## Real-World Example: Performance-Typed Data Grid

Let's put it all together in a realistic example—a data grid component that's both fast and type-safe:

```tsx
// Core data types
interface GridRow {
  readonly id: string;
  readonly data: Record<string, any>;
}

interface GridColumn {
  readonly id: string;
  readonly header: string;
  readonly accessor: string;
  readonly sortable?: boolean;
}

// Performance-oriented prop types
interface DataGridProps {
  // Data should be readonly to prevent accidental mutations
  rows: readonly GridRow[];
  columns: readonly GridColumn[];

  // Memoized computed values
  sortedRows: MemoizedValue<readonly GridRow[]>;
  visibleColumns: MemoizedValue<readonly GridColumn[]>;

  // Stable callbacks
  onRowClick: StableCallback<[string], void>;
  onSort: StableCallback<[string, 'asc' | 'desc'], void>;

  // Performance hints
  virtualizeRows?: boolean;
  rowHeight: number;
}

const DataGrid = React.memo(
  ({
    rows,
    columns,
    sortedRows,
    visibleColumns,
    onRowClick,
    onSort,
    virtualizeRows = false,
    rowHeight,
  }: DataGridProps) => {
    // Component implementation here
    return (
      <div className="data-grid">
        {/* Header */}
        <div className="grid-header">
          {visibleColumns.map((column) => (
            <GridHeader key={column.id} column={column} onSort={onSort} />
          ))}
        </div>

        {/* Body */}
        <div className="grid-body">
          {sortedRows.map((row) => (
            <GridRow key={row.id} row={row} columns={visibleColumns} onRowClick={onRowClick} />
          ))}
        </div>
      </div>
    );
  },
);

// Usage with proper typing
function UserDataGridContainer() {
  const [users, setUsers] = useState<User[]>([]);
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'name',
    direction: 'asc',
  });

  const columns: readonly GridColumn[] = [
    { id: 'name', header: 'Name', accessor: 'name', sortable: true },
    { id: 'email', header: 'Email', accessor: 'email', sortable: true },
    { id: 'status', header: 'Status', accessor: 'status', sortable: true },
  ];

  const rows: readonly GridRow[] = users.map((user) => ({
    id: user.id,
    data: user,
  }));

  const sortedRows = useMemoizedValue(() => {
    return [...rows].sort((a, b) => {
      const aValue = a.data[sortConfig.column];
      const bValue = b.data[sortConfig.column];

      if (sortConfig.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [rows, sortConfig]);

  const visibleColumns = useMemoizedValue(() => columns, [columns]);

  const handleRowClick = useStableCallback((rowId: string) => {
    console.log('Row clicked:', rowId);
  }, []);

  const handleSort = useStableCallback((column: string, direction: 'asc' | 'desc') => {
    setSortConfig({ column, direction });
  }, []);

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      sortedRows={sortedRows}
      visibleColumns={visibleColumns}
      onRowClick={handleRowClick}
      onSort={handleSort}
      rowHeight={48}
    />
  );
}
```

## Performance Trade-offs and When to Use These Patterns

These patterns aren't free—they add type complexity and some runtime overhead for the type checking utilities. Here's when each pattern makes sense:

**Identity-Based Memo Boundaries**: Use when you have components that re-render frequently with similar props. The type complexity pays off when you have complex prop objects where only some properties affect rendering.

**Stable Reference Types**: Essential for components that are passed as children or in render prop patterns. The `StableCallback` pattern prevents accidental re-renders in deeply nested component trees.

**Readonly Data Contracts**: Most valuable in applications with complex state management where accidental mutations are common. The `DeepReadonly` type prevents entire classes of performance bugs.

**Computed Value Types**: Worth it for expensive computations that are passed to multiple components. The `MemoizedValue` type ensures expensive calculations aren't accidentally repeated.

> [!WARNING]
> Don't over-engineer. These patterns are most valuable in performance-critical components or when working with large datasets. For simple components that render infrequently, the added complexity might not be worth it.

## Common Anti-Patterns (and How to Fix Them)

### Anti-Pattern 1: Inline Object Props

```tsx
// ❌ Bad: New object on every render
function ParentComponent() {
  return (
    <ChildComponent config={{ theme: 'dark', size: 'large' }} style={{ padding: 16, margin: 8 }} />
  );
}

// ✅ Good: Stable references
const DEFAULT_CONFIG = { theme: 'dark', size: 'large' } as const;
const DEFAULT_STYLE = { padding: 16, margin: 8 } as const;

function ParentComponent() {
  return <ChildComponent config={DEFAULT_CONFIG} style={DEFAULT_STYLE} />;
}
```

### Anti-Pattern 2: Unstable Dependencies in Effects

```tsx
// ❌ Bad: Effect runs on every render due to unstable dependency
function UserComponent({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId, setUser]); // setUser is unstable!

  return <div>{user?.name}</div>;
}

// ✅ Good: Remove unstable dependencies
function UserComponent({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // Only userId dependency

  return <div>{user?.name}</div>;
}
```

### Anti-Pattern 3: Premature Optimization

```tsx
// ❌ Bad: Memoizing everything without measuring
function SimpleComponent({ name }: { name: string }) {
  const memoizedName = useMemo(() => name.toUpperCase(), [name]);
  const memoizedStyle = useMemo(() => ({ color: 'blue' }), []);
  const memoizedCallback = useCallback(() => {
    console.log('clicked');
  }, []);

  return (
    <div style={memoizedStyle}>
      {memoizedName}
      <button onClick={memoizedCallback}>Click</button>
    </div>
  );
}

// ✅ Good: Only memoize when it provides value
function SimpleComponent({ name }: { name: string }) {
  // Simple transformations don't need memoization
  const displayName = name.toUpperCase();

  return (
    <div style={{ color: 'blue' }}>
      {displayName}
      <button onClick={() => console.log('clicked')}>Click</button>
    </div>
  );
}
```

> [!TIP]
> Measure first, optimize second. Not every component needs memoization—focus on components that re-render frequently or perform expensive operations.

## Next Steps

Performance patterns informed by types transform TypeScript from a bug-catching tool into a performance architecture guide. By encoding performance contracts in your types, you make performance issues visible at compile time rather than discovering them through profiling and debugging.

The key insight is that performance in React applications is largely about managing reference equality and avoiding unnecessary work. When you use TypeScript to make these concerns explicit in your type system, you get both better performance and more maintainable code.

Type-safe performance patterns aren't about sprinkling `useMemo()` and `useCallback()` everywhere (that can actually hurt performance). They're about using TypeScript to create predictable, stable patterns that prevent unnecessary work:

- **Stable references**: Create objects and functions outside renders or memoize them properly
- **Precise selectors**: Only re-render when relevant data actually changes
- **Smart memoization boundaries**: Use `React.memo()` with stable dependencies
- **Performance monitoring**: Track and catch regressions with typed metrics

The best performance optimization is the one you never had to make because your code was structured correctly from the start. TypeScript helps you build that structure by catching unstable patterns and ensuring your performance optimizations actually work.

Try implementing one of these patterns in your current project—start with stable reference types if you have components that re-render frequently, or readonly data contracts if you're dealing with complex state mutations. You'll be surprised how much clearer your performance intentions become when they're encoded in the type system.

Remember: premature optimization is the root of all evil, but predictable patterns that prevent obvious performance footguns? That's just good engineering.

