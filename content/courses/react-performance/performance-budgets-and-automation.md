---
title: Performance Budgets & Automation
description: >-
  Set and enforce performance budgets in your React apps. Automate testing,
  catch regressions in CI/CD, and maintain fast applications at scale.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - automation
  - ci-cd
  - testing
---

Performance optimization without budgets is like dieting without a scale—you might feel like you're making progress, but you have no idea if you're actually succeeding. Performance budgets turn vague goals like "make it faster" into concrete, measurable targets like "keep the bundle under 200KB" and "ensure LCP stays below 2.5 seconds." But budgets alone aren't enough—you need automation to enforce them, catching performance regressions before they hit production.

This guide shows you how to establish realistic performance budgets for your React applications, implement automated testing that enforces these budgets in your CI/CD pipeline, and create a culture where performance is a feature, not an afterthought. You'll learn to catch that 50KB library addition in PR review, prevent that O(n²) algorithm from reaching main, and sleep soundly knowing your app won't suddenly become sluggish.

## Understanding Performance Budgets

Performance budgets are constraints you set on various metrics that affect user experience:

```tsx
// Types of performance budgets
interface PerformanceBudgets {
  // Bundle size budgets
  bundle: {
    mainJS: '200KB'; // Main bundle size
    mainCSS: '50KB'; // CSS bundle size
    totalInitial: '300KB'; // Total initial load
    chunkSize: '50KB'; // Max lazy-loaded chunk
    increase: '5%'; // Max increase per PR
  };

  // Loading performance budgets
  loading: {
    fcp: 1800; // First Contentful Paint (ms)
    lcp: 2500; // Largest Contentful Paint (ms)
    tti: 3800; // Time to Interactive (ms)
    fid: 100; // First Input Delay (ms)
    cls: 0.1; // Cumulative Layout Shift
  };

  // Runtime performance budgets
  runtime: {
    componentRender: 16; // Max render time (ms)
    stateUpdate: 100; // Max state update (ms)
    animation: 16; // Animation frame budget (ms)
    memoryIncrease: '10MB'; // Max memory growth per session
  };

  // Network budgets
  network: {
    requests: 50; // Max parallel requests
    apiResponse: 1000; // Max API response time (ms)
    totalTransfer: '1MB'; // Total network transfer
    cacheRatio: 0.8; // Min cache hit ratio
  };
}
```

## Setting Realistic Budgets

### Baseline Measurement

