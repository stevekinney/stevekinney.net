---
title: Performance Testing Strategy
description: >-
  Build comprehensive performance tests for React apps. Unit test performance,
  catch regressions, and automate optimization validation.
date: 2025-09-07T00:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - testing
  - automation
---

Performance without tests is just wishful thinking. You might optimize a component today, but without automated testing, tomorrow's feature addition could undo all your work. Performance testing isn't just about catching regressions—it's about establishing performance as a first-class concern in your development process, ensuring that every code change is evaluated not just for correctness, but for its impact on user experience.

The challenge with performance testing in React is that performance varies dramatically based on data size, device capabilities, and network conditions. A component that renders 10 items smoothly might grind to a halt with 1,000 items. A bundle that loads instantly on a MacBook Pro might timeout on a 3G connection. Effective performance testing creates realistic scenarios that catch these issues before users do.

## Performance Testing Pyramid

Just like the testing pyramid for functional tests, performance testing has layers:

```tsx
// Performance Testing Pyramid (bottom to top)

// 1. Unit Performance Tests (Most tests, fastest feedback)
//    - Component render performance
//    - Hook performance
//    - Utility function performance
//    - Memory usage validation

// 2. Integration Performance Tests (Fewer tests, broader scope)
//    - Page load performance
//    - User interaction flows
//    - State management performance
//    - API integration performance

// 3. End-to-End Performance Tests (Fewest tests, most realistic)
//    - Real browser performance
//    - Network condition simulation
//    - Device capability testing
//    - Core Web Vitals measurement

interface PerformanceTestStrategy {
  unit: {
    tools: ['@testing-library/react', 'React DevTools Profiler API'];
    metrics: ['render time', 'memory usage', 're-render count'];
    threshold: '< 16ms per component';
  };

  integration: {
    tools: ['Puppeteer', 'Playwright', 'Cypress'];
    metrics: ['page load time', 'time to interactive', 'bundle size'];
    threshold: '< 3s on 3G';
  };

  e2e: {
    tools: ['Lighthouse CI', 'WebPageTest', 'Chrome DevTools'];
    metrics: ['Core Web Vitals', 'real user metrics', 'business KPIs'];
    threshold: 'LCP < 2.5s, CLS < 0.1';
  };
}
```

## Unit Performance Testing

### Component Render Performance

```tsx
// utils/performance-test-helpers.ts
import { render } from '@testing-library/react';
import { Profiler, ProfilerOnRenderCallback } from 'react';

interface RenderMetrics {
  renderTime: number;
  commitTime: number;
  actualDuration: number;
  baseDuration: number;
  startTime: number;
}

export function measureRenderPerformance<T>(
  component: React.ReactElement,
  testName: string,
): Promise<RenderMetrics> {
  return new Promise((resolve) => {
    let metrics: RenderMetrics;

    const onRender: ProfilerOnRenderCallback = (
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    ) => {
      if (phase === 'mount' || phase === 'update') {
        metrics = {
          renderTime: actualDuration,
          commitTime,
          actualDuration,
          baseDuration,
          startTime,
        };
      }
    };

    render(
      <Profiler id={testName} onRender={onRender}>
        {component}
      </Profiler>,
    );

    // Allow React to complete rendering
    setTimeout(() => resolve(metrics), 0);
  });
}

// Custom Jest matcher for performance assertions
expect.extend({
  toRenderWithinTime(received: RenderMetrics, maxTime: number) {
    const pass = received.renderTime <= maxTime;

    return {
      message: () =>
        `Expected component to render in ${maxTime}ms, but took ${received.renderTime.toFixed(2)}ms`,
      pass,
    };
  },

  toHaveMaxReRenders(received: number, maxRenders: number) {
    const pass = received <= maxRenders;

    return {
      message: () =>
        `Expected component to re-render at most ${maxRenders} times, but re-rendered ${received} times`,
      pass,
    };
  },
});
```

