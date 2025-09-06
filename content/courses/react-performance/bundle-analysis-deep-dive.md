---
title: Bundle Analysis Deep Dive
description: Master webpack-bundle-analyzer, source maps, and dependency auditing to eliminate bloat and optimize your React bundle.
date: 2025-09-06T23:30:00.000Z
modified: 2025-09-06T23:30:00.000Z
published: true
tags: ['react', 'performance', 'bundling', 'analysis']
---

Your React bundle is a black box until you crack it open. That 2MB JavaScript file could contain duplicate dependencies, unused code, or a single poorly chosen library that's 10x larger than alternatives. Bundle analysis transforms guesswork into data-driven optimization—showing you exactly what's shipped, why it's there, and where you can cut the fat without breaking functionality.

The difference between a fast React app and a slow one often comes down to what's in the bundle. Every kilobyte counts, especially on mobile networks where 200KB might take 3 seconds to download. Master bundle analysis, and you'll catch performance regressions before users do, identify optimization opportunities your gut would never find, and make informed decisions about every dependency you add.

## Understanding Your Bundle Structure

Modern React applications typically generate multiple bundle files through code splitting:

```javascript
// Typical webpack output structure
dist/
├── main.[hash].js          // App entry point + dependencies
├── vendor.[hash].js        // Third-party libraries (React, etc.)
├── runtime.[hash].js       // Webpack module loading logic
├── components.[hash].js    // Lazy-loaded component chunks
└── pages.[hash].js         // Route-based chunks

// Bundle composition example
const bundleBreakdown = {
  main: {
    size: '250KB',
    contains: ['App component', 'Router setup', 'Core utilities'],
  },
  vendor: {
    size: '180KB',
    contains: ['React', 'React-DOM', 'Core libraries'],
  },
  components: {
    size: '120KB',
    contains: ['UI components', 'Form libraries', 'Charts'],
  },
};
```

Each bundle serves a different caching strategy—vendor bundles change rarely, main bundles change with app updates, and component bundles change when features are modified.

## Webpack Bundle Analyzer: Your X-Ray Vision

The webpack-bundle-analyzer is the gold standard for visualizing bundle contents:

### Setup and Configuration

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  // ... other config
  plugins: [
    // Conditional analyzer - only run when needed
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'server',
      openAnalyzer: true,
      analyzerPort: 8888,
    }),

    // Generate static report for CI
    process.env.CI && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: '../reports/bundle-report.html',
    }),
  ].filter(Boolean),

  // Enhanced stats for better analysis
  stats: {
    assets: true,
    chunks: true,
    modules: true,
    reasons: true, // Shows why modules are included
    usedExports: true, // Shows which exports are used
    providedExports: true,
  },
};

// package.json scripts
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "analyze:ci": "CI=true npm run build && open reports/bundle-report.html"
  }
}
```

### Reading the Analyzer Output

The bundle analyzer shows three key metrics for each module:

```typescript
interface ModuleAnalysis {
  // Raw size from webpack stats
  statSize: number;

  // Size after minification but before compression
  parsedSize: number;

  // Size after gzip compression (closest to network transfer)
  gzipSize: number;
}

