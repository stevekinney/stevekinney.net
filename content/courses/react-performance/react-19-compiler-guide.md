---
title: The React 19 Compiler
description: >-
  Master the React Compiler from basics to advanced patterns. Migrate from
  manual optimizations, handle edge cases, and measure real-world improvements.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-22T09:27:10-06:00'
published: true
tags:
  - react
  - performance
  - react-19
  - compiler
  - optimization
---

The React Compiler represents the biggest shift in React performance optimization since hooks. Instead of sprinkling `useMemo`, `useCallback`, and `React.memo` throughout your codebase like performance pixie dust, the compiler analyzes your code at build time and automatically applies optimizations where they actually matter. It's not about making React faster—it's about making React optimization automatic.

But here's the thing: the compiler isn't magic. It's a sophisticated static analysis tool that understands React's rules and patterns. It can't optimize code that breaks those rules, and it won't save you from fundamental architectural problems. This guide shows you exactly how the compiler works, how to prepare your codebase for it, what it can and can't do, and how to measure whether it's actually helping your specific application.

> [!WARNING] The React Compiler is still in pre-release.
> As of this writing—October 1, 2025, The React Compiler moved from “beta” to Release Candidate (RC) in April 2025. The [React team says the release candidate is “stable and near-final” and safe to try in production][1], though it isn’t the final “stable” tag yet.
>
> So, we're going to talk about it, but with the disclaimer that things _might_ change slightly.

**Nota bene**: the React Compiler is great, but not magic. It's worth enabling for most teams writing idiomatic React—just treat it like a guardrail for memoization, not a universal fix.

The compiler automates the boring parts of memoization—stabilizing values and functions so components skip unnecessary work—reducing the need for `useMemo`, `useCallback`, and many `React.memo` fences. This directly cuts prop-churn-driven re-renders without you sprinkling manual cache code everywhere.