### Component Performance Test Examples

```tsx
// components/__tests__/UserList.performance.test.tsx
import { measureRenderPerformance } from '../utils/performance-test-helpers';
import { UserList } from '../UserList';

describe('UserList Performance', () => {
  const generateUsers = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: i.toString(),
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: 'user',
    }));

  it('should render 100 users within 50ms', async () => {
    const users = generateUsers(100);

    const metrics = await measureRenderPerformance(
      <UserList users={users} />,
      'UserList-100-items',
    );

    expect(metrics).toRenderWithinTime(50);
  });

  it('should handle 1000 users without performance degradation', async () => {
    const users = generateUsers(1000);

    const metrics = await measureRenderPerformance(
      <UserList users={users} />,
      'UserList-1000-items',
    );

    // Larger lists should still be reasonable
    expect(metrics).toRenderWithinTime(200);

    // Memory usage shouldn't be excessive
    expect(metrics.baseDuration).toBeLessThan(500);
  });

  it('should minimize re-renders when props change', async () => {
    const users = generateUsers(50);
    let renderCount = 0;

    const TestWrapper = ({ extraProp }: { extraProp: string }) => {
      const onRender = () => {
        renderCount++;
      };

      return (
        <Profiler id="rerender-test" onRender={onRender}>
          <UserList users={users} />
        </Profiler>
      );
    };

    const { rerender } = render(<TestWrapper extraProp="initial" />);

    // Changing unrelated prop shouldn't cause re-render if memoized properly
    rerender(<TestWrapper extraProp="changed" />);

    expect(renderCount).toHaveMaxReRenders(1);
  });
});
```

### Hook Performance Testing

```tsx
// hooks/__tests__/useExpensiveCalculation.performance.test.ts
import { renderHook } from '@testing-library/react';
import { performance } from 'perf_hooks';
import { useExpensiveCalculation } from '../useExpensiveCalculation';

describe('useExpensiveCalculation Performance', () => {
  it('should memoize expensive calculations', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => i);

    const { result, rerender } = renderHook(({ data }) => useExpensiveCalculation(data), {
      initialProps: { data: largeDataset },
    });

    // First render - should do the calculation
    const startTime1 = performance.now();
    const result1 = result.current;
    const endTime1 = performance.now();
    const firstRenderTime = endTime1 - startTime1;

    // Second render with same data - should be memoized
    const startTime2 = performance.now();
    rerender({ data: largeDataset });
    const result2 = result.current;
    const endTime2 = performance.now();
    const memoizedRenderTime = endTime2 - startTime2;

    // Results should be identical (same reference due to memoization)
    expect(result1).toBe(result2);

    // Memoized render should be significantly faster
    expect(memoizedRenderTime).toBeLessThan(firstRenderTime * 0.1);
  });

  it('should handle large datasets efficiently', () => {
    const hugeDataset = Array.from({ length: 100000 }, (_, i) => ({
      id: i,
      value: Math.random(),
      category: i % 10,
    }));

    const startTime = performance.now();

    const { result } = renderHook(() => useExpensiveCalculation(hugeDataset));

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should complete within reasonable time even for large datasets
    expect(renderTime).toBeLessThan(100); // 100ms threshold
    expect(result.current).toBeDefined();
  });
});
```

### Memory Usage Testing

