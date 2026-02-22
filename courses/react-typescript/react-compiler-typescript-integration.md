---
title: React Compiler + TypeScript Integration
description: >-
  Master React's new compiler with TypeScript—automatic memoization,
  optimization hints, and type-safe compiler directives.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - typescript
  - react-compiler
  - optimization
  - memoization
---

React Compiler (formerly React Forget) is changing the game for React performance. It automatically memoizes your components and hooks, eliminating the need for manual `useMemo`, `useCallback`, and `React.memo` in most cases. But here's the kicker: when you combine it with TypeScript, you get a development experience that's not just faster, but smarter. The compiler understands your types and uses them to make better optimization decisions.

Think of React Compiler as your performance copilot. It watches your code, understands your intent through TypeScript types, and automatically applies optimizations that would be tedious to write by hand. Let's explore how to set it up, use it effectively, and leverage TypeScript to get the most out of automatic memoization.

## Understanding React Compiler

Before diving into the TypeScript integration, let's understand what React Compiler actually does and why it matters.

### What Gets Optimized

React Compiler automatically optimizes:

- Component re-renders (like `React.memo`)
- Hook dependencies (like `useMemo` and `useCallback`)
- Expensive computations
- Prop reference stability

Here's a before and after example:

```tsx
// Before: Manual optimization with lots of boilerplate
const ExpensiveComponent: React.FC<{ data: Data[]; filter: string }> = React.memo(
  ({ data, filter }) => {
    const filteredData = useMemo(
      () => data.filter((item) => item.name.includes(filter)),
      [data, filter],
    );

    const handleClick = useCallback((id: string) => {
      console.log('Clicked:', id);
    }, []);

    const expensiveValue = useMemo(() => computeExpensiveValue(filteredData), [filteredData]);

    return (
      <div>
        {filteredData.map((item) => (
          <Item
            key={item.id}
            item={item}
            onClick={handleClick}
            highlight={expensiveValue === item.id}
          />
        ))}
      </div>
    );
  },
);

// After: React Compiler handles it automatically
const ExpensiveComponent: React.FC<{ data: Data[]; filter: string }> = ({ data, filter }) => {
  const filteredData = data.filter((item) => item.name.includes(filter));

  const handleClick = (id: string) => {
    console.log('Clicked:', id);
  };

  const expensiveValue = computeExpensiveValue(filteredData);

  return (
    <div>
      {filteredData.map((item) => (
        <Item
          key={item.id}
          item={item}
          onClick={handleClick}
          highlight={expensiveValue === item.id}
        />
      ))}
    </div>
  );
};
```

The compiler automatically figures out what needs memoization and applies it during the build process.

## Setting Up React Compiler with TypeScript

Let's get React Compiler working in your TypeScript project. The setup varies slightly depending on your build tool.

### Installation

```bash
# Install the React Compiler plugin
npm install --save-dev babel-plugin-react-compiler

# Or if you're using the experimental ESLint plugin
npm install --save-dev eslint-plugin-react-compiler
```

### Vite Configuration

For Vite projects, integrate the compiler through the React plugin:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'babel-plugin-react-compiler',
            {
              // Compiler options
              runtimeModule: 'react-compiler-runtime',
            },
          ],
        ],
      },
    }),
  ],
});
```

### Next.js Configuration

For Next.js projects, add it to your `next.config.js`:

```javascript
// next.config.js
module.exports = {
  experimental: {
    reactCompiler: {
      compilationMode: 'all', // or 'annotation' for gradual adoption
    },
  },
};
```

### TypeScript Configuration

Update your `tsconfig.json` to work optimally with the compiler:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "react-jsx",
    "strict": true,

    // Important for React Compiler
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Helps the compiler understand your code better
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,

    // Module resolution
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,

    // Output
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Type-Safe Compiler Directives

React Compiler introduces directives that give you fine-grained control over optimizations. With TypeScript, we can make these directives type-safe.

### The 'use no memo' Directive

Sometimes you need to opt out of automatic memoization:

```tsx
// Type-safe directive helper
type CompilerDirective = 'use no memo' | 'use memo';

