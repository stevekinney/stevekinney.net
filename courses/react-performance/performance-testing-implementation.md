---
title: Performance Testing Implementation Guide
description: >-
  Implement comprehensive performance testing with E2E testing, Lighthouse CI,
  continuous monitoring, and automated performance regression detection.
date: 2025-09-20T01:15:00.000Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - testing
  - ci-cd
  - lighthouse
---

This implementation guide covers advanced performance testing techniques including end-to-end performance testing, Lighthouse CI integration, continuous monitoring, and automated performance regression detection for production React applications.

## End-to-End Performance Testing

### Lighthouse CI Integration

```typescript
// lighthouse-ci.config.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/products',
        'http://localhost:3000/checkout',
      ],
      startServerCommand: 'npm run start',
      numberOfRuns: 5,
      settings: {
        preset: 'perf',
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],

        // Custom metrics
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        interactive: ['error', { maxNumericValue: 3000 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Resource optimization
        'unused-javascript': ['error', { maxLength: 0 }],
        'unused-css-rules': ['warn', { maxLength: 1 }],
        'uses-optimized-images': 'error',
        'uses-webp-images': 'error',
        'uses-text-compression': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
      storage: './lighthouse-reports',
    },
  },
};

// Custom Lighthouse audit
const fs = require('fs');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

class PerformanceTestSuite {
  async runLighthouseAudit(url: string, options = {}) {
    const chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox'],
    });

    const lighthouseOptions = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance'],
      port: chrome.port,
      ...options,
    };

    const runnerResult = await lighthouse(url, lighthouseOptions);
    await chrome.kill();

    return runnerResult;
  }

  async validatePerformanceBudget(result: any, budget: PerformanceBudget) {
    const { lhr } = result;
    const violations = [];

    // Check Core Web Vitals
    const fcp = lhr.audits['first-contentful-paint'].numericValue;
    const lcp = lhr.audits['largest-contentful-paint'].numericValue;
    const cls = lhr.audits['cumulative-layout-shift'].numericValue;
    const tbt = lhr.audits['total-blocking-time'].numericValue;

    if (fcp > budget.fcp) {
      violations.push(`FCP: ${fcp}ms exceeds budget of ${budget.fcp}ms`);
    }

    if (lcp > budget.lcp) {
      violations.push(`LCP: ${lcp}ms exceeds budget of ${budget.lcp}ms`);
    }

    if (cls > budget.cls) {
      violations.push(`CLS: ${cls} exceeds budget of ${budget.cls}`);
    }

    if (tbt > budget.tbt) {
      violations.push(`TBT: ${tbt}ms exceeds budget of ${budget.tbt}ms`);
    }

    return violations;
  }

  generatePerformanceReport(results: any[]) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRuns: results.length,
        averageScore:
          results.reduce((sum, r) => sum + r.lhr.categories.performance.score, 0) / results.length,
        violations: [],
      },
      metrics: {
        fcp: this.calculateMetricStats(results, 'first-contentful-paint'),
        lcp: this.calculateMetricStats(results, 'largest-contentful-paint'),
        cls: this.calculateMetricStats(results, 'cumulative-layout-shift'),
        tbt: this.calculateMetricStats(results, 'total-blocking-time'),
      },
      recommendations: this.generateRecommendations(results),
    };

    return report;
  }

  private calculateMetricStats(results: any[], metricName: string) {
    const values = results.map((r) => r.lhr.audits[metricName].numericValue);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      p95: this.percentile(values, 95),
    };
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sorted[lower];

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private generateRecommendations(results: any[]): string[] {
    const recommendations = [];
    const avgResult = results[0]; // Use first result for audit analysis

    // Analyze common issues
    if (avgResult.lhr.audits['unused-javascript'].score < 0.9) {
      recommendations.push('Remove unused JavaScript to reduce bundle size');
    }

    if (avgResult.lhr.audits['uses-optimized-images'].score < 1) {
      recommendations.push('Optimize images using modern formats (WebP, AVIF)');
    }

    if (avgResult.lhr.audits['uses-text-compression'].score < 1) {
      recommendations.push('Enable gzip/brotli compression for text resources');
    }

    return recommendations;
  }
}
```

### Custom Performance Test Suite

