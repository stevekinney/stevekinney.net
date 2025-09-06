---
title: Performance Budgets and Monitoring
description: Set measurable performance targets, track them automatically, and prevent regressions before they reach production.
date: 2025-09-06T23:00:00.000Z
modified: 2025-09-06T23:00:00.000Z
published: true
tags: ['react', 'performance', 'monitoring', 'budgets']
---

Performance budgets are your defense against the creeping bloat that slowly kills user experience. Without them, your initially snappy React app becomes death by a thousand cuts—a new library here, an unoptimized image there, a forgotten console.log in production. By the time users complain, you're serving 3MB of JavaScript to view a simple form. Performance budgets prevent this by setting measurable limits on what you ship and automated systems to enforce them.

Think of performance budgets like financial budgets: they force conscious decisions about what you can afford. Want to add that fancy animation library? Great, but what are you removing to stay under budget? This constraint-driven approach ensures performance remains a first-class concern throughout development, not an afterthought during crisis mode.

## What Are Performance Budgets?

Performance budgets are measurable limits on performance-impacting resources. They can be:

- **Resource budgets**: File sizes (JS bundle ≤ 200KB, images ≤ 500KB total)
- **Timing budgets**: Performance metrics (First Contentful Paint ≤ 1.5s, Time to Interactive ≤ 3s)
- **Quantity budgets**: Count limits (≤ 10 JavaScript requests, ≤ 50 DOM nodes per component)

Here's how different types serve different purposes:

```typescript
// Example performance budget configuration
interface PerformanceBudget {
  // Resource budgets - what you ship
  resources: {
    javascript: { max: 250_000 }; // 250KB
    css: { max: 50_000 }; // 50KB
    images: { max: 500_000 }; // 500KB
    fonts: { max: 100_000 }; // 100KB
  };

  // Timing budgets - user experience
  timing: {
    firstContentfulPaint: { max: 1500 }; // 1.5s
    largestContentfulPaint: { max: 2500 }; // 2.5s
    timeToInteractive: { max: 3000 }; // 3s
    cumulativeLayoutShift: { max: 0.1 }; // 10% CLS
  };

  // Quantity budgets - complexity limits
  quantity: {
    httpRequests: { max: 20 };
    domNodes: { max: 1500 };
    renderingComponents: { max: 100 };
  };
}
```

> [!TIP]
> Start with generous budgets based on current performance, then gradually tighten them. It's better to have loose budgets you enforce than strict ones you ignore.

## Setting Realistic Performance Budgets

### Research-Based Budgeting

Your budgets should reflect real user constraints, not aspirational thinking. Here's how to set evidence-based limits:

```typescript
// Analyze your users' devices and connections
const userAnalytics = {
  // Based on your actual user data
  devices: {
    mobile: 65, // 65% mobile users
    tablet: 20,
    desktop: 15,
  },
  connections: {
    '4g': 50,
    '3g': 30,
    'slow-2g': 15,
    wifi: 5, // Assuming some users on throttled wifi
  },
};

// Calculate budgets based on network conditions
function calculateBudgetForConnection(connectionType: string) {
  const networkSpeeds = {
    'slow-2g': 50_000, // ~50KB/s
    '3g': 100_000, // ~100KB/s
    '4g': 300_000, // ~300KB/s
    wifi: 1_000_000, // ~1MB/s
  };

  const speed = networkSpeeds[connectionType] || networkSpeeds['3g'];

  // Target: Critical path loads in < 3 seconds
  return {
    criticalPath: Math.floor(speed * 3), // 3 seconds worth
    totalPage: Math.floor(speed * 10), // 10 seconds for full page
  };
}

// Example for 3G users (30% of traffic)
const budget3G = calculateBudgetForConnection('3g');
console.log(budget3G); // { criticalPath: 300KB, totalPage: 1MB }
```

### Component-Level Budgets

Don't just set app-wide budgets—allocate performance budgets to specific features and components:

```typescript
// Feature-based budget allocation
const featureBudgets = {
  // Critical path features
  authentication: {
    javascript: 30_000, // 30KB - login/register
    timing: { tti: 2000 }, // Must be interactive in 2s
  },

  // Secondary features
  dashboard: {
    javascript: 100_000, // 100KB - main app functionality
    timing: { lcp: 2500 }, // Charts can be a bit slower
  },

  // Nice-to-have features
  adminPanel: {
    javascript: 150_000, // 150KB - admin tools
    timing: { lcp: 4000 }, // Admin users are more patient
  },
};

// React component budget decorator
function withBudget<T extends React.ComponentType<any>>(
  Component: T,
  budget: { renderTime: number; memoryUsage: number }
): T {
  const BudgetedComponent = (props: any) => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    useEffect(() => {
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const renderTime = endTime - startTime;
      const memoryDelta = endMemory - startMemory;

      if (renderTime > budget.renderTime) {
        console.warn(`Component exceeded render time budget: ${renderTime}ms > ${budget.renderTime}ms`);
      }

      if (memoryDelta > budget.memoryUsage) {
        console.warn(`Component exceeded memory budget: ${memoryDelta} bytes > ${budget.memoryUsage} bytes`);
      }
    });

    return <Component {...props} />;
  };

  return BudgetedComponent as T;
}

// Usage
const BudgetedDashboard = withBudget(Dashboard, {
  renderTime: 16, // 60fps = 16ms per frame
  memoryUsage: 1_000_000, // 1MB memory increase
});
```

## Automated Budget Monitoring

### Webpack Bundle Analyzer Integration

Set up automated bundle analysis to catch size regressions:

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    // Generate bundle report in CI
    process.env.ANALYZE &&
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html',
      }),
  ].filter(Boolean),

  // Set performance budgets in Webpack
  performance: {
    maxAssetSize: 250_000, // 250KB per asset
    maxEntrypointSize: 400_000, // 400KB total entry point
    hints: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
  },
};
```

### Custom Budget Monitoring Tool

Create a tool that runs in your CI/CD pipeline:

```typescript
// scripts/check-budgets.ts
interface BudgetCheck {
  name: string;
  current: number;
  budget: number;
  unit: string;
}

class PerformanceBudgetChecker {
  private budgets: PerformanceBudget;
  private results: BudgetCheck[] = [];

  constructor(budgets: PerformanceBudget) {
    this.budgets = budgets;
  }

  async checkBundleSizes(distDir: string): Promise<void> {
    const fs = require('fs');
    const path = require('path');

    // Check JavaScript bundle size
    const jsFiles = fs
      .readdirSync(distDir)
      .filter((file: string) => file.endsWith('.js'))
      .map((file: string) => path.join(distDir, file));

    const totalJSSize = jsFiles.reduce((total: number, file: string) => {
      return total + fs.statSync(file).size;
    }, 0);

    this.results.push({
      name: 'JavaScript Bundle',
      current: totalJSSize,
      budget: this.budgets.resources.javascript.max,
      unit: 'bytes',
    });

    // Check CSS bundle size
    const cssFiles = fs
      .readdirSync(distDir)
      .filter((file: string) => file.endsWith('.css'))
      .map((file: string) => path.join(distDir, file));

    const totalCSSSize = cssFiles.reduce((total: number, file: string) => {
      return total + fs.statSync(file).size;
    }, 0);

    this.results.push({
      name: 'CSS Bundle',
      current: totalCSSSize,
      budget: this.budgets.resources.css.max,
      unit: 'bytes',
    });
  }