**Here is the thing**: You still have to write “correct” React. (I'm sorry.)

- The compiler assumes [the Rules of React][3]. Components must be pure/idempotent, props/state treated as immutable, and side effects kept out of render. If your code violates these, the compiler either skips optimizing or you can see runtime _weirdness_.
- Memoization-for-correctness is a footgun. If your app relies on referential equality (e.g., effects that only work because an object identity stays stable), [the compiler may memoize differently][4] and expose those bugs—think effects over-firing or loops. The fix is to remove the reliance, not to fight the compiler.
- [Library compatibility varies][5]. The official lints flag some patterns as “incompatible,” and the compiler will safely skip those regions; MobX-style observer patterns are a known pitfall you may need to opt out of.
- Builds can get a bit slower. [Next.js][6] integrates the Babel plugin with an SWC optimization to keep impact small, but you may still notice overhead compared to SWC-only pipelines.
- Scope matters. The compiler focuses on memoization. It _won't_ replace proper state architecture, virtualization, Suspense/streaming, or fixing network waterfalls—you still need those patterns.

> [!NOTE] TL;DR
> It automates memoization—great for prop churn and callback identity—but it doesn’t replace good state architecture, virtualization for giant lists, or solving network waterfalls and SSR strategy. You still design for those; the compiler just removes a big class of re-renders so your other work shines.
>
> - **When it's a clear win**
>   - You already follow the Rules of React and avoid side effects in render.
>   - Most “perf issues” come from prop identity churn, unstable callbacks, and derived data recomputation—the compiler neutralizes a lot of that automatically.
> - **When to hold off or gate it**
>   - You depend on memoization for correctness (effect deps that must be referentially stable, conditional logic based on reference checks). Clean that up first or opt out problem files.
>   - You're using libraries/patterns the lints call out as incompatible. Keep those paths uncompiled.

## How the React Compiler Actually Works

The compiler operates at build time, transforming your React code before it ever reaches the browser:

```tsx
// What you write (clean, simple React)
function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const discount = product.price * product.discountRate;
  const finalPrice = product.price - discount;

  const handleAdd = () => {
    trackEvent('add_to_cart', { productId: product.id });
    onAddToCart(product.id);
  };

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <span className="price">${finalPrice.toFixed(2)}</span>
      {discount > 0 && <span className="discount">Save ${discount.toFixed(2)}</span>}
      <button onClick={handleAdd}>Add to Cart</button>
    </div>
  );
}

// What the compiler generates (optimized but equivalent)
function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // Compiler adds memoization for expensive computations
  const discount = useMemo(
    () => product.price * product.discountRate,
    [product.price, product.discountRate],
  );

  const finalPrice = useMemo(() => product.price - discount, [product.price, discount]);

  // Compiler stabilizes callback identity
  const handleAdd = useCallback(() => {
    trackEvent('add_to_cart', { productId: product.id });
    onAddToCart(product.id);
  }, [product.id, onAddToCart]);

  // Compiler can even optimize JSX creation
  return useMemo(
    () => (
      <div className="product-card">
        <img src={product.image} alt={product.name} />
        <h3>{product.name}</h3>
        <span className="price">${finalPrice.toFixed(2)}</span>
        {discount > 0 && <span className="discount">Save ${discount.toFixed(2)}</span>}
        <button onClick={handleAdd}>Add to Cart</button>
      </div>
    ),
    [product.image, product.name, finalPrice, discount, handleAdd],
  );
}
```

### The Compiler's Decision Tree

The compiler uses sophisticated heuristics to decide what to optimize:

```tsx
// Compiler optimization decision flowchart
interface CompilerDecisionCriteria {
  // Will optimize
  willOptimize: {
    expensiveComputations: 'Operations with high computational cost';
    stableReferences: 'Functions and objects passed as props';
    pureComponents: 'Components without side effects';
    staticElements: 'JSX that rarely changes';
  };

  // Won't optimize
  wontOptimize: {
    trivialOperations: 'Simple property access or arithmetic';
    alwaysChanging: 'Values that change on every render';
    sideEffects: 'Operations with external dependencies';
    dynamicCode: 'Code patterns it cannot analyze statically';
  };

  // Context-dependent
  contextual: {
    listItems: 'Optimizes based on list size and complexity';
    conditionals: 'Analyzes branch likelihood';
    hooks: 'Considers hook dependencies and frequency';
  };
}
```

## Pre-Migration Preparation

Before enabling the compiler, your codebase needs to follow React's rules strictly:

### Step 1: Enable Strict Mode Everywhere

```tsx
// The compiler requires Strict Mode for safety checks
// In your app root:
import { StrictMode } from 'react';

function App() {
  return (
    <StrictMode>
      <YourAppContent />
    </StrictMode>
  );
}

// Strict Mode catches:
// - Components with side effects during render
// - Deprecated lifecycle methods
// - Unsafe practices the compiler can't optimize
```

### Step 2: Audit Your Current Optimizations

```tsx
// Script to analyze existing manual optimizations
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as fs from 'fs';
import * as path from 'path';

class OptimizationAuditor {
  private stats = {
    useMemo: 0,
    useCallback: 0,
    ReactMemo: 0,
    totalComponents: 0,
    suspiciousPatterns: [] as string[],
  };

  analyzeFile(filePath: string) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    traverse(ast, {
      CallExpression: (path) => {
        const node = path.node;
        if (node.callee.type === 'Identifier') {
          switch (node.callee.name) {
            case 'useMemo':
              this.stats.useMemo++;
              this.checkMemoUsage(path, filePath);
              break;
            case 'useCallback':
              this.stats.useCallback++;
              this.checkCallbackUsage(path, filePath);
              break;
            case 'memo':
              this.stats.ReactMemo++;
              break;
          }
        }
      },
      FunctionDeclaration: (path) => {
        if (this.isReactComponent(path.node.id?.name)) {
          this.stats.totalComponents++;
        }
      },
    });
  }

  private checkMemoUsage(path: any, filePath: string) {
    // Check for common anti-patterns
    const deps = path.node.arguments[1];
    if (!deps) {
      this.stats.suspiciousPatterns.push(`Missing dependencies in useMemo at ${filePath}`);
    }
  }

  private checkCallbackUsage(path: any, filePath: string) {
    // Check for unnecessary callbacks
    const func = path.node.arguments[0];
    if (func?.body?.body?.length === 1) {
      // Single statement callbacks might not need memoization
      this.stats.suspiciousPatterns.push(`Possibly unnecessary useCallback at ${filePath}`);
    }
  }

  private isReactComponent(name?: string): boolean {
    return !!name && /^[A-Z]/.test(name);
  }

  generateReport() {
    console.log('=== Optimization Audit Report ===');
    console.table({
      'Total Components': this.stats.totalComponents,
      'useMemo Calls': this.stats.useMemo,
      'useCallback Calls': this.stats.useCallback,
      'React.memo Wraps': this.stats.ReactMemo,
      'Suspicious Patterns': this.stats.suspiciousPatterns.length,
    });

    if (this.stats.suspiciousPatterns.length > 0) {
      console.log('\n⚠️ Suspicious Patterns Found:');
      this.stats.suspiciousPatterns.forEach((pattern) => {
        console.log(`  - ${pattern}`);
      });
    }

    // Calculate optimization density
    const optimizationDensity =
      (this.stats.useMemo + this.stats.useCallback + this.stats.ReactMemo) /
      this.stats.totalComponents;

    console.log(`\nOptimization Density: ${optimizationDensity.toFixed(2)} per component`);

    if (optimizationDensity > 3) {
      console.log(
        '⚠️ High optimization density detected. The compiler will likely help significantly.',
      );
    }
  }
}

// Run the audit
const auditor = new OptimizationAuditor();
const srcDir = './src';

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      auditor.analyzeFile(filePath);
    }
  });
}

walkDir(srcDir);
auditor.generateReport();
```

### Step 3: Fix Rules of React Violations

```tsx
// Common violations that break compiler optimization

// ❌ Bad: Side effects during render
function BrokenComponent({ userId }: { userId: string }) {
  // This breaks compiler assumptions
  localStorage.setItem('lastUserId', userId);

  return <div>User: {userId}</div>;
}

// ✅ Good: Side effects in useEffect
function FixedComponent({ userId }: { userId: string }) {
  useEffect(() => {
    localStorage.setItem('lastUserId', userId);
  }, [userId]);

  return <div>User: {userId}</div>;
}

// ❌ Bad: Mutating props or state
function MutatingComponent({ items }: { items: Item[] }) {
  // Compiler can't track mutations
  items.sort((a, b) => a.name.localeCompare(b.name));

  return <List items={items} />;
}

// ✅ Good: Create new arrays/objects
function ImmutableComponent({ items }: { items: Item[] }) {
  // Compiler can optimize immutable operations
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  return <List items={sortedItems} />;
}

// ❌ Bad: Conditional hooks
function ConditionalHooks({ isSpecial }: { isSpecial: boolean }) {
  if (isSpecial) {
    // Breaks React's rules and compiler optimization
    useState(0);
  }

  return <div>Component</div>;
}

// ✅ Good: Hooks at top level
function ProperHooks({ isSpecial }: { isSpecial: boolean }) {
  const [state] = useState(0);
  // Use the state conditionally, not the hook
  const value = isSpecial ? state : null;

  return <div>Component</div>;
}
```

## Enabling the React Compiler

Note: This guide focuses on Vite setup. Webpack and other bundlers are out of scope for now.

### Installation and Configuration

```bash
# Install the compiler
npm install --save-dev @react/compiler
```

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
              compilationMode: 'opt-in',
              enableDebugInfo: true,
            },
          ],
        ],
      },
    }),
  ],
});
```

### Gradual Migration Strategy

Start with opt-in mode and gradually expand:

```tsx
// Use directives to control compilation per file