```tsx
// utils/performanceBaseline.ts
export class PerformanceBaseliner {
  private metrics: Map<string, number[]> = new Map();

  async measureBaseline(url: string, iterations: number = 5) {
    const results = {
      bundle: await this.measureBundle(),
      loading: await this.measureLoading(url, iterations),
      runtime: await this.measureRuntime(url),
      recommendations: {} as any,
    };

    // Generate budget recommendations
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  private async measureBundle(): Promise<BundleMetrics> {
    // Use webpack-bundle-analyzer output
    const statsFile = await fetch('/bundle-stats.json');
    const stats = await statsFile.json();

    return {
      mainJS: stats.assets.find((a: any) => a.name.includes('main')).size,
      mainCSS: stats.assets.find((a: any) => a.name.includes('css')).size,
      totalInitial: stats.assets
        .filter((a: any) => a.isInitial)
        .reduce((sum: number, a: any) => sum + a.size, 0),
      chunks: stats.chunks.map((c: any) => ({
        name: c.names[0],
        size: c.size,
      })),
    };
  }

  private async measureLoading(url: string, iterations: number) {
    const measurements = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.runLighthouse(url);
      measurements.push(result);
    }

    // Calculate percentiles
    return {
      fcp: this.percentile(
        measurements.map((m) => m.fcp),
        75,
      ),
      lcp: this.percentile(
        measurements.map((m) => m.lcp),
        75,
      ),
      tti: this.percentile(
        measurements.map((m) => m.tti),
        75,
      ),
      fid: this.percentile(
        measurements.map((m) => m.fid),
        75,
      ),
      cls: this.percentile(
        measurements.map((m) => m.cls),
        75,
      ),
    };
  }

  private async runLighthouse(url: string) {
    // Run Lighthouse programmatically
    const lighthouse = await import('lighthouse');
    const chrome = await import('chrome-launcher');

    const browser = await chrome.launch({ chromeFlags: ['--headless'] });
    const options = {
      logLevel: 'error',
      output: 'json',
      port: browser.port,
    };

    const runnerResult = await lighthouse.default(url, options);
    await browser.kill();

    const { audits } = runnerResult.lhr;

    return {
      fcp: audits['first-contentful-paint'].numericValue,
      lcp: audits['largest-contentful-paint'].numericValue,
      tti: audits['interactive'].numericValue,
      fid: audits['max-potential-fid'].numericValue,
      cls: audits['cumulative-layout-shift'].numericValue,
    };
  }

  private generateRecommendations(results: any) {
    const recommendations = {
      bundle: {},
      loading: {},
    };

    // Bundle recommendations (add 20% buffer)
    recommendations.bundle = {
      mainJS: Math.ceil(results.bundle.mainJS * 1.2),
      mainCSS: Math.ceil(results.bundle.mainCSS * 1.2),
      totalInitial: Math.ceil(results.bundle.totalInitial * 1.2),
    };

    // Loading recommendations (use 75th percentile)
    recommendations.loading = {
      fcp: Math.ceil(results.loading.fcp * 1.1),
      lcp: Math.ceil(results.loading.lcp * 1.1),
      tti: Math.ceil(results.loading.tti * 1.1),
      fid: Math.min(100, Math.ceil(results.loading.fid * 1.1)),
      cls: Math.min(0.1, results.loading.cls * 1.1),
    };

    return recommendations;
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Generate baseline for your app
async function generateBaseline() {
  const baseliner = new PerformanceBaseliner();
  const baseline = await baseliner.measureBaseline('http://localhost:3000');

  console.log('Current Performance Baseline:');
  console.table(baseline);

  console.log('\nRecommended Budgets:');
  console.table(baseline.recommendations);

  // Save to config file
  fs.writeFileSync('performance-budget.json', JSON.stringify(baseline.recommendations, null, 2));
}
```

## Webpack Bundle Analysis and Budgets

### Webpack Configuration

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleBudgetPlugin } = require('./webpack/bundleBudgetPlugin');

module.exports = {
  plugins: [
    // Analyze bundle composition
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    }),

    // Custom budget enforcement
    new BundleBudgetPlugin({
      bundles: [
        {
          name: 'main',
          maxSize: '200KB',
        },
        {
          name: 'vendor',
          maxSize: '150KB',
        },
      ],
      chunks: {
        maxSize: '50KB',
      },
    }),

    // Compression for production
    new CompressionPlugin({
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
  ],

  performance: {
    maxEntrypointSize: 300000, // 300KB
    maxAssetSize: 250000, // 250KB
    hints: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
  },
};
```

### Custom Budget Plugin

```javascript
// webpack/bundleBudgetPlugin.js
const chalk = require('chalk');
const filesize = require('filesize');

class BundleBudgetPlugin {
  constructor(options) {
    this.budgets = options.bundles || [];
    this.chunkBudget = options.chunks || {};
    this.failOnError = options.failOnError !== false;
  }

  apply(compiler) {
    compiler.hooks.done.tap('BundleBudgetPlugin', (stats) => {
      const compilation = stats.compilation;
      const assets = compilation.assets;
      const errors = [];
      const warnings = [];

      // Check bundle budgets
      this.budgets.forEach((budget) => {
        const asset = Object.keys(assets).find((name) => name.includes(budget.name));

        if (asset) {
          const size = assets[asset].size();
          const maxSize = this.parseSize(budget.maxSize);

          if (size > maxSize) {
            const message = `Bundle "${budget.name}" exceeds budget: ${filesize(size)} > ${budget.maxSize}`;

            if (this.failOnError) {
              errors.push(new Error(chalk.red(message)));
            } else {
              warnings.push(chalk.yellow(message));
            }
          } else {
            console.log(
              chalk.green(`✓ Bundle "${budget.name}": ${filesize(size)} < ${budget.maxSize}`),
            );
          }
        }
      });

      // Check chunk budgets
      if (this.chunkBudget.maxSize) {
        const maxChunkSize = this.parseSize(this.chunkBudget.maxSize);

        compilation.chunks.forEach((chunk) => {
          if (!chunk.canBeInitial()) {
            const size = chunk.size();

            if (size > maxChunkSize) {
              const message = `Chunk "${chunk.name || chunk.id}" exceeds budget: ${filesize(size)} > ${this.chunkBudget.maxSize}`;

              if (this.failOnError) {
                errors.push(new Error(chalk.red(message)));
              } else {
                warnings.push(chalk.yellow(message));
              }
            }
          }
        });
      }

      // Add errors and warnings to compilation
      compilation.errors.push(...errors);
      compilation.warnings.push(...warnings);

      // Generate report
      this.generateReport(stats);
    });
  }

