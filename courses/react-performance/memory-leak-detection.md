---
title: Memory Leak Detection in React Applications
description: >-
  Find and fix memory leaks that kill performance. Master Chrome DevTools,
  detect common patterns, and build leak-free React apps.
date: 2025-09-07T00:45:00.000Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - debugging
  - memory
---

Memory leaks in React applications are silent killers. Your app launches smoothly, but after an hour of use, it consumes 500MB of RAM and feels sluggish. Users navigate between pages, components mount and unmount, but something holds onto memory that should have been freed. The garbage collector runs, but memory usage keeps climbing. Eventually, the tab crashes or the mobile browser kills your app.

The insidious nature of memory leaks makes them particularly dangerous—they're invisible during development but catastrophic in production. A single event listener that's never removed, a closure that captures a large object, or a timer that never gets cleared can transform a snappy React app into a memory-hungry monster. The key is systematic detection, understanding common patterns, and building defensive coding practices.

## Understanding Memory Leaks in React

Memory leaks occur when your JavaScript code holds references to objects that should be garbage collected. For a deep dive into how JavaScript memory management and garbage collection work, see [Memory Management Deep Dive](./memory-management-deep-dive.md).

In React applications, memory leaks typically follow these patterns:

- **Event listeners** that aren't removed on component unmount
- **Timers and intervals** that continue running after component cleanup
- **Closures** that capture large objects unnecessarily
- **Global references** to component callbacks or state
- **Subscriptions** to external services without proper cleanup

```tsx
// Quick examples of leak-prone patterns
function ProblematicComponent({ data }: { data: LargeData[] }) {
  useEffect(() => {
    // ❌ Event listener leak
    window.addEventListener('scroll', handleScroll);
    // Missing cleanup

    // ❌ Timer leak
    const interval = setInterval(updateData, 1000);
    // Missing clearInterval

    // ❌ Subscription leak
    const subscription = dataService.subscribe(handleUpdate);
    // Missing unsubscribe
  }, []);

  // ❌ Closure leak - captures entire data array
  const processItem = useCallback(
    (id: string) => {
      return data.find((item) => item.id === id);
    },
    [data],
  );

  return <div>Component content</div>;
}
```

The key to prevention is systematic cleanup and understanding which patterns create persistent references.

## Chrome DevTools Memory Profiling

Chrome DevTools provides powerful tools for detecting memory leaks:

### Taking Memory Snapshots

```tsx
// Memory profiling utility for development
class MemoryProfiler {
  private snapshots: Array<{
    name: string;
    timestamp: number;
    heapSize: number;
  }> = [];

  takeSnapshot(name: string): void {
    if (process.env.NODE_ENV !== 'development') return;

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    const heapSize = (performance as any).memory?.usedJSHeapSize || 0;

    this.snapshots.push({
      name,
      timestamp: Date.now(),
      heapSize,
    });

    console.log(`📸 Memory snapshot "${name}": ${(heapSize / 1024 / 1024).toFixed(2)}MB`);
  }

  compareSnapshots(before: string, after: string): void {
    const beforeSnapshot = this.snapshots.find((s) => s.name === before);
    const afterSnapshot = this.snapshots.find((s) => s.name === after);

    if (!beforeSnapshot || !afterSnapshot) {
      console.error('Snapshots not found');
      return;
    }

    const diff = afterSnapshot.heapSize - beforeSnapshot.heapSize;
    const diffMB = diff / 1024 / 1024;

    console.log(`🔍 Memory comparison "${before}" → "${after}": ${diffMB.toFixed(2)}MB`);

    if (diffMB > 5) {
      console.warn(`⚠️ Potential memory leak detected: ${diffMB.toFixed(2)}MB increase`);
    }
  }

  generateReport(): string {
    if (this.snapshots.length === 0) return 'No snapshots available';

    let report = '# Memory Usage Report\n\n';

    this.snapshots.forEach((snapshot, index) => {
      const sizeMB = (snapshot.heapSize / 1024 / 1024).toFixed(2);
      report += `${index + 1}. **${snapshot.name}**: ${sizeMB}MB\n`;

      if (index > 0) {
        const prev = this.snapshots[index - 1];
        const diff = ((snapshot.heapSize - prev.heapSize) / 1024 / 1024).toFixed(2);
        report += `   *Change from previous: ${diff}MB*\n`;
      }
    });

    return report;
  }
}

// Global profiler instance for development
const memoryProfiler = new MemoryProfiler();

// React hook for memory profiling
function useMemoryProfiler(componentName: string) {
  useEffect(() => {
    memoryProfiler.takeSnapshot(`${componentName} mounted`);

    return () => {
      memoryProfiler.takeSnapshot(`${componentName} unmounted`);
    };
  }, [componentName]);

  return {
    takeSnapshot: (name: string) => {
      memoryProfiler.takeSnapshot(`${componentName} ${name}`);
    },
    compareSnapshots: memoryProfiler.compareSnapshots.bind(memoryProfiler),
  };
}

// Usage in components
function ProfiledComponent() {
  const { takeSnapshot } = useMemoryProfiler('ProfiledComponent');

  const handleLoadData = async () => {
    takeSnapshot('before data load');

    // Load large dataset
    const data = await fetchLargeDataset();

    takeSnapshot('after data load');
  };

  return (
    <div>
      <button onClick={handleLoadData}>Load Data</button>
    </div>
  );
}
```

