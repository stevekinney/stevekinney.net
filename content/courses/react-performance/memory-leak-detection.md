---
title: Memory Leak Detection in React Applications
description: Find and fix memory leaks that kill performance. Master Chrome DevTools, detect common patterns, and build leak-free React apps.
date: 2025-09-07T00:45:00.000Z
modified: 2025-09-07T00:45:00.000Z
published: true
tags: ['react', 'performance', 'debugging', 'memory']
---

Memory leaks in React applications are silent killers. Your app launches smoothly, but after an hour of use, it consumes 500MB of RAM and feels sluggish. Users navigate between pages, components mount and unmount, but something holds onto memory that should have been freed. The garbage collector runs, but memory usage keeps climbing. Eventually, the tab crashes or the mobile browser kills your app.

The insidious nature of memory leaks makes them particularly dangerous—they're invisible during development but catastrophic in production. A single event listener that's never removed, a closure that captures a large object, or a timer that never gets cleared can transform a snappy React app into a memory-hungry monster. The key is systematic detection, understanding common patterns, and building defensive coding practices.

## Understanding Memory Leaks in React

Memory leaks occur when your JavaScript code holds references to objects that should be garbage collected. In React applications, this often happens when:

```typescript
// Common memory leak patterns in React

// 1. Event listeners that aren't removed
function LeakyComponent() {
  useEffect(() => {
    const handleScroll = () => {
      console.log('Scrolling...');
    };

    window.addEventListener('scroll', handleScroll);

    // ❌ Missing cleanup - event listener never removed
    // return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <div>Component content</div>;
}

// 2. Timers that aren't cleared
function LeakyTimer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);

    // ❌ Missing cleanup - interval keeps running after unmount
    // return () => clearInterval(interval);
  }, []);

  return <div>Count: {count}</div>;
}

// 3. Closures holding large objects
function LeakyClosures({ largeDataset }: { largeDataset: LargeObject[] }) {
  const [items, setItems] = useState<Item[]>([]);

  const processItems = useCallback(() => {
    // ❌ Closure captures entire largeDataset even if we only need small part
    const processed = largeDataset.map(item => ({
      id: item.id,
      name: item.name,
      // Only using 2 properties but entire object is retained
    }));
    setItems(processed);
  }, [largeDataset]); // Entire largeDataset is in closure

  return <ItemList items={items} onProcess={processItems} />;
}

// 4. Component references in global state
const globalCallbacks = new Set<Function>();

function LeakyGlobalReferences() {
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  useEffect(() => {
    globalCallbacks.add(handleClick);

    // ❌ Missing cleanup - callback stays in global set forever
    // return () => globalCallbacks.delete(handleClick);
  }, [handleClick]);

  return <button onClick={handleClick}>Click me</button>;
}
```

The JavaScript garbage collector can only clean up objects with no references. When React components hold onto references through event listeners, timers, or closures, those objects can't be collected, leading to memory leaks.

## Chrome DevTools Memory Profiling

Chrome DevTools provides powerful tools for detecting memory leaks:

### Taking Memory Snapshots

```typescript
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
    const beforeSnapshot = this.snapshots.find(s => s.name === before);
    const afterSnapshot = this.snapshots.find(s => s.name === after);

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

```typescript
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

## Common Memory Leak Patterns and Fixes

### Event Listeners and DOM References

```typescript
// ❌ Leaky event listener pattern
function LeakyEventListener() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100;
      setIsVisible(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleScroll);

    // Missing cleanup causes memory leak
  }, []);

  return isVisible ? <div>Visible content</div> : null;
}

// ✅ Proper cleanup
function CleanEventListener() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 100;
      setIsVisible(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleScroll);

    // ✅ Cleanup prevents memory leak
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleScroll);
    };
  }, []);

  return isVisible ? <div>Visible content</div> : null;
}

// ✅ Custom hook for event listeners with automatic cleanup
function useEventListener<T extends keyof WindowEventMap>(
  eventName: T,
  handler: (event: WindowEventMap[T]) => void,
  element: Window | Document | HTMLElement = window,
  options?: AddEventListenerOptions
) {
  // Use ref to store handler to avoid effect re-runs
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element?.addEventListener) return;

    const eventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[T]);
    };

    element.addEventListener(eventName, eventListener, options);

    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

// Usage
function SafeScrollComponent() {
  const [scrollY, setScrollY] = useState(0);

  useEventListener('scroll',
    (e) => setScrollY(window.scrollY),
    window,
    { passive: true }
  );

  return <div>Scroll position: {scrollY}</div>;
}
```

