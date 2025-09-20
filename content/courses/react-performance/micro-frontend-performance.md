---
title: Micro-Frontend Performance
description: >-
  Build performant micro-frontend architectures with React. Master Module
  Federation, shared dependencies, runtime optimization, and cross-team
  coordination.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - performance
  - micro-frontends
  - module-federation
  - architecture
---

Micro-frontends promise team autonomy and independent deployments, but implement them carelessly and you'll create a performance nightmare. Multiple React versions loading simultaneously, duplicate vendor bundles, runtime coordination overhead, and cascading failures across teams—the very architecture meant to solve organizational problems can create technical ones that tank your application's performance.

But get micro-frontends right, and you unlock both organizational scale and technical performance. Teams can optimize their slices independently, shared dependencies reduce overall bundle size, and lazy loading becomes natural. The key is understanding the performance implications of different micro-frontend patterns and implementing the right optimizations from day one. This guide shows you how to build micro-frontends that are both independent and performant.

## Understanding Micro-Frontend Performance Challenges

The unique performance characteristics of micro-frontends:

```tsx
// Micro-frontend performance model
interface MicroFrontendPerformance {
  // Performance challenges
  challenges: {
    bundleSize: 'Multiple framework instances and duplicated code';
    initialization: 'Sequential or parallel loading of micro-apps';
    runtime: 'Cross-boundary communication overhead';
    caching: 'Cache invalidation across independent deployments';
    coordination: 'State synchronization between micro-apps';
  };

  // Performance opportunities
  opportunities: {
    isolation: 'Failures contained to single micro-app';
    caching: 'Independent cache strategies per micro-app';
    optimization: 'Teams can optimize independently';
    lazyLoading: 'Load micro-apps on demand';
  };

  // Key metrics
  metrics: {
    totalBundleSize: number; // Combined size of all micro-apps
    sharedDependencyRatio: number; // % of code that's shared
    initializationTime: number; // Time to first interactive micro-app
    communicationLatency: number; // Cross-boundary message time
  };
}

// Architecture patterns and their performance impact
const architecturePatterns = {
  buildTime: {
    performance: 'Best - single optimized bundle',
    flexibility: 'Worst - requires coordinated deploys',
    useCase: 'Small teams, infrequent updates',
  },
  runtime: {
    performance: 'Good - with proper optimization',
    flexibility: 'Best - independent deployments',
    useCase: 'Large teams, frequent updates',
  },
  hybrid: {
    performance: 'Very Good - shared vendor, independent apps',
    flexibility: 'Good - some coordination needed',
    useCase: 'Medium teams, balanced needs',
  },
};
```

## Module Federation Setup

Webpack Module Federation for runtime integration:

```javascript
// webpack.config.js - Host application
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');
const deps = require('./package.json').dependencies;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      filename: 'remoteEntry.js',
      remotes: {
        header: 'header@http://localhost:3001/remoteEntry.js',
        products: 'products@http://localhost:3002/remoteEntry.js',
        checkout: 'checkout@http://localhost:3003/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: deps.react,
          eager: true,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom'],
          eager: true,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: deps['react-router-dom'],
        },
      },
    }),
  ],
};

// webpack.config.js - Remote application
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'products',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductList': './src/components/ProductList',
        './ProductDetail': './src/components/ProductDetail',
        './ProductStore': './src/store/productStore',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom'],
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: deps['@tanstack/react-query'],
        },
      },
    }),
  ],
};
```

## Dynamic Remote Loading

Load micro-frontends dynamically for better performance:

```tsx
// Dynamic module federation loader
interface RemoteConfig {
  url: string;
  scope: string;
  module: string;
}

class ModuleFederationLoader {
  private loadedRemotes: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  async loadRemote(config: RemoteConfig): Promise<any> {
    const key = `${config.scope}/${config.module}`;

    // Return cached module
    if (this.loadedRemotes.has(key)) {
      return this.loadedRemotes.get(key);
    }

    // Return in-progress loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    // Start loading
    const loadingPromise = this.loadRemoteModule(config);
    this.loadingPromises.set(key, loadingPromise);

    try {
      const module = await loadingPromise;
      this.loadedRemotes.set(key, module);
      this.loadingPromises.delete(key);
      return module;
    } catch (error) {
      this.loadingPromises.delete(key);
      throw error;
    }
  }

  private async loadRemoteModule(config: RemoteConfig): Promise<any> {
    // Load the remote entry
    await this.loadScript(config.url);

    // Initialize the container
    await this.initContainer(config.scope);

    // Get the module
    const container = window[config.scope];
    const factory = await container.get(config.module);
    return factory();
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${url}"]`);

      if (existingScript) {
        if (existingScript.getAttribute('data-loaded') === 'true') {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', reject);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.addEventListener('load', () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      });

      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`Failed to load script: ${url}`));
      });

      document.head.appendChild(script);
    });
  }

  private async initContainer(scope: string): Promise<void> {
    if (!window[scope]) {
      throw new Error(`Container ${scope} not found`);
    }

    if (!window[scope].__initialized) {
      await window[scope].init(__webpack_share_scopes__.default);
      window[scope].__initialized = true;
    }
  }
}

// React component for dynamic remotes
function DynamicRemote({
  config,
  fallback = <div>Loading...</div>,
  errorFallback = <div>Failed to load</div>,
}: {
  config: RemoteConfig;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const loader = useRef(new ModuleFederationLoader());

  useEffect(() => {
    loader.current
      .loadRemote(config)
      .then((module) => setComponent(() => module.default || module))
      .catch(setError);
  }, [config]);

  if (error) return <>{errorFallback}</>;
  if (!Component) return <>{fallback}</>;

  return <Component />;
}
```

## Shared Dependencies Optimization

Optimize shared dependencies across micro-frontends:

```tsx
// Shared dependency manager
class SharedDependencyManager {
  private versions: Map<string, string[]> = new Map();
  private loaded: Map<string, boolean> = new Map();

  registerDependency(name: string, version: string) {
    if (!this.versions.has(name)) {
      this.versions.set(name, []);
    }

    const versions = this.versions.get(name)!;
    if (!versions.includes(version)) {
      versions.push(version);

      // Warn about version conflicts
      if (versions.length > 1) {
        console.warn(`Multiple versions of ${name} detected:`, versions.join(', '));
      }
    }
  }

  async loadSharedDependency(name: string, fallbackUrl?: string): Promise<any> {
    if (this.loaded.has(name)) {
      return window.__shared__[name];
    }

    // Check if already available
    if (window.__shared__?.[name]) {
      this.loaded.set(name, true);
      return window.__shared__[name];
    }

    // Load from CDN or fallback
    if (fallbackUrl) {
      await this.loadFromCDN(name, fallbackUrl);
      this.loaded.set(name, true);
      return window.__shared__[name];
    }

    throw new Error(`Shared dependency ${name} not found`);
  }

  private async loadFromCDN(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      script.onload = () => {
        if (!window.__shared__) {
          window.__shared__ = {};
        }

        // Map common CDN globals to shared namespace
        switch (name) {
          case 'react':
            window.__shared__.react = window.React;
            break;
          case 'react-dom':
            window.__shared__['react-dom'] = window.ReactDOM;
            break;
          // Add more mappings
        }

        resolve();
      };

      script.onerror = () => reject(new Error(`Failed to load ${name} from ${url}`));

      document.head.appendChild(script);
    });
  }

  getVersionReport(): VersionReport {
    const report: VersionReport = {
      conflicts: [],
      unique: [],
      total: 0,
    };

    this.versions.forEach((versions, name) => {
      if (versions.length > 1) {
        report.conflicts.push({ name, versions });
      } else {
        report.unique.push({ name, version: versions[0] });
      }
      report.total++;
    });

    return report;
  }
}