### Automated Memory Leak Detection

```tsx
// Automated memory leak detector
class MemoryLeakDetector {
  private isMonitoring = false;
  private baseline: number = 0;
  private samples: number[] = [];
  private alertThreshold = 50 * 1024 * 1024; // 50MB
  private callbacks: Array<(leak: MemoryLeakInfo) => void> = [];

  interface MemoryLeakInfo {
    currentUsage: number;
    baseline: number;
    leakSize: number;
    samples: number[];
    duration: number;
  }

  startMonitoring(): void {
    if (this.isMonitoring || process.env.NODE_ENV !== 'development') return;

    this.isMonitoring = true;
    this.baseline = this.getCurrentMemoryUsage();
    this.samples = [this.baseline];

    console.log('🔍 Starting memory leak detection...');

    // Monitor memory every 5 seconds
    const interval = setInterval(() => {
      this.checkForLeaks();
    }, 5000);

    // Stop monitoring after 30 minutes
    setTimeout(() => {
      clearInterval(interval);
      this.stopMonitoring();
    }, 30 * 60 * 1000);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('🛑 Stopped memory leak detection');

    // Generate final report
    this.generateLeakReport();
  }

  onLeakDetected(callback: (leak: MemoryLeakInfo) => void): void {
    this.callbacks.push(callback);
  }

  private checkForLeaks(): void {
    const currentUsage = this.getCurrentMemoryUsage();
    this.samples.push(currentUsage);

    // Keep only last 20 samples
    if (this.samples.length > 20) {
      this.samples = this.samples.slice(-20);
    }

    const leakSize = currentUsage - this.baseline;

    // Check for memory leak
    if (leakSize > this.alertThreshold) {
      const leakInfo: MemoryLeakInfo = {
        currentUsage,
        baseline: this.baseline,
        leakSize,
        samples: [...this.samples],
        duration: this.samples.length * 5000, // 5 seconds per sample
      };

      console.warn(`🚨 Memory leak detected: ${(leakSize / 1024 / 1024).toFixed(2)}MB`);

      // Notify callbacks
      this.callbacks.forEach(callback => callback(leakInfo));
    }
  }

  private getCurrentMemoryUsage(): number {
    if (!(performance as any).memory) return 0;
    return (performance as any).memory.usedJSHeapSize;
  }

  private generateLeakReport(): void {
    if (this.samples.length < 2) return;

    const finalUsage = this.samples[this.samples.length - 1];
    const totalLeak = finalUsage - this.baseline;
    const avgGrowth = totalLeak / this.samples.length;

    console.group('📊 Memory Leak Detection Report');
    console.log(`Initial memory: ${(this.baseline / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Final memory: ${(finalUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total growth: ${(totalLeak / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Average growth per check: ${(avgGrowth / 1024).toFixed(2)}KB`);
    console.log(`Samples taken: ${this.samples.length}`);

    // Detect trend
    const recentSamples = this.samples.slice(-10);
    const isIncreasing = recentSamples.every((sample, i) =>
      i === 0 || sample >= recentSamples[i - 1]
    );

    if (isIncreasing && totalLeak > 10 * 1024 * 1024) { // > 10MB
      console.warn('⚠️ Consistent memory growth detected - likely memory leak');
    }

    console.groupEnd();
  }
}

// Global detector instance
const leakDetector = new MemoryLeakDetector();

// React hook for component-level leak detection
function useMemoryLeakDetection(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let mounted = true;
    let initialMemory = 0;

    // Measure initial memory
    setTimeout(() => {
      if (mounted) {
        initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      }
    }, 100);

    return () => {
      mounted = false;

      // Check memory after component unmounts
      setTimeout(() => {
        if ((performance as any).memory) {
          const finalMemory = (performance as any).memory.usedJSHeapSize;
          const diff = finalMemory - initialMemory;

          if (diff > 1024 * 1024) { // > 1MB retained
            console.warn(
              `🔍 ${componentName} may have memory leak: ${(diff / 1024 / 1024).toFixed(2)}MB retained after unmount`
            );
          }
        }
      }, 1000);
    };
  }, [componentName]);
}
```

## Common Memory Leak Patterns and Detection

For detailed patterns and advanced optimization techniques, see [Memory Management Deep Dive](./memory-management-deep-dive.md). Here are the key patterns to watch for:

### Event Listener Detection

**Symptoms**: Memory growth during user interactions, especially scrolling or clicking
**Detection**: Check for missing cleanup in `useEffect`

```tsx
// ❌ Missing cleanup - red flag during review
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  // No return statement = potential leak
}, []);

// ✅ Proper cleanup pattern
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### Timer Leak Detection

**Symptoms**: Components updating after unmount, console errors
**Detection**: Check all `setInterval` and `setTimeout` calls

```tsx
// Detection technique: Add component name to timers
useEffect(() => {
  const interval = setInterval(() => {
    console.log('Timer in ComponentName still running'); // This shouldn't appear after unmount
    setCount((prev) => prev + 1);
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

### Closure Leak Detection

**Symptoms**: Memory growth proportional to data size, sluggish performance
**Detection**: Check dependency arrays in `useCallback` and `useMemo`

```tsx
// ❌ Red flag - large object in dependency array
const processData = useCallback(
  (id: string) => {
    return largeDataset.find((item) => item.id === id);
  },
  [largeDataset],
); // Captures entire dataset

// ✅ Extract only what's needed
const itemMap = useMemo(() => new Map(largeDataset.map((item) => [item.id, item])), [largeDataset]);
const processData = useCallback(
  (id: string) => {
    return itemMap.get(id);
  },
  [itemMap],
);
```

### Subscription Leak Detection

**Symptoms**: Multiple event handlers firing, unexpected state updates
**Detection**: Use browser dev tools to inspect global event listeners

```tsx
// Detection helper for development
useEffect(() => {
  const cleanup = subscribeToService(handleData);

  // Add detection in development
  if (process.env.NODE_ENV === 'development') {
    window.__subscriptions = window.__subscriptions || new Set();
    window.__subscriptions.add(cleanup);

    return () => {
      cleanup();
      window.__subscriptions.delete(cleanup);
    };
  }

  return cleanup;
}, []);
```

## Advanced Memory Leak Detection Tools

### Custom Memory Profiler Component

```tsx
// Production-safe memory monitoring
class ProductionMemoryMonitor {
  private isEnabled: boolean;
  private metrics: Array<{
    timestamp: number;
    heapUsed: number;
    component?: string;
  }> = [];

  constructor() {
    // Only enable in development or with explicit flag
    this.isEnabled =
      process.env.NODE_ENV === 'development' ||
      window.location.search.includes('memoryProfile=true');
  }

  recordMetric(component?: string): void {
    if (!this.isEnabled || !(performance as any).memory) return;

    this.metrics.push({
      timestamp: Date.now(),
      heapUsed: (performance as any).memory.usedJSHeapSize,
      component,
    });

    // Keep only last 1000 metrics to prevent memory leak in profiler
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  analyzeLeaks(): {
    suspiciousComponents: string[];
    overallTrend: 'increasing' | 'stable' | 'decreasing';
    recommendations: string[];
  } {
    if (this.metrics.length < 10) {
      return {
        suspiciousComponents: [],
        overallTrend: 'stable',
        recommendations: ['Need more data points to analyze'],
      };
    }

    // Analyze overall memory trend
    const recentMetrics = this.metrics.slice(-50);
    const oldAverage = recentMetrics.slice(0, 25).reduce((sum, m) => sum + m.heapUsed, 0) / 25;
    const newAverage = recentMetrics.slice(25).reduce((sum, m) => sum + m.heapUsed, 0) / 25;

    const trend =
      newAverage > oldAverage * 1.1
        ? 'increasing'
        : newAverage < oldAverage * 0.9
          ? 'decreasing'
          : 'stable';

    // Analyze component-specific patterns
    const componentMetrics = this.groupMetricsByComponent();
    const suspiciousComponents = this.findSuspiciousComponents(componentMetrics);

    const recommendations = this.generateRecommendations(trend, suspiciousComponents);

    return {
      suspiciousComponents,
      overallTrend: trend,
      recommendations,
    };
  }

  private groupMetricsByComponent(): Map<string, Array<{ timestamp: number; heapUsed: number }>> {
    const grouped = new Map();

    this.metrics.forEach((metric) => {
      if (!metric.component) return;

      if (!grouped.has(metric.component)) {
        grouped.set(metric.component, []);
      }

      grouped.get(metric.component).push({
        timestamp: metric.timestamp,
        heapUsed: metric.heapUsed,
      });
    });

    return grouped;
  }

  private findSuspiciousComponents(
    componentMetrics: Map<string, Array<{ timestamp: number; heapUsed: number }>>,
  ): string[] {
    const suspicious: string[] = [];

    componentMetrics.forEach((metrics, component) => {
      if (metrics.length < 5) return;

      // Check for consistent memory growth after component usage
      const sorted = metrics.sort((a, b) => a.timestamp - b.timestamp);
      const first = sorted[0].heapUsed;
      const last = sorted[sorted.length - 1].heapUsed;

      const growth = (last - first) / first;

      // If memory grew by more than 20% during component's lifetime
      if (growth > 0.2) {
        suspicious.push(component);
      }
    });

    return suspicious;
  }

  private generateRecommendations(trend: string, suspiciousComponents: string[]): string[] {
    const recommendations: string[] = [];

    if (trend === 'increasing') {
      recommendations.push('Overall memory usage is increasing - investigate for memory leaks');
    }

    if (suspiciousComponents.length > 0) {
      recommendations.push(
        `Check these components for memory leaks: ${suspiciousComponents.join(', ')}`,
      );
    }

    recommendations.push('Review event listeners, timers, and subscriptions for proper cleanup');
    recommendations.push('Use Chrome DevTools Memory tab for detailed heap analysis');

    return recommendations;
  }

  exportData(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        analysis: this.analyzeLeaks(),
        timestamp: Date.now(),
      },
      null,
      2,
    );
  }
}

// React hook for memory monitoring
function useMemoryMonitoring(componentName: string, enabled = false) {
  const monitor = useRef(new ProductionMemoryMonitor());

  useEffect(() => {
    if (enabled) {
      monitor.current.recordMetric(`${componentName}:mount`);
    }

    return () => {
      if (enabled) {
        monitor.current.recordMetric(`${componentName}:unmount`);
      }
    };
  }, [componentName, enabled]);

  const recordEvent = useCallback(
    (eventName: string) => {
      if (enabled) {
        monitor.current.recordMetric(`${componentName}:${eventName}`);
      }
    },
    [componentName, enabled],
  );

  return {
    recordEvent,
    analyzeLeaks: () => monitor.current.analyzeLeaks(),
    exportData: () => monitor.current.exportData(),
  };
}

// Development tool component
function MemoryProfilerPanel() {
  const [analysis, setAnalysis] = useState<any>(null);
  const monitor = useRef(new ProductionMemoryMonitor());

  const runAnalysis = () => {
    const results = monitor.current.analyzeLeaks();
    setAnalysis(results);
  };

  const exportData = () => {
    const data = monitor.current.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `memory-profile-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: '#000',
        color: '#fff',
        padding: 15,
        borderRadius: 5,
        fontSize: 12,
        zIndex: 9999,
      }}
    >
      <h4>Memory Profiler</h4>

      <button onClick={runAnalysis}>Analyze Memory</button>
      <button onClick={exportData}>Export Data</button>

      {analysis && (
        <div>
          <p>Trend: {analysis.overallTrend}</p>
          {analysis.suspiciousComponents.length > 0 && (
            <p>Suspicious: {analysis.suspiciousComponents.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

## Testing for Memory Leaks

```tsx
// Automated memory leak testing
class MemoryLeakTester {
  async testComponentForLeaks<T>(
    Component: React.ComponentType<T>,
    props: T,
    iterations: number = 100,
  ): Promise<{
    hasLeak: boolean;
    initialMemory: number;
    finalMemory: number;
    leakSize: number;
    averageGrowth: number;
  }> {
    // Force garbage collection before test
    if (window.gc) window.gc();

    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memorySnapshots: number[] = [];

    // Mount and unmount component multiple times
    for (let i = 0; i < iterations; i++) {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const root = ReactDOM.createRoot(container);
      root.render(<Component {...props} />);

      // Let component render
      await new Promise((resolve) => setTimeout(resolve, 10));

      root.unmount();
      document.body.removeChild(container);

      // Force garbage collection every 10 iterations
      if (i % 10 === 0 && window.gc) {
        window.gc();

        // Take memory snapshot
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
        memorySnapshots.push(currentMemory);
      }
    }

    // Final garbage collection and measurement
    if (window.gc) window.gc();
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const leakSize = finalMemory - initialMemory;
    const averageGrowth =
      memorySnapshots.length > 1
        ? (memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0]) /
          memorySnapshots.length
        : 0;

    // Consider it a leak if memory grew by more than 1MB
    const hasLeak = leakSize > 1024 * 1024;

    return {
      hasLeak,
      initialMemory,
      finalMemory,
      leakSize,
      averageGrowth,
    };
  }

  async runLeakTestSuite(
    components: Array<{
      name: string;
      Component: React.ComponentType<any>;
      props: any;
    }>,
  ): Promise<void> {
    console.log('🔍 Running memory leak test suite...');

    for (const { name, Component, props } of components) {
      try {
        const results = await this.testComponentForLeaks(Component, props, 50);

        console.group(`📊 ${name} Memory Test Results`);
        console.log(`Initial memory: ${(results.initialMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Final memory: ${(results.finalMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Memory growth: ${(results.leakSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Average growth: ${(results.averageGrowth / 1024).toFixed(2)}KB per iteration`);

        if (results.hasLeak) {
          console.error(`❌ MEMORY LEAK DETECTED in ${name}`);
        } else {
          console.log(`✅ No memory leak detected in ${name}`);
        }

        console.groupEnd();
      } catch (error) {
        console.error(`Failed to test ${name}:`, error);
      }
    }
  }
}

// Jest integration
describe('Memory Leak Tests', () => {
  const tester = new MemoryLeakTester();

  it('should not leak memory in UserProfile component', async () => {
    const results = await tester.testComponentForLeaks(UserProfile, { user: mockUser }, 100);

    expect(results.hasLeak).toBe(false);
    expect(results.leakSize).toBeLessThan(1024 * 1024); // < 1MB growth
  });

  it('should detect memory leaks in problematic components', async () => {
    const results = await tester.testComponentForLeaks(LeakyComponent, { data: mockData }, 50);

    // This test expects a leak to verify our detection works
    expect(results.hasLeak).toBe(true);
  });
});
```

## Prevention Strategies

### ESLint Rules for Memory Safety

```javascript
// .eslintrc.js - Custom rules for memory leak prevention
module.exports = {
  rules: {
    // Warn about missing effect cleanup
    'react-hooks/exhaustive-deps': 'warn',

    // Custom rule to detect potential timer leaks
    'custom/timer-cleanup': 'error',

    // Custom rule to detect event listener patterns
    'custom/event-listener-cleanup': 'error',
  },

  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // TypeScript-specific memory safety rules
        '@typescript-eslint/no-unused-vars': 'error',
      },
    },
  ],
};

// Custom ESLint rule for timer cleanup
const timerCleanupRule = {
  create(context) {
    return {
      CallExpression(node) {
        // Check for setInterval/setTimeout without cleanup
        if (node.callee.name === 'setInterval' || node.callee.name === 'setTimeout') {
          // Look for cleanup in return statement
          const useEffectNode = findParentUseEffect(node);
          if (useEffectNode && !hasCleanupReturn(useEffectNode)) {
            context.report({
              node,
              message: 'Timer should be cleared in useEffect cleanup function',
            });
          }
        }
      },
    };
  },
};
```

### Memory-Safe Component Patterns

```tsx
// Template for memory-safe React components
function MemorySafeComponent({ data, onUpdate }: { data: any[]; onUpdate: (data: any) => void }) {
  // 1. Use refs for stable references to avoid closure captures
  const dataRef = useRef(data);
  const onUpdateRef = useRef(onUpdate);

  // Update refs when props change
  useEffect(() => {
    dataRef.current = data;
    onUpdateRef.current = onUpdate;
  });

  // 2. Memoize expensive computations
  const processedData = useMemo(() => {
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      // Only include fields you actually need
    }));
  }, [data]);

  // 3. Use custom hooks for subscriptions/timers
  useInterval(() => {
    // Periodic updates using refs to avoid closure capture
    const currentData = dataRef.current;
    const currentOnUpdate = onUpdateRef.current;

    // Process and update
    currentOnUpdate(processData(currentData));
  }, 30000);

  // 4. Clean up all subscriptions
  useEffect(() => {
    const subscription = dataService.subscribe((newData) => {
      onUpdateRef.current(newData);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div>
      {processedData.map((item) => (
        <ItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}
```