```tsx
// utils/memory-test-helpers.ts
export function measureMemoryUsage(testFn: () => void): Promise<{
  heapUsedBefore: number;
  heapUsedAfter: number;
  heapUsedDelta: number;
}> {
  return new Promise((resolve) => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage();

    testFn();

    // Allow React to complete all updates
    setTimeout(() => {
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage();

      resolve({
        heapUsedBefore: memBefore.heapUsed,
        heapUsedAfter: memAfter.heapUsed,
        heapUsedDelta: memAfter.heapUsed - memBefore.heapUsed,
      });
    }, 100);
  });
}

// Memory leak detection
export class MemoryLeakDetector {
  private initialMemory: number = 0;
  private samples: number[] = [];

  start() {
    if (global.gc) global.gc();
    this.initialMemory = process.memoryUsage().heapUsed;
    this.samples = [this.initialMemory];
  }

  sample() {
    if (global.gc) global.gc();
    const currentMemory = process.memoryUsage().heapUsed;
    this.samples.push(currentMemory);
    return currentMemory;
  }

  detectLeak(threshold: number = 10 * 1024 * 1024): {
    hasLeak: boolean;
    memoryGrowth: number;
    samples: number[];
  } {
    const finalMemory = this.sample();
    const memoryGrowth = finalMemory - this.initialMemory;

    return {
      hasLeak: memoryGrowth > threshold,
      memoryGrowth,
      samples: [...this.samples],
    };
  }
}
```

## Integration Performance Testing

### Page Load Performance Tests

```tsx
// tests/integration/page-performance.test.ts
import { chromium, Browser, Page } from 'playwright';

describe('Page Performance Integration', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();

    // Simulate slow 3G network
    await page.context().setNetworkConditions({
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
      uploadThroughput: (750 * 1024) / 8, // 750 Kbps
      latency: 150, // 150ms RTT
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should load homepage within 3 seconds on 3G', async () => {
    const startTime = Date.now();

    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle',
    });

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  it('should achieve good Core Web Vitals scores', async () => {
    await page.goto('http://localhost:3000');

    // Collect Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};

        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.lcp = entries[entries.length - 1]?.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // FID
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.fid = entries[0].processingStart - entries[0].startTime;
          }
        }).observe({ entryTypes: ['first-input'] });

        // CLS
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Resolve after collecting metrics
        setTimeout(() => resolve(vitals), 5000);
      });
    });

    expect((webVitals as any).lcp).toBeLessThan(2500); // 2.5s
    expect((webVitals as any).cls).toBeLessThan(0.1); // 0.1
    if ((webVitals as any).fid) {
      expect((webVitals as any).fid).toBeLessThan(100); // 100ms
    }
  });

  it('should handle user interactions within 200ms', async () => {
    await page.goto('http://localhost:3000/dashboard');

    // Measure interaction response time
    const button = page.locator('[data-testid="load-more-button"]');

    const startTime = Date.now();
    await button.click();

    // Wait for visual feedback (loading state or content update)
    await page.waitForSelector('[data-testid="loading-indicator"]', {
      timeout: 1000,
    });

    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(200);
  });
});
```

### Bundle Size Performance Tests

```tsx
// tests/integration/bundle-performance.test.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

describe('Bundle Performance', () => {
  it('should stay within bundle size limits', async () => {
    // Build the application
    await execAsync('npm run build');

    // Analyze bundle sizes
    const distPath = path.join(process.cwd(), 'dist');
    const files = await fs.readdir(distPath);

    const bundles = {
      main: 0,
      vendor: 0,
      total: 0,
    };

    for (const file of files) {
      if (file.endsWith('.js') && !file.endsWith('.map')) {
        const filePath = path.join(distPath, file);
        const stats = await fs.stat(filePath);

        bundles.total += stats.size;

        if (file.includes('main')) {
          bundles.main += stats.size;
        } else if (file.includes('vendor')) {
          bundles.vendor += stats.size;
        }
      }
    }

    // Bundle size assertions
    expect(bundles.main).toBeLessThan(300 * 1024); // 300KB
    expect(bundles.vendor).toBeLessThan(200 * 1024); // 200KB
    expect(bundles.total).toBeLessThan(500 * 1024); // 500KB total
  });

  it('should not have bundle size regression > 5%', async () => {
    const previousSizesPath = '.bundle-sizes.json';

    let previousSizes;
    try {
      const data = await fs.readFile(previousSizesPath, 'utf8');
      previousSizes = JSON.parse(data);
    } catch {
      // No previous sizes - this is the first run
      console.log('No previous bundle sizes found - skipping regression test');
      return;
    }

    const currentSizes = await getCurrentBundleSizes();

    for (const [bundle, currentSize] of Object.entries(currentSizes)) {
      const previousSize = previousSizes[bundle];
      if (!previousSize) continue;

      const growth = (currentSize - previousSize) / previousSize;

      expect(growth).toBeLessThan(0.05); // Max 5% growth
    }

    // Save current sizes for next run
    await fs.writeFile(previousSizesPath, JSON.stringify(currentSizes, null, 2));
  });
});
```