  async checkTimingBudgets(url: string): Promise<void> {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Simulate slow 3G connection
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: (100 * 1024) / 8, // 100 Kbps
      uploadThroughput: (50 * 1024) / 8, // 50 Kbps
      latency: 300, // 300ms latency
    });

    await page.goto(url, { waitUntil: 'networkidle0' });

    // Get Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};

          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });

          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      });
    });

    this.results.push({
      name: 'First Contentful Paint',
      current: (metrics as any).fcp,
      budget: this.budgets.timing.firstContentfulPaint.max,
      unit: 'ms',
    });

    this.results.push({
      name: 'Largest Contentful Paint',
      current: (metrics as any).lcp,
      budget: this.budgets.timing.largestContentfulPaint.max,
      unit: 'ms',
    });

    await browser.close();
  }

  generateReport(): { passed: boolean; report: string } {
    const failures = this.results.filter((check) => check.current > check.budget);
    const passed = failures.length === 0;

    let report = '# Performance Budget Report\n\n';

    if (passed) {
      report += '✅ All performance budgets passed!\n\n';
    } else {
      report += `❌ ${failures.length} budget(s) exceeded:\n\n`;
    }

    this.results.forEach((check) => {
      const status = check.current <= check.budget ? '✅' : '❌';
      const percentage = ((check.current / check.budget) * 100).toFixed(1);

      report += `${status} **${check.name}**: ${this.formatValue(check.current, check.unit)} / ${this.formatValue(check.budget, check.unit)} (${percentage}%)\n`;
    });

    return { passed, report };
  }

  private formatValue(value: number, unit: string): string {
    if (unit === 'bytes') {
      return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${value.toFixed(0)} ${unit}`;
  }
}

// Usage in CI
async function runBudgetCheck() {
  const budgets: PerformanceBudget = {
    resources: {
      javascript: { max: 250_000 },
      css: { max: 50_000 },
      images: { max: 500_000 },
      fonts: { max: 100_000 },
    },
    timing: {
      firstContentfulPaint: { max: 1500 },
      largestContentfulPaint: { max: 2500 },
      timeToInteractive: { max: 3000 },
      cumulativeLayoutShift: { max: 0.1 },
    },
    quantity: {
      httpRequests: { max: 20 },
      domNodes: { max: 1500 },
      renderingComponents: { max: 100 },
    },
  };

  const checker = new PerformanceBudgetChecker(budgets);

  await checker.checkBundleSizes('./dist');
  await checker.checkTimingBudgets('http://localhost:3000');

  const { passed, report } = checker.generateReport();

  console.log(report);

  if (!passed) {
    process.exit(1); // Fail the build
  }
}
```

## CI/CD Integration

### GitHub Actions Performance Budget

```yaml
# .github/workflows/performance-budget.yml
name: Performance Budget Check

on:
  pull_request:
    branches: [main]

jobs:
  performance-budget:
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

      - name: Start preview server
        run: npm run preview &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Run performance budget check
        run: npm run check:budgets

      - name: Upload bundle analysis
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: bundle-analysis
          path: bundle-report.html

      - name: Comment PR with results
        uses: actions/github-script@v6
        if: failure()
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('performance-report.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Performance Budget Failed\n\n${report}`
            });
```

### Lighthouse CI Integration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        // Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 250000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 50000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 500000 }],

        // Performance score
        'categories:performance': ['error', { minScore: 0.9 }],
      },
    },
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## Production Performance Monitoring

### Real User Monitoring (RUM) Setup

```typescript
// utils/performance-monitoring.ts
class PerformanceMonitor {
  private budgets: PerformanceBudget;
  private violations: Array<{ metric: string; value: number; budget: number; timestamp: Date }> =
    [];

  constructor(budgets: PerformanceBudget) {
    this.budgets = budgets;
    this.setupRUM();
  }

  private setupRUM(): void {
    // Monitor Core Web Vitals
    this.observeWebVitals();

    // Monitor bundle size violations in production
    this.monitorResourceSizes();

    // Track React-specific metrics
    this.monitorReactPerformance();
  }

  private observeWebVitals(): void {
    // First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.checkBudget('FCP', entry.startTime, this.budgets.timing.firstContentfulPaint.max);
        }
      });
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.checkBudget('LCP', entry.startTime, this.budgets.timing.largestContentfulPaint.max);
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsValue = 0;
      const entries = list.getEntries();

      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      this.checkBudget('CLS', clsValue, this.budgets.timing.cumulativeLayoutShift.max);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private monitorResourceSizes(): void {
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      let jsSize = 0;
      let cssSize = 0;
      let imageSize = 0;

      resources.forEach((resource) => {
        const size = resource.transferSize || 0;

        if (resource.name.includes('.js')) {
          jsSize += size;
        } else if (resource.name.includes('.css')) {
          cssSize += size;
        } else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
          imageSize += size;
        }
      });

      this.checkBudget('JavaScript Size', jsSize, this.budgets.resources.javascript.max);
      this.checkBudget('CSS Size', cssSize, this.budgets.resources.css.max);
      this.checkBudget('Image Size', imageSize, this.budgets.resources.images.max);
    });
  }

  private monitorReactPerformance(): void {
    // Monitor React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const devtools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

      devtools.onCommitFiberRoot = (id: any, root: any, priorityLevel: any) => {
        const commitTime = performance.now();

        // Track long commits that might block the UI
        if (commitTime > 16) {
          // > 1 frame at 60fps
          this.trackViolation('React Commit Time', commitTime, 16);
        }
      };
    }
  }

  private checkBudget(metric: string, value: number, budget: number): void {
    if (value > budget) {
      this.trackViolation(metric, value, budget);
    }
  }

  private trackViolation(metric: string, value: number, budget: number): void {
    const violation = {
      metric,
      value,
      budget,
      timestamp: new Date(),
    };

    this.violations.push(violation);

    // Send to analytics service
    this.reportViolation(violation);

    // Console warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Performance budget exceeded: ${metric}`, violation);
    }
  }

  private reportViolation(violation: any): void {
    // Send to your analytics service
    fetch('/api/performance-violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(violation),
    }).catch(() => {
      // Fail silently to avoid affecting user experience
    });
  }

  getViolations(): Array<any> {
    return [...this.violations];
  }
}