// Example analysis findings
const analysisFindings = {
  // Large modules that might need optimization
  suspects: [
    {
      name: 'lodash',
      parsedSize: '70KB',
      issue: 'Importing entire library for 3 functions',
      solution: 'Use lodash-es or individual imports',
    },
    {
      name: 'moment.js + locales',
      parsedSize: '280KB',
      issue: 'All locales included by default',
      solution: 'Use date-fns or exclude unused locales',
    },
    {
      name: 'react-icons (all icons)',
      parsedSize: '150KB',
      issue: 'Bundling all icons when using only 5',
      solution: 'Use individual icon imports',
    },
  ],

  // Unexpected duplicates
  duplicates: [
    {
      name: 'React',
      instances: 2,
      totalSize: '180KB',
      cause: 'Different versions in dependency tree',
      solution: 'Use webpack resolve.alias or peerDependencies',
    },
  ],
};
```

### Advanced Analysis Techniques

```javascript
// Custom webpack plugin to analyze bundle composition
class BundleCompositionAnalyzer {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('BundleCompositionAnalyzer', (compilation, callback) => {
      const stats = compilation.getStats().toJson();

      // Analyze chunk relationships
      const chunkAnalysis = stats.chunks.map((chunk) => ({
        name: chunk.names[0],
        size: chunk.size,
        modules: chunk.modules?.length || 0,
        parents: chunk.parents,
        children: chunk.children,
        // Calculate module overlap between chunks
        sharedModules: this.findSharedModules(chunk, stats.chunks),
      }));

      // Find optimization opportunities
      const optimizationOpportunities = this.findOptimizations(chunkAnalysis);

      // Generate detailed report
      const report = this.generateReport(chunkAnalysis, optimizationOpportunities);

      // Write to file
      compilation.assets['bundle-composition.json'] = {
        source: () => JSON.stringify(report, null, 2),
        size: () => JSON.stringify(report).length,
      };

      callback();
    });
  }

  findSharedModules(targetChunk, allChunks) {
    const targetModules = new Set(targetChunk.modules?.map((m) => m.name) || []);

    return allChunks
      .filter((chunk) => chunk.names[0] !== targetChunk.names[0])
      .map((chunk) => ({
        chunkName: chunk.names[0],
        sharedCount: chunk.modules?.filter((m) => targetModules.has(m.name)).length || 0,
      }))
      .filter((result) => result.sharedCount > 0);
  }

  findOptimizations(chunkAnalysis) {
    const opportunities = [];

    // Find chunks that could be merged
    chunkAnalysis.forEach((chunk) => {
      if (chunk.size < 20000) {
        // Less than 20KB
        opportunities.push({
          type: 'merge',
          target: chunk.name,
          reason: 'Small chunk could be merged to reduce HTTP requests',
          recommendation: `Consider merging ${chunk.name} with parent chunk`,
        });
      }

      // Find excessive module overlap
      chunk.sharedModules.forEach((shared) => {
        if (shared.sharedCount > 10) {
          opportunities.push({
            type: 'extract-common',
            target: `${chunk.name} & ${shared.chunkName}`,
            reason: `${shared.sharedCount} shared modules`,
            recommendation: 'Extract shared modules into common chunk',
          });
        }
      });
    });

    return opportunities;
  }
}
```

## Source Map Analysis

Source maps reveal the true composition of your minified bundles:

```javascript
// Analyze source maps to find unused code
const fs = require('fs');
const sourceMap = require('source-map');

class SourceMapAnalyzer {
  async analyzeBundle(bundlePath, mapPath) {
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    const mapContent = fs.readFileSync(mapPath, 'utf8');

    const consumer = await new sourceMap.SourceMapConsumer(mapContent);

    const analysis = {
      totalSize: bundleContent.length,
      sourceFiles: [],
      unusedSources: [],
      largeSources: [],
    };

    // Analyze each source file contribution
    consumer.sources.forEach((source) => {
      const sourceContent = consumer.sourceContentFor(source);
      if (!sourceContent) return;

      const sizeInBundle = this.calculateSourceSizeInBundle(source, consumer);

      const sourceInfo = {
        path: source,
        originalSize: sourceContent.length,
        bundleSize: sizeInBundle,
        ratio: sizeInBundle / sourceContent.length,
      };

      analysis.sourceFiles.push(sourceInfo);

      // Flag potential issues
      if (sizeInBundle === 0) {
        analysis.unusedSources.push(source);
      }

      if (sizeInBundle > 50000) {
        // > 50KB
        analysis.largeSources.push(sourceInfo);
      }
    });

    return analysis;
  }

  calculateSourceSizeInBundle(sourcePath, consumer) {
    let bundleSize = 0;

    // This is simplified - real implementation would need to
    // traverse all mappings and calculate actual bundle contribution
    consumer.eachMapping((mapping) => {
      if (mapping.source === sourcePath) {
        bundleSize += 1; // Rough approximation
      }
    });

    return bundleSize;
  }
}

// Usage in build process
async function analyzeSourceMaps() {
  const analyzer = new SourceMapAnalyzer();

  const analysis = await analyzer.analyzeBundle('dist/main.js', 'dist/main.js.map');

  console.log('Large sources (>50KB):');
  analysis.largeSources.forEach((source) => {
    console.log(`${source.path}: ${(source.bundleSize / 1024).toFixed(1)}KB`);
  });

  if (analysis.unusedSources.length > 0) {
    console.log('Potentially unused sources:');
    analysis.unusedSources.forEach((source) => console.log(`- ${source}`));
  }
}
```

## Dependency Auditing

### Automated Dependency Analysis

```javascript
// package.json analyzer
const fs = require('fs');
const path = require('path');