  parseSize(size) {
    if (typeof size === 'number') return size;

    const units = {
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };

    const match = size.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);
    if (!match) throw new Error(`Invalid size format: ${size}`);

    return parseFloat(match[1]) * units[match[2].toUpperCase()];
  }

  generateReport(stats) {
    const report = {
      timestamp: new Date().toISOString(),
      bundles: {},
      chunks: {},
      total: 0,
    };

    const assets = stats.compilation.assets;

    Object.keys(assets).forEach((name) => {
      const size = assets[name].size();
      report.bundles[name] = size;
      report.total += size;
    });

    // Save report for tracking
    fs.writeFileSync('performance-report.json', JSON.stringify(report, null, 2));
  }
}

module.exports = { BundleBudgetPlugin };
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/performance.yml
name: Performance Budget Check

on:
  pull_request:
    branches: [main]

jobs:
  performance:
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

      - name: Check bundle size
        run: npm run budget:check

      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/dashboard
          budgetPath: './budget.json'
          temporaryPublicStorage: true

      - name: Upload performance artifacts
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            .lighthouseci/
            performance-report.json
            bundle-stats.json

      - name: Comment PR with results
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('performance-report.json'));

            const comment = `## Performance Report

            ### Bundle Sizes
            - Main: ${filesize(report.bundles.main)}
            - Vendor: ${filesize(report.bundles.vendor)}
            - Total: ${filesize(report.total)}

            ### Lighthouse Scores
            - Performance: ${report.lighthouse.performance}
            - FCP: ${report.lighthouse.fcp}ms
            - LCP: ${report.lighthouse.lcp}ms
            - TTI: ${report.lighthouse.tti}ms
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './build',
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        interactive: ['error', { maxNumericValue: 3800 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'max-potential-fid': ['warn', { maxNumericValue: 100 }],
        'uses-responsive-images': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'error',
        'uses-rel-preconnect': 'warn',
        'unused-javascript': ['warn', { maxNumericValue: 50000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## Runtime Performance Monitoring

Runtime performance monitoring integrates with CI automation to enforce budgets during development. For detailed production monitoring implementation, see [production-performance-monitoring.md](./production-performance-monitoring.md).

```tsx
// Basic budget violation detection for development
export function setupBudgetWatcher(budgets: RuntimeBudgets) {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure' && entry.name.startsWith('react-render-')) {
        if (entry.duration > budgets.componentRender) {
          console.warn(
            `Budget violation: ${entry.name} took ${entry.duration.toFixed(2)}ms, budget: ${budgets.componentRender}ms`,
          );
        }
      }
    }
  });

  observer.observe({ entryTypes: ['measure'] });
  return () => observer.disconnect();
}
```

## Automated Performance Testing

Performance testing should be integrated into your budget enforcement pipeline. For comprehensive testing strategies and patterns, see [performance-testing-strategy.md](./performance-testing-strategy.md).

### Jest Performance Tests

```typescript
// __tests__/performance.test.ts
import { render } from '@testing-library/react';
import { measureRender } from '../utils/performanceTest';

describe('Performance Tests', () => {
  describe('Component Render Performance', () => {
    it('should render ProductList within budget', async () => {
      const products = generateMockProducts(100);

      const { duration, rerenders } = await measureRender(
        <ProductList products={products} />
      );

      expect(duration).toBeLessThan(50); // 50ms budget
      expect(rerenders).toBe(0); // No unnecessary rerenders
    });

    it('should handle large datasets efficiently', async () => {
      const items = generateLargeDataset(10000);

      const { duration, memoryUsed } = await measureRender(
        <VirtualizedList items={items} />
      );

      expect(duration).toBeLessThan(100); // 100ms for large dataset
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB memory budget
    });
  });

  describe('State Update Performance', () => {
    it('should update state within budget', async () => {
      const { result } = renderHook(() => useComplexState());

      const startTime = performance.now();
      act(() => {
        result.current.updateMultipleFields({
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
        });
      });
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(16); // One frame
    });
  });
});