// Webpack configuration for optimal sharing
const sharedDependencies = {
  react: {
    singleton: true,
    strictVersion: false,
    requiredVersion: '^18.0.0',
    eager: true, // Load immediately for host
  },
  'react-dom': {
    singleton: true,
    strictVersion: false,
    requiredVersion: '^18.0.0',
    eager: true,
  },
  // Share large libraries
  lodash: {
    singleton: true,
    strictVersion: false,
    requiredVersion: '^4.17.0',
  },
  moment: {
    singleton: true,
    strictVersion: false,
    requiredVersion: '^2.29.0',
  },
  // Share UI libraries
  '@mui/material': {
    singleton: true,
    strictVersion: false,
    requiredVersion: '^5.0.0',
  },
};
```

## Cross-Micro-Frontend Communication

Efficient communication between micro-frontends:

```tsx
// Event bus for micro-frontend communication
class MicroFrontendEventBus {
  private events: Map<string, Set<EventHandler>> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private isReady = false;

  emit(event: string, data?: any) {
    // Queue messages if not ready
    if (!this.isReady) {
      this.messageQueue.push({ event, data, timestamp: Date.now() });
      return;
    }

    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // Also emit as custom event for cross-boundary communication
    window.dispatchEvent(new CustomEvent(`mfe:${event}`, { detail: data }));
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.events.delete(event);
        }
      }
    };
  }

  ready() {
    this.isReady = true;

    // Process queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.emit(message.event, message.data);
    }
  }
}

// Shared state management across micro-frontends
class MicroFrontendStateManager {
  private state: Map<string, any> = new Map();
  private subscribers: Map<string, Set<StateSubscriber>> = new Map();

  setState(namespace: string, key: string, value: any) {
    const fullKey = `${namespace}:${key}`;
    const oldValue = this.state.get(fullKey);

    if (oldValue !== value) {
      this.state.set(fullKey, value);
      this.notifySubscribers(fullKey, value, oldValue);
    }
  }

  getState(namespace: string, key: string): any {
    return this.state.get(`${namespace}:${key}`);
  }

  subscribe(namespace: string, key: string, callback: StateSubscriber): () => void {
    const fullKey = `${namespace}:${key}`;

    if (!this.subscribers.has(fullKey)) {
      this.subscribers.set(fullKey, new Set());
    }

    this.subscribers.get(fullKey)!.add(callback);

    // Return unsubscribe
    return () => {
      const subs = this.subscribers.get(fullKey);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(fullKey);
        }
      }
    };
  }

  private notifySubscribers(key: string, value: any, oldValue: any) {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((callback) => {
        try {
          callback(value, oldValue);
        } catch (error) {
          console.error(`Error in state subscriber for ${key}:`, error);
        }
      });
    }
  }
}

// React hooks for micro-frontend communication
export function useMicroFrontendEvent(event: string, handler: (data: any) => void) {
  useEffect(() => {
    const eventBus = window.__mfeEventBus || new MicroFrontendEventBus();
    return eventBus.on(event, handler);
  }, [event, handler]);
}

export function useMicroFrontendState<T>(
  namespace: string,
  key: string,
  initialValue: T,
): [T, (value: T) => void] {
  const stateManager = useRef(window.__mfeStateManager || new MicroFrontendStateManager());

  const [value, setValue] = useState<T>(() => {
    const existing = stateManager.current.getState(namespace, key);
    return existing !== undefined ? existing : initialValue;
  });

  useEffect(() => {
    return stateManager.current.subscribe(namespace, key, (newValue) => {
      setValue(newValue);
    });
  }, [namespace, key]);

  const updateValue = useCallback(
    (newValue: T) => {
      stateManager.current.setState(namespace, key, newValue);
    },
    [namespace, key],
  );

  return [value, updateValue];
}
```

## Performance Monitoring

Monitor micro-frontend performance:

```tsx
// Micro-frontend performance tracker
class MicroFrontendPerformanceTracker {
  private metrics: Map<string, MicroFrontendMetrics> = new Map();