```typescript
// Custom E2E performance testing with Playwright
import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  loadTime: number;
  domContentLoaded: number;
  resourceCount: number;
  transferSize: number;
}

class PlaywrightPerformanceTester {
  async measurePagePerformance(page: Page): Promise<PerformanceMetrics> {
    // Start performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        navigationStart: performance.timeOrigin,
        measurements: [],
      };

      // Observe Web Vitals
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.performanceMetrics.measurements.push({
            name: entry.name,
            value: entry.value,
            startTime: entry.startTime,
          });
        }
      }).observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    });

    // Navigate and wait for load
    await page.goto(page.url());
    await page.waitForLoadState('networkidle');

    // Calculate metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');

      const fcp =
        paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0;

      return {
        fcp,
        lcp: 0, // Will be measured via Web Vitals library
        cls: 0, // Will be measured via Web Vitals library
        tbt: 0, // Calculated from long tasks
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        resourceCount: performance.getEntriesByType('resource').length,
        transferSize: navigation.transferSize || 0,
      };
    });

    return metrics;
  }

  async runPerformanceTest(
    page: Page,
    testName: string,
    budget: Partial<PerformanceMetrics>,
    runs: number = 3,
  ) {
    const results = [];

    for (let i = 0; i < runs; i++) {
      // Clear cache between runs for consistency
      await page.context().clearCookies();

      const metrics = await this.measurePagePerformance(page);
      results.push(metrics);

      // Small delay between runs
      await page.waitForTimeout(1000);
    }

    // Calculate averages
    const avgMetrics = this.calculateAverages(results);

    // Validate against budget
    const violations = this.validateBudget(avgMetrics, budget);

    // Report results
    console.log(`Performance Test: ${testName}`);
    console.log('Average Metrics:', avgMetrics);

    if (violations.length > 0) {
      console.warn('Budget Violations:', violations);
    }

    return {
      testName,
      metrics: avgMetrics,
      violations,
      passed: violations.length === 0,
    };
  }

  private calculateAverages(results: PerformanceMetrics[]): PerformanceMetrics {
    const avg = (values: number[]) => values.reduce((sum, val) => sum + val, 0) / values.length;

    return {
      fcp: avg(results.map((r) => r.fcp)),
      lcp: avg(results.map((r) => r.lcp)),
      cls: avg(results.map((r) => r.cls)),
      tbt: avg(results.map((r) => r.tbt)),
      loadTime: avg(results.map((r) => r.loadTime)),
      domContentLoaded: avg(results.map((r) => r.domContentLoaded)),
      resourceCount: avg(results.map((r) => r.resourceCount)),
      transferSize: avg(results.map((r) => r.transferSize)),
    };
  }

  private validateBudget(
    metrics: PerformanceMetrics,
    budget: Partial<PerformanceMetrics>,
  ): string[] {
    const violations = [];

    Object.entries(budget).forEach(([key, limit]) => {
      const value = metrics[key as keyof PerformanceMetrics];
      if (value > limit!) {
        violations.push(`${key}: ${value} exceeds budget of ${limit}`);
      }
    });

    return violations;
  }
}

// Playwright test implementation
test.describe('Performance Tests', () => {
  let perfTester: PlaywrightPerformanceTester;

  test.beforeEach(() => {
    perfTester = new PlaywrightPerformanceTester();
  });

  test('Homepage performance', async ({ page }) => {
    const budget = {
      fcp: 2000,
      lcp: 2500,
      cls: 0.1,
      loadTime: 3000,
    };

    const result = await perfTester.runPerformanceTest(page, 'Homepage Load', budget, 5);

    expect(result.passed).toBe(true);
  });

  test('Product page performance', async ({ page }) => {
    await page.goto('/products/example');

    const budget = {
      fcp: 2500,
      lcp: 3000,
      cls: 0.15,
      loadTime: 4000,
    };

    const result = await perfTester.runPerformanceTest(page, 'Product Page Load', budget, 3);

    expect(result.passed).toBe(true);
  });
});
```

## Continuous Performance Monitoring

### Performance Regression Detection