// Performance test utilities
export async function measureRender(component: ReactElement) {
  const startTime = performance.now();
  const startMemory = performance.memory?.usedJSHeapSize || 0;

  let rerenders = 0;
  const { rerender } = render(
    <Profiler
      id="test"
      onRender={() => {
        rerenders++;
      }}
    >
      {component}
    </Profiler>
  );

  // Wait for effects
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  const duration = performance.now() - startTime;
  const memoryUsed = (performance.memory?.usedJSHeapSize || 0) - startMemory;

  return {
    duration,
    rerenders: rerenders - 1, // Subtract initial render
    memoryUsed,
  };
}
```

### Playwright E2E Performance Tests

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance E2E Tests', () => {
  test('should load homepage within performance budget', async ({ page }) => {
    // Start performance measurement
    await page.goto('/');

    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded:
          navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        fcp: paint.find((p) => p.name === 'first-contentful-paint')?.startTime,
        lcp: new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        }),
      };
    });

    // Assert against budgets
    expect(metrics.domContentLoaded).toBeLessThan(1000);
    expect(metrics.loadComplete).toBeLessThan(3000);
    expect(metrics.fcp).toBeLessThan(1800);
    expect(await metrics.lcp).toBeLessThan(2500);
  });

  test('should handle interactions within budget', async ({ page }) => {
    await page.goto('/dashboard');

    // Measure interaction performance
    const interactionTime = await page.evaluate(async () => {
      const button = document.querySelector('[data-testid="filter-button"]');
      const startTime = performance.now();

      button?.click();

      // Wait for UI update
      await new Promise((resolve) => requestAnimationFrame(resolve));

      return performance.now() - startTime;
    });

    expect(interactionTime).toBeLessThan(100); // 100ms interaction budget
  });

  test('should not leak memory during navigation', async ({ page }) => {
    await page.goto('/');

    const initialMemory = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    // Navigate through the app
    for (let i = 0; i < 10; i++) {
      await page.goto('/products');
      await page.goto('/dashboard');
      await page.goto('/settings');
    }

    await page.goto('/');

    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) window.gc();
    });

    const finalMemory = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB tolerance
  });
});
```

## Bundle Size Tracking

### Size Limit Configuration

```json
// .size-limit.json
[
  {
    "name": "Main Bundle",
    "path": "build/static/js/main.*.js",
    "limit": "200 KB",
    "webpack": false,
    "gzip": true
  },
  {
    "name": "CSS Bundle",
    "path": "build/static/css/main.*.css",
    "limit": "50 KB",
    "webpack": false,
    "gzip": true
  },
  {
    "name": "Total App",
    "path": "build/static/**/*.{js,css}",
    "limit": "300 KB",
    "webpack": false,
    "gzip": true
  }
]
```

### NPM Scripts

```json
// package.json
{
  "scripts": {
    "build": "react-scripts build",
    "build:analyze": "ANALYZE=true npm run build",
    "budget:check": "size-limit",
    "budget:why": "size-limit --why",
    "performance:test": "jest --testMatch='**/*.perf.test.{ts,tsx}'",
    "lighthouse": "lighthouse http://localhost:3000 --budget-path=./budget.json --output=json --output-path=./lighthouse-report.json",
    "performance:baseline": "node scripts/generateBaseline.js",
    "performance:report": "node scripts/performanceReport.js"
  },
  "size-limit": [
    {
      "path": "build/static/js/*.js",
      "limit": "200 KB"
    }
  ],
  "husky": {
    "hooks": {
      "pre-push": "npm run budget:check"
    }
  }
}
```

## Performance Dashboard Integration

Performance dashboards and alerting systems should be integrated with your automation pipeline to provide visibility into budget compliance over time. For comprehensive dashboard implementation and production alerting, see [production-performance-monitoring.md](./production-performance-monitoring.md).