class DependencyAnalyzer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  }

  async analyzeDependencies() {
    const dependencies = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    const analysis = {
      total: Object.keys(dependencies).length,
      bundleImpact: {},
      alternatives: {},
      unused: [],
    };

    // Analyze each dependency
    for (const [name, version] of Object.entries(dependencies)) {
      const depAnalysis = await this.analyzeDependency(name);

      analysis.bundleImpact[name] = depAnalysis.bundleSize;

      if (depAnalysis.alternatives.length > 0) {
        analysis.alternatives[name] = depAnalysis.alternatives;
      }

      if (!depAnalysis.isUsed) {
        analysis.unused.push(name);
      }
    }

    return analysis;
  }

  async analyzeDependency(name) {
    try {
      // Get package info
      const packagePath = path.join(this.projectRoot, 'node_modules', name, 'package.json');
      const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check if dependency is actually imported
      const isUsed = await this.checkUsage(name);

      // Estimate bundle size impact
      const bundleSize = await this.estimateBundleSize(name, packageInfo);

      // Find alternatives
      const alternatives = await this.findAlternatives(name, bundleSize);

      return {
        version: packageInfo.version,
        bundleSize,
        isUsed,
        alternatives,
      };
    } catch (error) {
      return {
        version: 'unknown',
        bundleSize: 0,
        isUsed: false,
        alternatives: [],
        error: error.message,
      };
    }
  }

  async checkUsage(dependencyName) {
    const { execSync } = require('child_process');

    try {
      // Search for imports in source files
      const grepResult = execSync(
        `grep -r "import.*${dependencyName}" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"`,
        { encoding: 'utf8', cwd: this.projectRoot },
      );

      return grepResult.length > 0;
    } catch (error) {
      // No matches found
      return false;
    }
  }

  async estimateBundleSize(name, packageInfo) {
    try {
      const mainFile = packageInfo.main || 'index.js';
      const mainPath = path.join(this.projectRoot, 'node_modules', name, mainFile);

      if (fs.existsSync(mainPath)) {
        const stats = fs.statSync(mainPath);
        return stats.size;
      }

      // Fallback: estimate from package directory size
      const packageDir = path.join(this.projectRoot, 'node_modules', name);
      return this.getDirectorySize(packageDir);
    } catch (error) {
      return 0;
    }
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;

    try {
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory() && file !== 'node_modules') {
          totalSize += this.getDirectorySize(filePath);
        }
      });
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return totalSize;
  }

  async findAlternatives(name, currentSize) {
    // Database of known alternatives with size comparisons
    const alternatives = {
      moment: [
        { name: 'date-fns', sizeReduction: 0.7, note: '70% smaller, tree-shakable' },
        { name: 'dayjs', sizeReduction: 0.9, note: '90% smaller, similar API' },
      ],
      lodash: [
        { name: 'lodash-es', sizeReduction: 0.0, note: 'Tree-shakable version' },
        { name: 'ramda', sizeReduction: 0.2, note: 'Functional alternative' },
      ],
      axios: [
        { name: 'fetch (native)', sizeReduction: 1.0, note: 'No bundle impact' },
        { name: 'ky', sizeReduction: 0.8, note: '80% smaller' },
      ],
      'react-router': [
        { name: '@reach/router', sizeReduction: 0.3, note: 'Smaller, now merged back' },
        { name: 'wouter', sizeReduction: 0.9, note: '90% smaller for simple routing' },
      ],
    };

    return alternatives[name] || [];
  }
}