```typescript
// Automated performance regression detection
interface PerformanceBaseline {
  url: string;
  metrics: PerformanceMetrics;
  timestamp: string;
  commitHash: string;
}

class PerformanceRegressionDetector {
  private baselines: Map<string, PerformanceBaseline[]> = new Map();

  async recordBaseline(url: string, metrics: PerformanceMetrics, commitHash: string) {
    const baseline: PerformanceBaseline = {
      url,
      metrics,
      timestamp: new Date().toISOString(),
      commitHash,
    };

    if (!this.baselines.has(url)) {
      this.baselines.set(url, []);
    }

    this.baselines.get(url)!.push(baseline);

    // Keep only last 50 baselines
    const urlBaselines = this.baselines.get(url)!;
    if (urlBaselines.length > 50) {
      urlBaselines.splice(0, urlBaselines.length - 50);
    }

    // Store in database/file
    await this.persistBaselines();
  }

  detectRegressions(
    url: string,
    currentMetrics: PerformanceMetrics,
    thresholds: { [key: string]: number },
  ): RegressionReport {
    const baselines = this.baselines.get(url) || [];
    if (baselines.length < 3) {
      return { hasRegression: false, message: 'Insufficient baseline data' };
    }

    // Calculate moving average of last 10 measurements
    const recentBaselines = baselines.slice(-10);
    const avgMetrics = this.calculateAverageMetrics(recentBaselines.map((b) => b.metrics));

    const regressions = [];

    // Check each metric against threshold
    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const current = currentMetrics[metric as keyof PerformanceMetrics];
      const baseline = avgMetrics[metric as keyof PerformanceMetrics];
      const increase = ((current - baseline) / baseline) * 100;

      if (increase > threshold) {
        regressions.push({
          metric,
          current,
          baseline,
          increase: `${increase.toFixed(1)}%`,
          threshold: `${threshold}%`,
        });
      }
    });

    return {
      hasRegression: regressions.length > 0,
      regressions,
      currentMetrics,
      baselineMetrics: avgMetrics,
    };
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const avg = (values: number[]) => values.reduce((sum, val) => sum + val, 0) / values.length;

    return {
      fcp: avg(metrics.map((m) => m.fcp)),
      lcp: avg(metrics.map((m) => m.lcp)),
      cls: avg(metrics.map((m) => m.cls)),
      tbt: avg(metrics.map((m) => m.tbt)),
      loadTime: avg(metrics.map((m) => m.loadTime)),
      domContentLoaded: avg(metrics.map((m) => m.domContentLoaded)),
      resourceCount: avg(metrics.map((m) => m.resourceCount)),
      transferSize: avg(metrics.map((m) => m.transferSize)),
    };
  }

  async persistBaselines() {
    // Save to file or database
    const data = Object.fromEntries(this.baselines);
    await fs.writeFile('performance-baselines.json', JSON.stringify(data, null, 2));
  }

  async loadBaselines() {
    try {
      const data = await fs.readFile('performance-baselines.json', 'utf-8');
      const parsed = JSON.parse(data);
      this.baselines = new Map(Object.entries(parsed));
    } catch (error) {
      console.warn('No existing baselines found');
    }
  }
}

// GitHub Actions integration
// .github/workflows/performance.yml
const githubWorkflow = `
name: Performance Testing

on:
  pull_request:
    branches: [main]
  push:
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

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: \${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Run custom performance tests
        run: npm run test:performance

      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            lighthouse-reports/
            performance-results.json
`;
```

## Performance Testing Best Practices

### Test Data Management

```typescript
// Performance test data management
class PerformanceTestDataManager {
  async setupTestData(scenario: 'light' | 'heavy' | 'realistic') {
    const testData = {
      light: {
        products: 10,
        users: 5,
        images: 'optimized',
        cacheState: 'warm',
      },
      heavy: {
        products: 1000,
        users: 100,
        images: 'unoptimized',
        cacheState: 'cold',
      },
      realistic: {
        products: 100,
        users: 20,
        images: 'mixed',
        cacheState: 'mixed',
      },
    };

    return testData[scenario];
  }

  async seedDatabase(config: any) {
    // Seed test database with specific data
    // Implementation depends on your backend
  }

  async setupCacheState(state: 'warm' | 'cold' | 'mixed') {
    switch (state) {
      case 'warm':
        // Pre-populate caches
        break;
      case 'cold':
        // Clear all caches
        break;
      case 'mixed':
        // Partially populate caches
        break;
    }
  }
}

// Performance test utilities
export class PerformanceTestUtils {
  static async waitForPageToStabilize(page: Page) {
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');

    // Wait for any animations to complete
    await page.waitForTimeout(500);

    // Wait for layout shifts to settle
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let lastLayoutShift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift') {
              lastLayoutShift = Date.now();
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });

        const checkStability = () => {
          if (Date.now() - lastLayoutShift > 100) {
            resolve(undefined);
          } else {
            setTimeout(checkStability, 50);
          }
        };

        setTimeout(checkStability, 50);
      });
    });
  }

  static calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // Simplified scoring based on Core Web Vitals
    const fcpScore = metrics.fcp <= 1800 ? 100 : Math.max(0, 100 - (metrics.fcp - 1800) / 10);
    const lcpScore = metrics.lcp <= 2500 ? 100 : Math.max(0, 100 - (metrics.lcp - 2500) / 20);
    const clsScore = metrics.cls <= 0.1 ? 100 : Math.max(0, 100 - (metrics.cls - 0.1) * 1000);

    return (fcpScore + lcpScore + clsScore) / 3;
  }

  static generatePerformanceReport(results: PerformanceTestResult[]): string {
    const report = `
# Performance Test Report

Generated: ${new Date().toISOString()}

## Summary
- Total Tests: ${results.length}
- Passed: ${results.filter((r) => r.passed).length}
- Failed: ${results.filter((r) => !r.passed).length}

## Results
${results
  .map(
    (result) => `
### ${result.testName}
- Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- Performance Score: ${this.calculatePerformanceScore(result.metrics).toFixed(1)}/100
- FCP: ${result.metrics.fcp.toFixed(0)}ms
- LCP: ${result.metrics.lcp.toFixed(0)}ms
- CLS: ${result.metrics.cls.toFixed(3)}

${result.violations.length > 0 ? `**Violations:**\n${result.violations.map((v) => `- ${v}`).join('\n')}` : ''}
`,
  )
  .join('')}
    `;

    return report.trim();
  }
}
```