// Option 1: Opt-in specific components
'use compiler';

function OptimizedComponent() {
  // This component will be compiled
  return <div>Optimized by compiler</div>;
}

// Option 2: Opt-out specific components
('use no-compiler');

function LegacyComponent() {
  // This component won't be compiled
  // Useful for components with complex patterns
  return <div>Manual optimizations preserved</div>;
}

// Option 3: File-level configuration
// At the top of the file
('use compiler');

// All components in this file will be compiled
export function Component1() {
  /* ... */
}
export function Component2() {
  /* ... */
}
export function Component3() {
  /* ... */
}
```

## Measuring Compiler Impact

### Before and After Metrics

```tsx
// Create a performance baseline before enabling compiler
class PerformanceBaseline {
  private metrics: Map<string, number[]> = new Map();

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getBaseline(name: string) {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    return {
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: this.median(values),
      p95: this.percentile(values, 95),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  compareWithBaseline(name: string, newValue: number) {
    const baseline = this.getBaseline(name);
    if (!baseline) return null;

    const improvement = ((baseline.mean - newValue) / baseline.mean) * 100;

    return {
      baseline: baseline.mean,
      current: newValue,
      improvement: improvement.toFixed(2) + '%',
      significant: Math.abs(improvement) > 10,
    };
  }
}

// Use in your app
const baseline = new PerformanceBaseline();

function MeasuredComponent() {
  useEffect(() => {
    const start = performance.now();

    // Component work...

    const duration = performance.now() - start;
    baseline.recordMetric('ComponentRender', duration);

    // After enabling compiler, compare
    const comparison = baseline.compareWithBaseline('ComponentRender', duration);
    if (comparison?.significant) {
      console.log(`Compiler impact: ${comparison.improvement}`);
    }
  }, []);

  return <div>Measured Component</div>;
}
```

### Real User Metrics Comparison

```tsx
// Track real user metrics before and after compiler
class RealUserMetrics {
  private enabled = false;
  private sessionId = this.generateSessionId();

  constructor(private compilerEnabled: boolean) {}

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  trackCoreWebVitals() {
    // Using web-vitals library
    import('web-vitals').then(({ getCLS, getFID, getLCP, getFCP, getTTFB }) => {
      getCLS((metric) => this.sendMetric('CLS', metric.value));
      getFID((metric) => this.sendMetric('FID', metric.value));
      getLCP((metric) => this.sendMetric('LCP', metric.value));
      getFCP((metric) => this.sendMetric('FCP', metric.value));
      getTTFB((metric) => this.sendMetric('TTFB', metric.value));
    });
  }

  trackInteraction(name: string, duration: number) {
    this.sendMetric('interaction', duration, { name });
  }

  trackRenderTime(componentName: string, duration: number) {
    this.sendMetric('render', duration, {
      component: componentName,
      compilerEnabled: this.compilerEnabled,
    });
  }

  private sendMetric(name: string, value: number, metadata?: Record<string, any>) {
    // Send to your analytics service
    if (typeof window !== 'undefined' && 'sendBeacon' in navigator) {
      const data = {
        metric: name,
        value,
        sessionId: this.sessionId,
        compilerEnabled: this.compilerEnabled,
        timestamp: Date.now(),
        ...metadata,
      };

      navigator.sendBeacon('/api/metrics', JSON.stringify(data));
    }
  }
}

// Initialize metrics tracking
const metrics = new RealUserMetrics(process.env.REACT_APP_COMPILER_ENABLED === 'true');

metrics.trackCoreWebVitals();
```

## When the Compiler Can't Help

Understanding the compiler's limitations is crucial:

### Dynamic Code Patterns

```tsx
// ❌ Compiler can't optimize dynamic property access
function DynamicComponent({ data, fields }: Props) {
  const values = fields.map((field) => {
    // Dynamic property access prevents optimization
    return data[field];
  });

  return <div>{values.join(', ')}</div>;
}

// ✅ Better: Explicit property access when possible
function ExplicitComponent({ data }: Props) {
  // Compiler can track these dependencies
  const { name, email, phone } = data;

  return (
    <div>
      {name}, {email}, {phone}
    </div>
  );
}
```

### External Dependencies

```tsx
// ❌ Compiler can't optimize external library calls
function ExternalLibComponent() {
  // Lodash operations aren't optimized by React compiler
  const result = _.debounce(() => {
    console.log('Debounced');
  }, 300);

  return <button onClick={result}>Click</button>;
}

// ✅ Better: Use React patterns the compiler understands
function OptimizableComponent() {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

### Complex State Logic

```tsx
// ❌ Compiler struggles with complex reducer logic
function ComplexReducerComponent() {
  const [state, dispatch] = useReducer(complexReducer, initialState);

  // Complex reducer with many cases
  function complexReducer(state: State, action: Action) {
    switch (action.type) {
      case 'COMPLEX_MUTATION':
        // Nested object updates
        return {
          ...state,
          nested: {
            ...state.nested,
            deep: {
              ...state.nested.deep,
              value: action.payload,
            },
          },
        };
      // Many more cases...
    }
  }

  return <div>{/* Component JSX */}</div>;
}

// ✅ Better: Simpler state patterns
function SimplerStateComponent() {
  // Break down complex state into smaller pieces
  const [basicState, setBasicState] = useState(initialBasic);
  const [nestedState, setNestedState] = useState(initialNested);

  // Compiler can optimize these simpler patterns
  const updateNested = useCallback((value: string) => {
    setNestedState((prev) => ({ ...prev, value }));
  }, []);

  return <div>{/* Component JSX */}</div>;
}
```

## Migration Patterns and Best Practices

### Pattern 1: Removing Redundant Memoization

```tsx
// Before compiler: Manually optimized
function BeforeCompiler({ items, filter }: Props) {
  // Manual memoization everywhere
  const filteredItems = useMemo(
    () => items.filter((item) => item.category === filter),
    [items, filter],
  );

  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);

  const totals = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.price, 0);
  }, [filteredItems]);

  return (
    <div>
      {filteredItems.map((item) => (
        <Item key={item.id} item={item} onClick={handleClick} />
      ))}
      <Total value={totals} />
    </div>
  );
}

// After compiler: Clean code, same performance
function AfterCompiler({ items, filter }: Props) {
  // Compiler handles optimization
  const filteredItems = items.filter((item) => item.category === filter);

  const handleClick = (id: string) => {
    console.log('Clicked:', id);
  };

  const totals = filteredItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <div>
      {filteredItems.map((item) => (
        <Item key={item.id} item={item} onClick={handleClick} />
      ))}
      <Total value={totals} />
    </div>
  );
}
```

### Pattern 2: Keeping Strategic Manual Optimizations

```tsx
// Some optimizations should stay even with the compiler

function StrategicOptimization({ data }: { data: LargeDataset }) {
  // Keep: Expensive initialization
  const processedData = useMemo(() => {
    // Explicitly expensive operation
    console.time('ProcessingData');
    const result = performExpensiveProcessing(data);
    console.timeEnd('ProcessingData');
    return result;
  }, [data]);

  // Remove: Trivial memoization
  // const simpleCalc = useMemo(() => x + y, [x, y]);
  // Becomes:
  const simpleCalc = x + y; // Compiler handles this

  // Keep: Ref callbacks for DOM measurements
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // DOM measurements need manual optimization
      const rect = node.getBoundingClientRect();
      reportMeasurement(rect);
    }
  }, []);

  return <div ref={measureRef}>{/* Content */}</div>;
}
```

### Pattern 3: Compiler-Friendly Component Design

```tsx
// Design components to maximize compiler optimization

// ✅ Compiler-friendly: Pure, predictable
function CompilerFriendly({ user, posts }: Props) {
  // Simple, direct data access
  const userPosts = posts.filter((p) => p.authorId === user.id);
  const postCount = userPosts.length;

  // Clear component boundaries
  return (
    <div>
      <UserHeader user={user} postCount={postCount} />
      <PostList posts={userPosts} />
    </div>
  );
}

// ❌ Compiler-hostile: Too much indirection
function CompilerHostile({ data }: Props) {
  // Complex property chains
  const value = data?.nested?.deep?.maybe?.exists || fallback;

  // Dynamic method calls
  const processor = processors[data.type];
  const result = processor?.(data);

  // Unclear dependencies
  return <div>{result}</div>;
}
```

## Debugging Compiler Issues

When things don't work as expected:

```tsx
// Enable compiler debug mode
const CompilerDebugger = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      if (window.__REACT_COMPILER_DEBUG__) {
        console.log('Compiler Debug Info:', window.__REACT_COMPILER_DEBUG__);
      }
    }
  }, []);

  return null;
};

// Add compiler hints for edge cases
function HintedComponent({ complexProp }: Props) {
  // Compiler hint: This is expensive
  /* @compiler-expensive */
  const result = veryExpensiveOperation(complexProp);

  // Compiler hint: Don't optimize this
  /* @compiler-skip */
  const dynamic = dynamicOperation();

  // Compiler hint: These are stable
  /* @compiler-stable */
  const config = { ...defaultConfig, ...userConfig };

  return <div>{/* Component content */}</div>;
}
```

## Performance Comparison Dashboard

Build a dashboard to track compiler effectiveness:

```tsx
function CompilerDashboard() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [compilerEnabled] = useState(() => process.env.REACT_APP_COMPILER === 'true');

  useEffect(() => {
    // Collect metrics
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const newMetrics = entries.map((entry) => ({
        name: entry.name,
        duration: entry.duration,
        timestamp: entry.startTime,
        compilerEnabled,
      }));

      setMetrics((prev) => [...prev, ...newMetrics]);
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, [compilerEnabled]);

  const analysis = useMemo(() => {
    const grouped = metrics.reduce(
      (acc, metric) => {
        const key = `${metric.name}-${metric.compilerEnabled}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(metric.duration);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    return Object.entries(grouped).map(([key, durations]) => {
      const [name, enabled] = key.split('-');
      return {
        name,
        compilerEnabled: enabled === 'true',
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length,
      };
    });
  }, [metrics]);