// Generate dependency report
async function generateDependencyReport() {
  const analyzer = new DependencyAnalyzer(process.cwd());
  const analysis = await analyzer.analyzeDependencies();

  console.log('📦 Dependency Analysis Report\n');

  console.log(`Total dependencies: ${analysis.total}`);

  if (analysis.unused.length > 0) {
    console.log('\n🚫 Unused dependencies:');
    analysis.unused.forEach((dep) => console.log(`- ${dep}`));
  }

  console.log('\n📊 Bundle impact (largest first):');
  Object.entries(analysis.bundleImpact)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([name, size]) => {
      console.log(`- ${name}: ${(size / 1024).toFixed(1)}KB`);
    });

  console.log('\n🔄 Alternatives available:');
  Object.entries(analysis.alternatives).forEach(([name, alternatives]) => {
    console.log(`\n${name}:`);
    alternatives.forEach((alt) => {
      console.log(`  → ${alt.name}: ${alt.note}`);
    });
  });
}
```

## Bundle Optimization Strategies

### Tree Shaking Enhancement

```javascript
// Webpack config optimized for tree shaking
module.exports = {
  mode: 'production',

  // Ensure modules are not transformed to CommonJS
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false, // Allow imports without file extensions
        },
      },
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                modules: false, // Keep ES6 modules for tree shaking
              }],
              '@babel/preset-react',
            ],
          },
        },
      },
    ],
  },

  // Mark side-effect-free files
  optimization: {
    usedExports: true,
    sideEffects: false, // Or array of files with side effects

    // Advanced tree shaking
    innerGraph: true,
    providedExports: true,

    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Separate vendor bundle for better caching
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },

        // Common utilities
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },

  // Help webpack understand which modules are safe to tree shake
  resolve: {
    mainFields: ['module', 'browser', 'main'],
  },
};

// Mark side-effect-free modules in package.json
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js",
    "./src/setupTests.js"
  ]
}
```

### Code Splitting Optimization

```typescript
// React component with optimized code splitting
import { lazy, Suspense, ComponentType } from 'react';

// Lazy loading with error boundaries
function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        return window.location.reload();
      }
      throw error;
    }
  });
}

// Preload components based on user behavior
function usePreloadRoute(routePath: string) {
  const preloadRoute = useCallback(() => {
    const routeComponent = routeMap[routePath];
    if (routeComponent) {
      // Preload the component
      routeComponent();
    }
  }, [routePath]);

  // Preload on hover with delay
  const handleMouseEnter = useCallback(() => {
    setTimeout(preloadRoute, 100);
  }, [preloadRoute]);

  return { preloadRoute, handleMouseEnter };
}

// Route map for preloading
const routeMap: Record<string, () => Promise<any>> = {
  '/dashboard': () => import('./pages/Dashboard'),
  '/profile': () => import('./pages/Profile'),
  '/settings': () => import('./pages/Settings'),
};

// Smart navigation with preloading
function NavigationLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { handleMouseEnter } = usePreloadRoute(to);

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}
```

## Performance Testing Integration

```javascript
// Bundle size regression testing
const fs = require('fs');
const path = require('path');

class BundleRegressionTest {
  constructor(distPath, thresholds) {
    this.distPath = distPath;
    this.thresholds = thresholds;
  }

  async runTests() {
    const currentSizes = await this.getCurrentBundleSizes();
    const previousSizes = this.getPreviousBundleSizes();

    const results = {
      passed: true,
      tests: [],
      summary: {},
    };

    // Test against absolute thresholds
    for (const [bundle, size] of Object.entries(currentSizes)) {
      const threshold = this.thresholds[bundle];
      const passed = !threshold || size <= threshold;

      results.tests.push({
        name: `${bundle} size limit`,
        passed,
        current: size,
        threshold,
        message: passed
          ? `✅ ${bundle}: ${this.formatSize(size)}`
          : `❌ ${bundle}: ${this.formatSize(size)} > ${this.formatSize(threshold)}`,
      });

      if (!passed) results.passed = false;
    }

    // Test against regression thresholds
    if (previousSizes) {
      for (const [bundle, currentSize] of Object.entries(currentSizes)) {
        const previousSize = previousSizes[bundle];
        if (!previousSize) continue;

        const increase = currentSize - previousSize;
        const percentIncrease = (increase / previousSize) * 100;
        const regressionThreshold = 0.05; // 5% increase allowed

        const passed = percentIncrease <= regressionThreshold * 100;

        results.tests.push({
          name: `${bundle} regression check`,
          passed,
          current: currentSize,
          previous: previousSize,
          increase,
          percentIncrease,
          message: passed
            ? `✅ ${bundle}: ${percentIncrease.toFixed(1)}% change`
            : `❌ ${bundle}: +${percentIncrease.toFixed(1)}% (${this.formatSize(increase)})`,
        });

        if (!passed) results.passed = false;
      }
    }

    // Save current sizes for next comparison
    this.saveBundleSizes(currentSizes);

    return results;
  }