### Timer and Interval Leaks

```typescript
// ❌ Leaky timers
function LeakyTimers() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Timer that's never cleared
    setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);

    // Timeout that's never cleared
    setTimeout(() => {
      setData('loaded');
    }, 5000);

    // Missing cleanup
  }, []);

  return <div>Count: {count}</div>;
}

// ✅ Proper timer cleanup
function CleanTimers() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + 1);
    }, 1000);

    const timeout = setTimeout(() => {
      setData('loaded');
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return <div>Count: {count}, Data: {data}</div>;
}

// ✅ Custom hooks for timers
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const interval = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(interval);
  }, [delay]);
}

function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const timeout = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay]);
}

// Usage
function SafeTimerComponent() {
  const [count, setCount] = useState(0);

  useInterval(() => {
    setCount(prev => prev + 1);
  }, 1000);

  useTimeout(() => {
    console.log('Component has been mounted for 5 seconds');
  }, 5000);

  return <div>Count: {count}</div>;
}
```

### Closure and Reference Leaks

```typescript
// ❌ Leaky closures holding large objects
function LeakyClosures({ largeDataset }: { largeDataset: LargeObject[] }) {
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  // ❌ Closure captures entire largeDataset
  const filterData = useCallback((searchTerm: string) => {
    const filtered = largeDataset
      .filter(item => item.name.includes(searchTerm))
      .map(item => item.id);

    setFilteredIds(filtered);
  }, [largeDataset]); // Entire array is captured in closure

  return <SearchInput onSearch={filterData} />;
}

// ✅ Extract only what you need
function CleanClosures({ largeDataset }: { largeDataset: LargeObject[] }) {
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  // ✅ Only capture the data we actually need
  const searchableData = useMemo(() =>
    largeDataset.map(item => ({ id: item.id, name: item.name })),
    [largeDataset]
  );

  const filterData = useCallback((searchTerm: string) => {
    const filtered = searchableData
      .filter(item => item.name.includes(searchTerm))
      .map(item => item.id);

    setFilteredIds(filtered);
  }, [searchableData]); // Much smaller object in closure

  return <SearchInput onSearch={filterData} />;
}

// ✅ Even better: use refs for large, stable objects
function RefBasedComponent({ largeDataset }: { largeDataset: LargeObject[] }) {
  const dataRef = useRef(largeDataset);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  // Update ref when prop changes
  useEffect(() => {
    dataRef.current = largeDataset;
  }, [largeDataset]);

  // Callback doesn't capture large dataset
  const filterData = useCallback((searchTerm: string) => {
    const filtered = dataRef.current
      .filter(item => item.name.includes(searchTerm))
      .map(item => item.id);

    setFilteredIds(filtered);
  }, []); // No dependencies, no closure capture

  return <SearchInput onSearch={filterData} />;
}
```

### Global State and Subscription Leaks

```typescript
// ❌ Leaky global subscriptions
const globalEventBus = new EventTarget();
const globalSubscribers = new Set<Function>();

function LeakySubscription() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setData(event.detail);
    };

    // Subscribe to global events
    globalEventBus.addEventListener('data-update', handleUpdate);
    globalSubscribers.add(handleUpdate);

    // ❌ Missing cleanup
  }, []);

  return <div>Data: {data}</div>;
}

// ✅ Proper subscription cleanup
function CleanSubscription() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setData(event.detail);
    };

    globalEventBus.addEventListener('data-update', handleUpdate);
    globalSubscribers.add(handleUpdate);

    return () => {
      globalEventBus.removeEventListener('data-update', handleUpdate);
      globalSubscribers.delete(handleUpdate);
    };
  }, []);

  return <div>Data: {data}</div>;
}

// ✅ Custom hook for subscriptions
function useGlobalSubscription<T>(
  eventName: string,
  initialValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setValue(event.detail);
    };

    globalEventBus.addEventListener(eventName, handleUpdate);

    return () => {
      globalEventBus.removeEventListener(eventName, handleUpdate);
    };
  }, [eventName]);

  const publish = useCallback((newValue: T) => {
    globalEventBus.dispatchEvent(
      new CustomEvent(eventName, { detail: newValue })
    );
  }, [eventName]);

  return [value, publish];
}

// Usage
function SafeSubscriptionComponent() {
  const [userData, setUserData] = useGlobalSubscription('user-update', null);

  return (
    <div>
      <p>User: {userData?.name}</p>
      <button onClick={() => setUserData({ name: 'John', id: '123' })}>
        Update User
      </button>
    </div>
  );
}
```