  trackMicroFrontendLoad(name: string, startTime: number) {
    const loadTime = performance.now() - startTime;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        loadTime: [],
        renderTime: [],
        errorCount: 0,
        bundleSize: 0,
      });
    }

    this.metrics.get(name)!.loadTime.push(loadTime);

    // Report to analytics
    this.reportMetric('mfe_load', {
      name,
      loadTime,
    });
  }

  trackMicroFrontendRender(name: string, renderTime: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        loadTime: [],
        renderTime: [],
        errorCount: 0,
        bundleSize: 0,
      });
    }

    this.metrics.get(name)!.renderTime.push(renderTime);

    // Report to analytics
    this.reportMetric('mfe_render', {
      name,
      renderTime,
    });
  }

  trackMicroFrontendError(name: string, error: Error) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        loadTime: [],
        renderTime: [],
        errorCount: 0,
        bundleSize: 0,
      });
    }

    this.metrics.get(name)!.errorCount++;

    // Report to error tracking
    this.reportError('mfe_error', {
      name,
      error: error.message,
      stack: error.stack,
    });
  }

  getPerformanceReport(): MicroFrontendPerformanceReport {
    const report: MicroFrontendPerformanceReport = {
      microFrontends: [],
      totalLoadTime: 0,
      totalBundleSize: 0,
      errorRate: 0,
    };

    this.metrics.forEach((metrics) => {
      const avgLoadTime =
        metrics.loadTime.length > 0
          ? metrics.loadTime.reduce((a, b) => a + b, 0) / metrics.loadTime.length
          : 0;

      const avgRenderTime =
        metrics.renderTime.length > 0
          ? metrics.renderTime.reduce((a, b) => a + b, 0) / metrics.renderTime.length
          : 0;

      report.microFrontends.push({
        name: metrics.name,
        avgLoadTime,
        avgRenderTime,
        errorCount: metrics.errorCount,
        bundleSize: metrics.bundleSize,
      });

      report.totalLoadTime += avgLoadTime;
      report.totalBundleSize += metrics.bundleSize;
    });

    const totalRequests = Array.from(this.metrics.values()).reduce(
      (sum, m) => sum + m.loadTime.length,
      0,
    );

    const totalErrors = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.errorCount, 0);

    report.errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return report;
  }

  private reportMetric(event: string, data: any) {
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', event, data);
    }
  }

  private reportError(event: string, data: any) {
    // Send to error tracking
    if (window.Sentry) {
      window.Sentry.captureException(new Error(data.error), {
        tags: {
          microFrontend: data.name,
        },
        extra: data,
      });
    }
  }
}

// React component for tracking
function MicroFrontendTracker({ name, children }: { name: string; children: React.ReactNode }) {
  const tracker = useRef(new MicroFrontendPerformanceTracker());
  const startTime = useRef(performance.now());

  useEffect(() => {
    tracker.current.trackMicroFrontendLoad(name, startTime.current);

    // Track render time
    const renderTime = performance.now() - startTime.current;
    tracker.current.trackMicroFrontendRender(name, renderTime);
  }, [name]);

  return (
    <ErrorBoundary onError={(error) => tracker.current.trackMicroFrontendError(name, error)}>
      {children}
    </ErrorBoundary>
  );
}
```

## Build-Time Optimization

Optimize micro-frontends at build time:

```javascript
// webpack.config.js - Optimization configuration
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        shared: {
          test: /[\\/]src[\\/]shared[\\/]/,
          name: 'shared',
          priority: 15,
          reuseExistingChunk: true,
        },
      },
    },
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
    ],
  },

  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
  ],
};

// Bundle analysis script
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

if (process.env.ANALYZE) {
  config.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: `bundle-report-${process.env.MFE_NAME}.html`,
    }),
  );
}
```

## Deployment Strategies

Deploy micro-frontends for optimal performance:

```typescript
// Deployment orchestrator
class MicroFrontendDeploymentOrchestrator {
  async deployMicroFrontend(
    name: string,
    version: string,
    config: DeploymentConfig,
  ): Promise<DeploymentResult> {
    // 1. Build and optimize
    const buildResult = await this.build(name, version);

    // 2. Upload to CDN
    const cdnUrls = await this.uploadToCDN(buildResult.files, config.cdn);

    // 3. Update manifest
    await this.updateManifest(name, version, cdnUrls);

    // 4. Warm up cache
    await this.warmUpCache(cdnUrls);

    // 5. Health check
    const health = await this.healthCheck(name, version);

    // 6. Update routing
    if (health.status === 'healthy') {
      await this.updateRouting(name, version, config.canary);
    }

    return {
      name,
      version,
      cdnUrls,
      health,
      timestamp: Date.now(),
    };
  }