## End-to-End Performance Testing

### Lighthouse CI Integration

For comprehensive CI/CD pipeline configuration including performance budgets, see [performance-budgets-and-automation.md](./performance-budgets-and-automation.md).

```yaml
# .github/workflows/performance.yml
name: Performance Testing

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start server
        run: npm run serve &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci
```

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/profile',
      ],
      numberOfRuns: 3,
      settings: {
        // Simulate mobile device
        emulatedFormFactor: 'mobile',
        // Throttle network to slow 3G
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 300,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      },
    },

    assert: {
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 50000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 500000 }],
        'resource-summary:total:count': ['error', { maxNumericValue: 50 }],
      },
    },

    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Custom Performance Test Suite

```tsx
// tests/e2e/performance-suite.ts
import { chromium, Browser } from 'playwright';

interface PerformanceMetrics {
  navigationTiming: PerformanceNavigationTiming;
  resourceTiming: PerformanceResourceTiming[];
  paintTiming: PerformanceEntry[];
  webVitals: {
    lcp: number;
    fid?: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
}

class PerformanceTestSuite {
  private browser!: Browser;

  async setup() {
    this.browser = await chromium.launch();
  }

  async teardown() {
    await this.browser.close();
  }

  async runPerformanceTest(
    url: string,
    options?: {
      device?: 'mobile' | 'desktop';
      network?: 'fast3G' | 'slow3G' | 'offline';
      iterations?: number;
    },
  ): Promise<PerformanceMetrics[]> {
    const iterations = options?.iterations || 3;
    const results: PerformanceMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const context = await this.browser.newContext({
        // Device simulation
        ...(options?.device === 'mobile' && {
          viewport: { width: 375, height: 667 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        }),
      });

      const page = await context.newPage();

      // Network throttling
      if (options?.network) {
        const networkProfiles = {
          fast3G: { download: 1600, upload: 750, latency: 150 },
          slow3G: { download: 400, upload: 400, latency: 300 },
        };

        const profile = networkProfiles[options.network];
        if (profile) {
          await page.context().setOffline(false);
          await page.context().setNetworkConditions(profile);
        }
      }

      // Navigate and collect metrics
      await page.goto(url, { waitUntil: 'networkidle' });

      const metrics = await page.evaluate(() => {
        return new Promise<PerformanceMetrics>((resolve) => {
          const webVitals: any = {};
          let observersCompleted = 0;
          const totalObservers = 4;

          function checkCompletion() {
            observersCompleted++;
            if (observersCompleted === totalObservers) {
              resolve({
                navigationTiming: performance.getEntriesByType(
                  'navigation',
                )[0] as PerformanceNavigationTiming,
                resourceTiming: performance.getEntriesByType(
                  'resource',
                ) as PerformanceResourceTiming[],
                paintTiming: performance.getEntriesByType('paint'),
                webVitals,
              });
            }
          }

          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            webVitals.lcp = entries[entries.length - 1]?.startTime || 0;
            checkCompletion();
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              webVitals.fid = entries[0].processingStart - entries[0].startTime;
            }
            checkCompletion();
          }).observe({ entryTypes: ['first-input'] });

          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            webVitals.cls = clsValue;
            checkCompletion();
          }).observe({ entryTypes: ['layout-shift'] });

          // Paint timing
          const paintEntries = performance.getEntriesByType('paint');
          webVitals.fcp =
            paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0;
          webVitals.ttfb =
            (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)
              ?.responseStart || 0;
          checkCompletion();

          // Timeout after 10 seconds
          setTimeout(() => {
            if (observersCompleted < totalObservers) {
              checkCompletion();
            }
          }, 10000);
        });
      });

      results.push(metrics);
      await context.close();

      // Wait between iterations
      if (i < iterations - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  analyzeResults(results: PerformanceMetrics[]) {
    const metrics = results.map((r) => r.webVitals);

    return {
      lcp: {
        median: this.calculateMedian(metrics.map((m) => m.lcp)),
        p95: this.calculatePercentile(
          metrics.map((m) => m.lcp),
          95,
        ),
        average: metrics.reduce((sum, m) => sum + m.lcp, 0) / metrics.length,
      },
      cls: {
        median: this.calculateMedian(metrics.map((m) => m.cls)),
        p95: this.calculatePercentile(
          metrics.map((m) => m.cls),
          95,
        ),
        average: metrics.reduce((sum, m) => sum + m.cls, 0) / metrics.length,
      },
      fcp: {
        median: this.calculateMedian(metrics.map((m) => m.fcp)),
        p95: this.calculatePercentile(
          metrics.map((m) => m.fcp),
          95,
        ),
        average: metrics.reduce((sum, m) => sum + m.fcp, 0) / metrics.length,
      },
    };
  }

  private calculateMedian(values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Usage in tests
describe('E2E Performance', () => {
  let testSuite: PerformanceTestSuite;

  beforeAll(async () => {
    testSuite = new PerformanceTestSuite();
    await testSuite.setup();
  });

  afterAll(async () => {
    await testSuite.teardown();
  });

  it('should meet performance targets on mobile 3G', async () => {
    const results = await testSuite.runPerformanceTest('http://localhost:3000', {
      device: 'mobile',
      network: 'fast3G',
      iterations: 5,
    });

    const analysis = testSuite.analyzeResults(results);

    expect(analysis.lcp.median).toBeLessThan(2500);
    expect(analysis.cls.p95).toBeLessThan(0.1);
    expect(analysis.fcp.median).toBeLessThan(1800);
  });
});
```