function withDirective<P extends object>(
  directive: CompilerDirective,
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  // This is a compile-time hint, not a runtime wrapper
  return Component;
}

// Usage: Opt out of memoization for frequently updating components
function RealtimeCounter({ value }: { value: number }) {
  'use no memo'; // Directive at function level

  // This component updates every frame, memoization would hurt performance
  return <div className="counter">{value}</div>;
}

// Alternative: Component-level annotation
const LiveFeed: React.FC<{ messages: Message[] }> = ({ messages }) => {
  'use no memo';

  return (
    <div className="feed">
      {messages.map((msg) => (
        <div key={msg.id} className="message">
          {msg.text}
        </div>
      ))}
    </div>
  );
};
```

### Custom Optimization Hints

Create type-safe optimization hints for the compiler:

```tsx
// Type definitions for compiler hints
interface CompilerHints {
  readonly memoize?: boolean;
  readonly pure?: boolean;
  readonly invalidateOn?: ReadonlyArray<string>;
}

// Type-safe component with hints
interface OptimizedComponentProps<P = {}> {
  props: P;
  hints?: CompilerHints;
}

// Helper to create optimized components
function createOptimizedComponent<P extends object>(config: {
  hints?: CompilerHints;
  render: (props: P) => React.ReactElement;
}): React.FC<P> {
  const Component: React.FC<P> = (props) => {
    // Compiler uses these hints during optimization
    return config.render(props);
  };

  // Attach hints as metadata (used by compiler plugin)
  (Component as any).__compilerHints = config.hints;

  return Component;
}

// Usage
const DataGrid = createOptimizedComponent<{
  data: Row[];
  columns: Column[];
}>({
  hints: {
    memoize: true,
    invalidateOn: ['data', 'columns'],
  },
  render: ({ data, columns }) => <table>{/* Grid implementation */}</table>,
});
```

## TypeScript Patterns for Better Compilation

Certain TypeScript patterns help the React Compiler make better optimization decisions.

### Const Assertions for Stable References

```tsx
// ✅ Good: Const assertions create stable references
const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' },
  { value: 'size', label: 'Size' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

function SortableList({ items }: { items: Item[] }) {
  const [sortBy, setSortBy] = useState<SortOption['value']>('name');

  // Compiler knows SORT_OPTIONS is stable, won't recreate
  return (
    <div>
      <select onChange={(e) => setSortBy(e.target.value as SortOption['value'])}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* List rendering */}
    </div>
  );
}

// ❌ Bad: Without const assertion, compiler might not optimize
const DYNAMIC_OPTIONS = [
  { value: 'name', label: 'Name' },
  // ...
]; // Not const, might be recreated
```

### Discriminated Unions for Predictable Rendering

```tsx
// The compiler can better optimize discriminated unions
type ViewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };

function DataView() {
  const [state, setState] = useState<ViewState>({ status: 'idle' });

  // Compiler understands each branch is independent
  switch (state.status) {
    case 'idle':
      return <IdleView onStart={() => setState({ status: 'loading' })} />;

    case 'loading':
      return <LoadingView />;

    case 'success':
      // Compiler knows data exists here
      return <SuccessView data={state.data} />;

    case 'error':
      // Compiler knows error exists here
      return <ErrorView error={state.error} retry={() => setState({ status: 'idle' })} />;
  }
}
```

### Pure Functions with Type Guards

```tsx
// Type guards help the compiler understand pure functions
function isPremiumUser(user: User): user is PremiumUser {
  return user.subscription === 'premium';
}

function UserDashboard({ user }: { user: User }) {
  // Compiler can optimize this check
  if (isPremiumUser(user)) {
    return <PremiumDashboard user={user} features={user.premiumFeatures} />;
  }

  return <StandardDashboard user={user} />;
}

// Even better: Branded types for compile-time guarantees
type UserId = string & { __brand: 'UserId' };
type PostId = string & { __brand: 'PostId' };