// Initialize monitoring
const performanceMonitor = new PerformanceMonitor({
  resources: {
    javascript: { max: 250_000 },
    css: { max: 50_000 },
    images: { max: 500_000 },
    fonts: { max: 100_000 },
  },
  timing: {
    firstContentfulPaint: { max: 1500 },
    largestContentfulPaint: { max: 2500 },
    timeToInteractive: { max: 3000 },
    cumulativeLayoutShift: { max: 0.1 },
  },
  quantity: {
    httpRequests: { max: 20 },
    domNodes: { max: 1500 },
    renderingComponents: { max: 100 },
  },
});
```

## Budget Alerting and Reporting

### Slack Integration for Budget Violations

```typescript
// utils/budget-alerts.ts
class BudgetAlertSystem {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendAlert(violation: any): Promise<void> {
    const message = {
      text: 'Performance Budget Violation',
      attachments: [
        {
          color: 'danger',
          fields: [
            {
              title: 'Metric',
              value: violation.metric,
              short: true,
            },
            {
              title: 'Current Value',
              value: this.formatValue(violation.value),
              short: true,
            },
            {
              title: 'Budget',
              value: this.formatValue(violation.budget),
              short: true,
            },
            {
              title: 'Overage',
              value: `${((violation.value / violation.budget - 1) * 100).toFixed(1)}%`,
              short: true,
            },
          ],
          footer: 'Performance Monitoring',
          ts: Math.floor(violation.timestamp.getTime() / 1000),
        },
      ],
    };

    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }

  private formatValue(value: number): string {
    if (value > 1000) {
      return `${(value / 1000).toFixed(1)}KB`;
    }
    return `${value.toFixed(0)}ms`;
  }
}
```

## Common Pitfalls and Best Practices

### Pitfall: Setting Unrealistic Budgets

```typescript
// ❌ Bad: Aspirational budgets that are impossible to meet
const unrealisticBudgets = {
  resources: {
    javascript: { max: 50_000 }, // 50KB total JS - unrealistic for most apps
  },
  timing: {
    largestContentfulPaint: { max: 500 }, // 500ms LCP - impossible on slow networks
  },
};

// ✅ Good: Evidence-based budgets with room for optimization
const realisticBudgets = {
  resources: {
    javascript: { max: 200_000 }, // 200KB - achievable with good practices
  },
  timing: {
    largestContentfulPaint: { max: 2500 }, // 2.5s LCP - reasonable for 3G
  },
};
```

### Pitfall: Ignoring Budget Violations

```typescript
// ❌ Bad: Disabling budget checks when they fail
// webpack.config.js
module.exports = {
  performance: {
    hints: false, // Gives up on performance tracking
  },
};

// ✅ Good: Treating budget violations as bugs
module.exports = {
  performance: {
    hints: 'error',
    assetFilter: function (assetFilename) {
      // Only check production assets
      return !assetFilename.includes('.map');
    },
  },
};
```

## Next Steps

Performance budgets are most effective when they're:

1. **Measurable** - Based on real metrics, not gut feelings
2. **Enforceable** - Integrated into your CI/CD pipeline
3. **Realistic** - Challenging but achievable targets
4. **Actionable** - When violated, you know exactly what to fix

Start with loose budgets based on your current performance, then gradually tighten them as you optimize. Most importantly, treat budget violations like any other bug—investigate, fix, and prevent regression.

The goal isn't to have the strictest budgets in the world, but to maintain consistent, measurable performance that keeps your users happy and engaged.