  return (
    <div className="compiler-dashboard">
      <h2>Compiler Performance Impact</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Without Compiler</th>
            <th>With Compiler</th>
            <th>Improvement</th>
          </tr>
        </thead>
        <tbody>
          {analysis.map((metric) => {
            const withoutCompiler = analysis.find(
              (m) => m.name === metric.name && !m.compilerEnabled,
            );
            const withCompiler = analysis.find((m) => m.name === metric.name && m.compilerEnabled);

            if (!withoutCompiler || !withCompiler) return null;

            const improvement =
              ((withoutCompiler.avg - withCompiler.avg) / withoutCompiler.avg) * 100;

            return (
              <tr key={metric.name}>
                <td>{metric.name}</td>
                <td>{withoutCompiler.avg.toFixed(2)}ms</td>
                <td>{withCompiler.avg.toFixed(2)}ms</td>
                <td className={improvement > 0 ? 'positive' : 'negative'}>
                  {improvement.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

## Migration Checklist

Before declaring your migration complete:

```typescript
interface MigrationChecklist {
  preparation: {
    strictMode: 'Enable React.StrictMode everywhere';
    rulesOfReact: 'Fix all Rules of React violations';
    baseline: 'Measure performance baseline metrics';
    tests: 'Ensure all tests pass before starting';
  };

  implementation: {
    gradual: 'Start with opt-in mode';
    measure: 'Compare metrics after each phase';
    debug: 'Enable debug mode in development';
    monitor: 'Watch for runtime errors or warnings';
  };

  validation: {
    performance: 'Verify performance improvements';
    functionality: 'Test all features still work';
    bundle: 'Check bundle size impact';
    memory: 'Monitor memory usage changes';
  };

  cleanup: {
    memoization: 'Remove unnecessary manual optimizations';
    comments: 'Update code comments about optimization';
    documentation: 'Document compiler configuration';
    monitoring: 'Set up ongoing performance tracking';
  };
}
```

## Adoption Guidance That Won't Bite You

Start with the official “incremental adoption” playbook: enable the Babel plugin, gate to a directory or feature flag, and lean on directives. Prefer the default inference mode; explicitly opt out hot spots with a directive while you fix code smells. ([React][7])

```tsx
function HotPathPanel() {
  'use no memo'; // temporary escape hatch while refactoring
  // …
}
```

The documentation recommend this as a temporary fence; there’s also [a `'use memo'` directive][8], but you rarely need it outside annotation mode.

Turn it on—deliberately. The compiler will erase a lot of memo boilerplate and prevent entire classes of accidental re-renders, but it won't paper over architectural issues or effect misuse. Adopt incrementally, measure, and keep an easy escape hatch for the few places where it conflicts with your current patterns. Then let it do its thing.

I can generate a short “enable → gate → measure → expand” checklist tailored to your stack (Next + Vite + Tailwind + TS) whenever you're ready.

## Wrapping Up

The React Compiler is a powerful tool that can dramatically simplify your codebase while maintaining or improving performance. The key to successful adoption is understanding what it can and can't do, preparing your codebase properly, and measuring the actual impact on your specific application.

Start with a gradual migration, measure everything, and don't be afraid to keep some manual optimizations where they make sense. The compiler isn't about replacing all manual optimization—it's about automating the routine optimizations so you can focus on the architectural decisions that really matter.

Remember: the best performance optimization is the one you don't have to think about. The React Compiler gets us closer to that ideal, letting us write clean, simple React code while getting optimized performance automatically.

[1]: https://react.dev/blog/2025/04/21/react-compiler-rc 'React Compiler RC'
[2]: https://react.dev/learn/react-compiler 'React Compiler'
[3]: https://react.dev/reference/rules 'Rules of React'
[4]: https://react.dev/learn/react-compiler/debugging 'Debugging and Troubleshooting – React'
[5]: https://react.dev/reference/eslint-plugin-react-hooks/lints/incompatible-library 'incompatible-library'
[6]: https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler 'next.config.js: reactCompiler'
[7]: https://react.dev/learn/react-compiler/installation 'Installation'
[8]: https://react.dev/reference/react-compiler/directives/use-no-memo "'use no memo' directive"
[9]: https://react.dev/learn/react-compiler/incremental-adoption 'Incremental Adoption'