## Continuous Performance Monitoring

### Performance Regression Detection

```tsx
// scripts/performance-regression-check.ts
interface PerformanceBaseline {
  timestamp: string;
  commit: string;
  metrics: {
    lcp: number;
    cls: number;
    fcp: number;
    bundleSize: number;
    renderTime: number;
  };
}

class PerformanceRegressionDetector {
  private baselinePath = './performance-baseline.json';

  async checkForRegressions(currentMetrics: PerformanceBaseline['metrics']): Promise<{
    hasRegressions: boolean;
    regressions: Array<{
      metric: string;
      current: number;
      baseline: number;
      regression: number;
    }>;
  }> {
    const baseline = await this.getBaseline();
    if (!baseline) {
      console.log('No baseline found - establishing new baseline');
      await this.saveBaseline(currentMetrics);
      return { hasRegressions: false, regressions: [] };
    }

    const regressions = [];
    const thresholds = {
      lcp: 0.1, // 10% regression threshold
      cls: 0.05, // 5% regression threshold
      fcp: 0.1, // 10% regression threshold
      bundleSize: 0.05, // 5% regression threshold
      renderTime: 0.2, // 20% regression threshold
    };

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const current = currentMetrics[metric as keyof typeof currentMetrics];
      const baselineValue = baseline.metrics[metric as keyof typeof baseline.metrics];

      const regression = (current - baselineValue) / baselineValue;

      if (regression > threshold) {
        regressions.push({
          metric,
          current,
          baseline: baselineValue,
          regression,
        });
      }
    }

    return {
      hasRegressions: regressions.length > 0,
      regressions,
    };
  }

  async saveBaseline(metrics: PerformanceBaseline['metrics']) {
    const baseline: PerformanceBaseline = {
      timestamp: new Date().toISOString(),
      commit: process.env.GITHUB_SHA || 'local',
      metrics,
    };

    await fs.writeFile(this.baselinePath, JSON.stringify(baseline, null, 2));
  }

  private async getBaseline(): Promise<PerformanceBaseline | null> {
    try {
      const data = await fs.readFile(this.baselinePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}
```