  private async warmUpCache(urls: string[]): Promise<void> {
    // Pre-fetch from multiple regions
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];

    await Promise.all(
      regions.flatMap((region) => urls.map((url) => this.fetchFromRegion(url, region))),
    );
  }

  private async updateManifest(name: string, version: string, urls: string[]): Promise<void> {
    const manifest = {
      name,
      version,
      urls,
      timestamp: Date.now(),
      integrity: await this.calculateIntegrity(urls),
    };

    // Update central manifest
    await fetch('/api/manifest', {
      method: 'PUT',
      body: JSON.stringify(manifest),
    });
  }
}
```

## Best Practices Checklist

```typescript
interface MicroFrontendBestPractices {
  // Architecture
  architecture: {
    clearBoundaries: 'Define clear micro-frontend boundaries';
    sharedNothing: 'Minimize shared state between micro-frontends';
    versionStrategy: 'Have clear versioning and compatibility strategy';
    fallbackStrategy: 'Implement fallbacks for micro-frontend failures';
  };

  // Performance
  performance: {
    lazyLoad: 'Load micro-frontends on demand';
    shareVendors: 'Share common dependencies effectively';
    cacheStrategy: 'Implement proper caching strategies';
    bundleOptimization: 'Optimize bundles independently';
  };

  // Communication
  communication: {
    eventBus: 'Use event bus for loose coupling';
    contractTesting: 'Test interfaces between micro-frontends';
    versionNegotiation: 'Handle version mismatches gracefully';
    errorBoundaries: 'Isolate failures to single micro-frontend';
  };

  // Deployment
  deployment: {
    independentDeploy: 'Enable independent deployments';
    canaryReleases: 'Use canary deployments for safety';
    rollbackStrategy: 'Have quick rollback mechanism';
    monitoring: 'Monitor each micro-frontend independently';
  };
}
```

## Related Topics

**Prerequisites**:

- [Code Splitting and Lazy Loading](./code-splitting-and-lazy-loading.md) - Foundation for micro-frontend loading patterns
- [React Architecture Patterns](../react-architecture/_index.md) - Component architecture fundamentals

**Bundle Optimization**:

- [Bundle Analysis Deep Dive](./bundle-analysis-deep-dive.md) - Analyzing shared dependencies and vendor chunks
- [Tree Shaking Optimization](./tree-shaking-optimization.md) - Eliminating unused code across micro-frontends

**Performance Strategies**:

- [CDN Caching Immutable Assets](./cdn-caching-immutable-assets.md) - Caching micro-frontend assets efficiently
- [Production Performance Monitoring](./production-performance-monitoring.md) - Monitoring distributed micro-frontend performance
- [Resource Preloading APIs](./resource-preloading-apis.md) - Optimizing micro-frontend loading priorities

**Advanced Patterns**:

- [Service Worker Strategies](./service-worker-strategies.md) - Caching strategies for micro-frontends
- [Performance Testing Strategy](./performance-testing-strategy.md) - Testing micro-frontend performance
- [Web Workers with React](./web-workers-with-react.md) - Offloading processing in micro-frontends

## Summary

Micro-frontend performance requires balancing independence with efficiency:

1. **Shared Dependencies** - Optimize vendor sharing while maintaining version flexibility
2. **Runtime Loading** - Implement smart loading strategies with proper fallbacks
3. **Communication Patterns** - Use efficient cross-boundary communication
4. **Independent Optimization** - Enable teams to optimize their slices independently
5. **Monitoring & Deployment** - Track performance per micro-frontend with coordinated deployments

The goal is applications that scale organizationally without sacrificing technical performance. Master the patterns in this guide, and your micro-frontends will deliver both team autonomy and fast user experiences.