  async getCurrentBundleSizes() {
    const sizes = {};

    const files = fs.readdirSync(this.distPath);

    files.forEach((file) => {
      if (file.endsWith('.js') && !file.endsWith('.map')) {
        const filePath = path.join(this.distPath, file);
        const stats = fs.statSync(filePath);

        // Extract bundle name (remove hash)
        const bundleName = file.replace(/\.[a-f0-9]{8,}\.js$/, '.js');
        sizes[bundleName] = stats.size;
      }
    });

    return sizes;
  }

  getPreviousBundleSizes() {
    try {
      return JSON.parse(fs.readFileSync('.bundle-sizes.json', 'utf8'));
    } catch (error) {
      return null;
    }
  }

  saveBundleSizes(sizes) {
    fs.writeFileSync('.bundle-sizes.json', JSON.stringify(sizes, null, 2));
  }

  formatSize(bytes) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
}

// CI integration
async function runBundleTests() {
  const tester = new BundleRegressionTest('dist', {
    'main.js': 300 * 1024, // 300KB max
    'vendor.js': 200 * 1024, // 200KB max
    'components.js': 150 * 1024, // 150KB max
  });

  const results = await tester.runTests();

  console.log('Bundle Size Test Results:\n');
  results.tests.forEach((test) => console.log(test.message));

  if (!results.passed) {
    console.log('\n❌ Bundle size tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All bundle size tests passed!');
  }
}
```

## Continuous Monitoring

```typescript
// Bundle monitoring dashboard data
interface BundleMetrics {
  timestamp: Date;
  branch: string;
  commit: string;
  bundles: Record<
    string,
    {
      size: number;
      gzipSize: number;
      modules: number;
      chunks: number;
    }
  >;
  performance: {
    buildTime: number;
    firstLoad: number;
    treeShakingEfficiency: number;
  };
}

class BundleMetricsCollector {
  async collectMetrics(buildPath: string): Promise<BundleMetrics> {
    const stats = this.getWebpackStats(buildPath);
    const bundles = this.analyzeBundles(stats);

    return {
      timestamp: new Date(),
      branch: process.env.GITHUB_REF_NAME || 'local',
      commit: process.env.GITHUB_SHA || 'local',
      bundles,
      performance: {
        buildTime: stats.time,
        firstLoad: this.calculateFirstLoad(bundles),
        treeShakingEfficiency: this.calculateTreeShakingEfficiency(stats),
      },
    };
  }

  async sendMetrics(metrics: BundleMetrics) {
    // Send to monitoring service
    await fetch('https://your-monitoring-service.com/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    });
  }

  calculateFirstLoad(bundles: any) {
    // Calculate size of bundles loaded on first page view
    const criticalBundles = ['main.js', 'vendor.js', 'runtime.js'];
    return criticalBundles.reduce((total, name) => {
      const bundle = bundles[name];
      return total + (bundle ? bundle.gzipSize : 0);
    }, 0);
  }

  calculateTreeShakingEfficiency(stats: any) {
    // Measure how much code was eliminated
    const totalImported = stats.modules.reduce((total: number, module: any) => {
      return total + (module.size || 0);
    }, 0);

    const totalBundled = stats.assets.reduce((total: number, asset: any) => {
      return total + (asset.size || 0);
    }, 0);

    return 1 - totalBundled / totalImported;
  }
}
```

## Next Steps

Bundle analysis is most effective when it's:

1. **Automated** - Integrated into your CI/CD pipeline
2. **Regular** - Run on every build, not just when performance issues arise
3. **Actionable** - Connected to clear optimization strategies
4. **Monitored** - Tracked over time to catch regressions

Start by running webpack-bundle-analyzer on your current build to identify the biggest wins. Focus on the largest modules first—a 50KB reduction in your biggest dependency often has more impact than optimizing 10 smaller modules.

Remember: bundle size directly correlates with user experience, especially on mobile networks. Every kilobyte you eliminate is a millisecond saved in your users' loading experience.