## Performance Testing Best Practices

### Test Data Management

```tsx
// utils/performance-test-data.ts
export class PerformanceTestDataGenerator {
  static generateUsers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i.toString(),
      name: `User ${i}`,
      email: `user${i}@example.com`,
      avatar: `https://api.dicebear.com/6.x/personas/svg?seed=${i}`,
      role: ['admin', 'user', 'moderator'][i % 3],
      lastSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      posts: Math.floor(Math.random() * 100),
      followers: Math.floor(Math.random() * 1000),
    }));
  }

  static generateLargeDataset(rows: number, columns: number) {
    return Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: columns }, (_, colIndex) => ({
        id: `${rowIndex}-${colIndex}`,
        value: Math.random() * 1000,
        category: `Category ${colIndex}`,
        timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      })),
    );
  }

  static generateDeepNestedData(depth: number, breadth: number): any {
    if (depth === 0) {
      return {
        id: Math.random().toString(36),
        value: Math.random() * 100,
        name: `Item ${Math.floor(Math.random() * 1000)}`,
      };
    }

    return {
      id: Math.random().toString(36),
      children: Array.from({ length: breadth }, () =>
        this.generateDeepNestedData(depth - 1, breadth),
      ),
    };
  }
}
```

### Performance Test Utilities

```tsx
// utils/performance-assertions.ts
export function expectPerformanceWithin(actual: number, expected: number, tolerance: number = 0.1) {
  const lowerBound = expected * (1 - tolerance);
  const upperBound = expected * (1 + tolerance);

  expect(actual).toBeGreaterThanOrEqual(lowerBound);
  expect(actual).toBeLessThanOrEqual(upperBound);
}

export function expectNoMemoryLeak(
  initialMemory: number,
  finalMemory: number,
  threshold: number = 10 * 1024 * 1024, // 10MB
) {
  const memoryGrowth = finalMemory - initialMemory;
  expect(memoryGrowth).toBeLessThan(threshold);
}

export function expectBundleSizeWithinBudget(actualSize: number, budget: number) {
  expect(actualSize).toBeLessThan(budget);
}
```

## Related Topics

- **[Performance Budgets & Automation](./performance-budgets-and-automation.md)** - Setting pass/fail criteria and CI integration
- **[Measuring Performance with Real Tools](./measuring-performance-with-real-tools.md)** - DevTools and profiling implementation details
- **[Production Performance Monitoring](./production-performance-monitoring.md)** - Real-world performance tracking
- **[Debugging Performance Issues](./debugging-performance-issues.md)** - Performance investigation playbook
- **[Core Web Vitals for React](./core-web-vitals-for-react.md)** - Key metrics for testing

## Next Steps

Effective performance testing requires:

1. **Automated integration** - Run performance tests on every PR
2. **Realistic test data** - Use production-like data volumes and complexity
3. **Multiple device profiles** - Test on various devices and network conditions
4. **Baseline tracking** - Monitor performance trends over time
5. **Clear thresholds** - Set measurable performance targets
6. **Fast feedback loops** - Keep unit tests fast, save comprehensive tests for CI

Start with unit performance tests for your most critical components, then gradually expand to integration and E2E testing. The goal is to catch performance regressions before they reach production while maintaining development velocity.

Remember: performance is a feature, not an afterthought. Test it like you would test any other critical functionality.