## Advanced Memory Leak Detection Tools

### Custom Memory Profiler Component

```typescript
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
    this.isEnabled = process.env.NODE_ENV === 'development' ||
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

    const trend = newAverage > oldAverage * 1.1 ? 'increasing' :
                  newAverage < oldAverage * 0.9 ? 'decreasing' : 'stable';

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

    this.metrics.forEach(metric => {
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
    componentMetrics: Map<string, Array<{ timestamp: number; heapUsed: number }>>
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

  private generateRecommendations(
    trend: string,
    suspiciousComponents: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'increasing') {
      recommendations.push('Overall memory usage is increasing - investigate for memory leaks');
    }

    if (suspiciousComponents.length > 0) {
      recommendations.push(`Check these components for memory leaks: ${suspiciousComponents.join(', ')}`);
    }

    recommendations.push('Review event listeners, timers, and subscriptions for proper cleanup');
    recommendations.push('Use Chrome DevTools Memory tab for detailed heap analysis');

    return recommendations;
  }

  exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      analysis: this.analyzeLeaks(),
      timestamp: Date.now(),
    }, null, 2);
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

  const recordEvent = useCallback((eventName: string) => {
    if (enabled) {
      monitor.current.recordMetric(`${componentName}:${eventName}`);
    }
  }, [componentName, enabled]);

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
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: '#000',
      color: '#fff',
      padding: 15,
      borderRadius: 5,
      fontSize: 12,
      zIndex: 9999,
    }}>
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

```typescript
// Automated memory leak testing
class MemoryLeakTester {
  async testComponentForLeaks<T>(
    Component: React.ComponentType<T>,
    props: T,
    iterations: number = 100
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
      await new Promise(resolve => setTimeout(resolve, 10));

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
    const averageGrowth = memorySnapshots.length > 1
      ? (memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0]) / memorySnapshots.length
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

  async runLeakTestSuite(components: Array<{
    name: string;
    Component: React.ComponentType<any>;
    props: any;
  }>): Promise<void> {
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
    const results = await tester.testComponentForLeaks(
      UserProfile,
      { user: mockUser },
      100
    );

    expect(results.hasLeak).toBe(false);
    expect(results.leakSize).toBeLessThan(1024 * 1024); // < 1MB growth
  });

  it('should detect memory leaks in problematic components', async () => {
    const results = await tester.testComponentForLeaks(
      LeakyComponent,
      { data: mockData },
      50
    );

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

```typescript
// Template for memory-safe React components
function MemorySafeComponent({
  data,
  onUpdate
}: {
  data: any[];
  onUpdate: (data: any) => void;
}) {
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
    return data.map(item => ({
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
      {processedData.map(item => (
        <ItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}
```

## Next Steps

Memory leak prevention should be built into your development process:

1. **Use the profiler regularly** - Take snapshots before and after major features
2. **Implement cleanup checklists** - Ensure all effects have proper cleanup
3. **Automate leak detection** - Add memory tests to your CI pipeline
4. **Monitor production** - Track memory usage in real applications
5. **Team education** - Share common patterns and prevention strategies

Memory leaks are easier to prevent than to fix. By understanding common patterns, using proper cleanup techniques, and implementing systematic detection, you can build React applications that stay fast and responsive even after hours of use.

Remember: every event listener, timer, and subscription is a potential memory leak unless properly cleaned up. Make cleanup a first-class concern in your React development process.