function createPost(userId: UserId, content: string): Post {
  // Compiler knows these IDs are distinct types
  return {
    id: generateId() as PostId,
    authorId: userId,
    content,
    createdAt: new Date().toISOString(),
  };
}
```

## Debugging Compiler Optimizations

Understanding what the compiler is doing helps you write better code.

### Compiler Output Analysis

Create a development utility to inspect compiler output:

```tsx
// utils/compiler-debug.ts
interface CompilerDebugInfo {
  component: string;
  optimizations: {
    memoized: boolean;
    hoistedValues: string[];
    stableRefs: string[];
  };
  warnings?: string[];
}

// Development-only debugging hook
function useCompilerDebug(componentName: string): CompilerDebugInfo | null {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // This would be populated by a compiler plugin
  const debugInfo = (window as any).__REACT_COMPILER_DEBUG__?.[componentName];

  useEffect(() => {
    if (debugInfo) {
      console.group(`🔧 Compiler Debug: ${componentName}`);
      console.log('Optimizations:', debugInfo.optimizations);
      if (debugInfo.warnings?.length) {
        console.warn('Warnings:', debugInfo.warnings);
      }
      console.groupEnd();
    }
  }, [componentName, debugInfo]);

  return debugInfo;
}

// Usage in development
function ComplexComponent({ data }: { data: Data[] }) {
  const debug = useCompilerDebug('ComplexComponent');

  // Your component logic
  const processed = processData(data);

  return <div>{/* Render */}</div>;
}
```

### Type-Safe Performance Markers

Add performance markers that work with the compiler:

```tsx
// Performance marking types
interface PerformanceMark {
  readonly name: string;
  readonly metadata?: Record<string, unknown>;
}

function createPerformanceMark<T extends string>(
  name: T,
  metadata?: Record<string, unknown>,
): PerformanceMark & { readonly __type: T } {
  return { name, metadata } as any;
}

// Compiler-aware performance tracking
function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  markName: string,
): React.ComponentType<P> {
  return function TrackedComponent(props: P) {
    useEffect(() => {
      performance.mark(`${markName}-start`);

      return () => {
        performance.mark(`${markName}-end`);
        performance.measure(markName, `${markName}-start`, `${markName}-end`);
      };
    }, []);

    return <Component {...props} />;
  };
}

// Usage
const TrackedDataGrid = withPerformanceTracking(DataGrid, 'DataGrid');
```

## Advanced Compiler Patterns

Let's explore advanced patterns that leverage both TypeScript and the React Compiler.

### Automatic Hook Dependency Inference

The compiler can infer dependencies, but TypeScript can make it safer:

```tsx
// Type-safe dependency tracking
type DependencyList = ReadonlyArray<unknown>;

interface ComputedValue<T> {
  readonly value: T;
  readonly dependencies: DependencyList;
}

function useComputed<T>(compute: () => T, deps?: DependencyList): ComputedValue<T> {
  // React Compiler automatically optimizes this
  const value = compute();

  return {
    value,
    dependencies: deps ?? [],
  };
}

// Usage - compiler handles memoization
function AnalyticsView({ data }: { data: DataPoint[] }) {
  const stats = useComputed(() => ({
    total: data.length,
    average: data.reduce((sum, d) => sum + d.value, 0) / data.length,
    max: Math.max(...data.map((d) => d.value)),
    min: Math.min(...data.map((d) => d.value)),
  }));

  return (
    <div>
      <Stat label="Total" value={stats.value.total} />
      <Stat label="Average" value={stats.value.average} />
      <Stat label="Max" value={stats.value.max} />
      <Stat label="Min" value={stats.value.min} />
    </div>
  );
}
```

### Compiler-Friendly Context Patterns

```tsx
// Type-safe context with compiler optimizations
interface CreateOptimizedContextOptions<T> {
  displayName?: string;
  defaultValue?: T;
  // Hint to compiler about update frequency
  updateFrequency?: 'static' | 'rare' | 'frequent';
}

function createOptimizedContext<T>(options: CreateOptimizedContextOptions<T> = {}) {
  const Context = createContext<T | undefined>(options.defaultValue);

  // Add compiler hints
  (Context as any).__compilerHints = {
    updateFrequency: options.updateFrequency ?? 'rare',
  };

  const useContextValue = (): T => {
    const value = useContext(Context);
    if (value === undefined) {
      throw new Error(`useContext must be used within ${options.displayName ?? 'Provider'}`);
    }
    return value;
  };

  const Provider: React.FC<{ value: T; children: React.ReactNode }> = ({ value, children }) => {
    // Compiler optimizes based on updateFrequency hint
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  return {
    Provider,
    useValue: useContextValue,
  };
}

// Usage with static data (heavily optimized)
const ThemeContext = createOptimizedContext<Theme>({
  displayName: 'Theme',
  updateFrequency: 'static',
  defaultValue: defaultTheme,
});

// Usage with frequently changing data (less aggressive optimization)
const RealtimeContext = createOptimizedContext<RealtimeData>({
  displayName: 'Realtime',
  updateFrequency: 'frequent',
});
```

### Compile-Time Component Composition

```tsx
// Type-safe component composition with compiler optimization
type ComponentConfig<P> = {
  component: React.ComponentType<P>;
  props?: Partial<P>;
  memoize?: boolean;
};

function composeComponents<P extends object>(
  ...configs: ComponentConfig<P>[]
): React.ComponentType<P> {
  // Compiler optimizes the composition
  return function ComposedComponent(props: P) {
    return configs.reduceRight(
      (children, config) => {
        const Component = config.component;
        const mergedProps = { ...config.props, ...props } as P;
        return <Component {...mergedProps}>{children}</Component>;
      },
      null as React.ReactElement | null,
    );
  };
}

// Usage - creates optimized component pipeline
const EnhancedDataView = composeComponents<DataViewProps>(
  { component: ErrorBoundary },
  { component: LoadingWrapper, props: { fallback: <Spinner /> } },
  { component: DataProvider },
  { component: DataView, memoize: true },
);
```

## Migrating Existing Code

When migrating existing TypeScript React code to use the compiler, follow these patterns:

### Remove Unnecessary Memoization

```tsx
// Before: Manual memoization everywhere
const OldComponent: React.FC<Props> = React.memo(({ data, filter }) => {
  const filtered = useMemo(() => expensiveFilter(data, filter), [data, filter]);

  const handleClick = useCallback((id: string) => {
    console.log(id);
  }, []);

  return <div onClick={handleClick}>{filtered.map(renderItem)}</div>;
});

// After: Let the compiler handle it
const NewComponent: React.FC<Props> = ({ data, filter }) => {
  const filtered = expensiveFilter(data, filter);

  const handleClick = (id: string) => {
    console.log(id);
  };

  return <div onClick={handleClick}>{filtered.map(renderItem)}</div>;
};

// Migration helper
function migrateComponent<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Migrating ${Component.displayName || Component.name} to React Compiler`);
  }

  // Remove HOCs like React.memo - compiler handles it
  return Component;
}
```

### Gradual Adoption Strategy

```tsx
// Use compilation mode for gradual adoption
interface CompilerConfig {
  mode: 'all' | 'annotation' | 'none';
  include?: string[];
  exclude?: string[];
}

// In your config
const compilerConfig: CompilerConfig = {
  mode: 'annotation', // Only compile annotated components
  exclude: ['src/legacy/**'], // Skip legacy code
};

// Annotate components ready for compilation
function ModernComponent() {
  'use compiler'; // Opt-in to compilation

  // Component code
}

// Legacy components remain untouched
function LegacyComponent() {
  // No annotation, no compilation
  // Existing memoization still works
}
```

## Performance Monitoring

Track the impact of React Compiler optimizations:

```tsx
// Type-safe performance monitoring
interface CompilerMetrics {
  componentsOptimized: number;
  rendersSaved: number;
  memoizationHits: number;
  compilationTime: number;
}

class CompilerPerformanceMonitor {
  private metrics: CompilerMetrics = {
    componentsOptimized: 0,
    rendersSaved: 0,
    memoizationHits: 0,
    compilationTime: 0,
  };

  trackRender(componentName: string, skipped: boolean): void {
    if (skipped) {
      this.metrics.rendersSaved++;
      this.metrics.memoizationHits++;
    }
  }

  getMetrics(): Readonly<CompilerMetrics> {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      componentsOptimized: 0,
      rendersSaved: 0,
      memoizationHits: 0,
      compilationTime: 0,
    };
  }
}

// Hook for monitoring in development
function useCompilerMetrics() {
  const [metrics, setMetrics] = useState<CompilerMetrics>();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const monitor = new CompilerPerformanceMonitor();

      const interval = setInterval(() => {
        setMetrics(monitor.getMetrics());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  return metrics;
}

// Development dashboard
function CompilerDashboard() {
  const metrics = useCompilerMetrics();

  if (!metrics) return null;

  return (
    <div className="compiler-dashboard">
      <h3>React Compiler Metrics</h3>
      <dl>
        <dt>Components Optimized</dt>
        <dd>{metrics.componentsOptimized}</dd>

        <dt>Renders Saved</dt>
        <dd>{metrics.rendersSaved}</dd>

        <dt>Memoization Hit Rate</dt>
        <dd>{((metrics.memoizationHits / (metrics.rendersSaved + 1)) * 100).toFixed(2)}%</dd>
      </dl>
    </div>
  );
}
```

## Best Practices and Pitfalls

### Do's and Don'ts

```tsx
// ✅ DO: Write clean, idiomatic React code
function GoodComponent({ items }: { items: Item[] }) {
  const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ul>
      {sortedItems.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}

// ❌ DON'T: Fight the compiler with weird patterns
function BadComponent({ items }: { items: Item[] }) {
  // Don't try to outsmart the compiler
  const memoizedItems = useRef(items);

  if (memoizedItems.current !== items) {
    memoizedItems.current = items;
  }

  // This confuses both the compiler and other developers
  return <div>{/* ... */}</div>;
}

// ✅ DO: Use TypeScript features that help the compiler
const enum ViewMode {
  Grid = 'grid',
  List = 'list',
  Card = 'card',
}

function ViewSwitcher({ mode }: { mode: ViewMode }) {
  // Compiler can optimize enum switches effectively
  switch (mode) {
    case ViewMode.Grid:
      return <GridView />;
    case ViewMode.List:
      return <ListView />;
    case ViewMode.Card:
      return <CardView />;
  }
}

// ❌ DON'T: Use dynamic property access unnecessarily
function DynamicComponent({ componentType }: { componentType: string }) {
  // Compiler can't optimize dynamic imports well
  const Component = componentMap[componentType];
  return <Component />;
}
```

## The Future of React Compiler

React Compiler is evolving rapidly. Here's what to watch for:

```tsx
// Future: Compiler directives as types
type CompilerOptimized<T> = T & {
  readonly __compilerHints: {
    readonly pure: true;
    readonly memoize: true;
  };
};

// Future: Compile-time optimization validation
function validateOptimizations<P>(
  Component: React.ComponentType<P>,
): asserts Component is CompilerOptimized<React.ComponentType<P>> {
  // Compile-time validation
}

// Future: Smart bundling based on component usage
interface SmartBundleConfig {
  entryPoint: React.ComponentType;
  optimizer: 'react-compiler';
  splitStrategy: 'route' | 'component' | 'smart';
}
```

## Wrapping Up

React Compiler with TypeScript isn't just about automatic performance optimization—it's about writing cleaner, more maintainable code. By removing the manual memoization burden, you can focus on your component logic while TypeScript ensures type safety and the compiler ensures performance.

Remember: the goal isn't to write code for the compiler, but to write good React code that the compiler can optimize effectively. With TypeScript providing the type safety and React Compiler handling the performance, you get the best of both worlds—a codebase that's both fast and maintainable.
