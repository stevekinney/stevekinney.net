---
title: Resource Preloading APIs with TypeScript
description: Preload, preinit, and prefetch with confidence—type helpers to avoid duplicate loads and mismatched priorities.
date: 2025-09-06T22:04:44.920Z
modified: 2025-09-06T22:04:44.920Z
published: true
tags:
  ['react', 'typescript', 'resource-preloading', 'preloading-apis', 'performance', 'optimization']
---

Web performance isn't just about fast servers and optimized bundles—it's about loading the right resources at the right time. React's resource preloading APIs (`preload`, `preinit`, and `prefetch`) let you fine-tune when and how critical assets are fetched, but without proper TypeScript setup, you might end up loading the same stylesheet twice or preloading a script with the wrong priority. Let's build type-safe helpers that make resource preloading both reliable and developer-friendly.

Resource preloading is all about giving the browser hints: "Hey, I know you're going to need this font in a few milliseconds, so start fetching it now" or "This JavaScript module will definitely be used on the next page, so grab it when you have a spare moment." The challenge is coordinating these hints across your application without creating duplicate requests or conflicting priorities.

## Understanding the Preloading APIs

React 19 introduced three complementary APIs for resource management:

- **`preload`**: Fetch resources you'll need soon (stylesheets, fonts, images)
- **`preinit`**: Load and initialize resources immediately (critical scripts, stylesheets)
- **`prefetch`**: Opportunistically cache resources for future navigation

Each serves a different performance strategy, but they all share a common need for consistent resource identification and deduplication.

```ts
import { preload, preinit, prefetch } from 'react-dom';

// Preload a stylesheet we'll need shortly
preload('/styles/article.css', { as: 'style' });

// Initialize critical JavaScript immediately
preinit('/js/analytics.js', { as: 'script' });

// Prefetch resources for the next page
prefetch('/api/user/preferences');
```

The tricky part isn't the API calls—it's managing them consistently across your app without conflicts or redundant requests.

## Creating Type-Safe Resource Definitions

Let's start by defining our resource types. We want compile-time safety for resource URLs, loading strategies, and priorities:

```ts
// Resource types with specific constraints
type ResourceType = 'script' | 'style' | 'font' | 'image' | 'fetch';

type LoadingStrategy = 'preload' | 'preinit' | 'prefetch';

interface ResourceDefinition {
  readonly url: string;
  readonly type: ResourceType;
  readonly strategy: LoadingStrategy;
  readonly priority?: 'high' | 'low' | 'auto';
  readonly crossOrigin?: 'anonymous' | 'use-credentials';
  readonly integrity?: string;
}

// Type-safe resource catalog
const RESOURCES = {
  // Critical CSS that should initialize immediately
  criticalStyles: {
    url: '/css/critical.css',
    type: 'style' as const,
    strategy: 'preinit' as const,
    priority: 'high' as const,
  },
  // Fonts we'll need for above-the-fold content
  primaryFont: {
    url: '/fonts/inter-var.woff2',
    type: 'font' as const,
    strategy: 'preload' as const,
    crossOrigin: 'anonymous' as const,
  },
  // Analytics script for initialization
  analytics: {
    url: '/js/analytics.bundle.js',
    type: 'script' as const,
    strategy: 'preinit' as const,
    integrity: 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC',
  },
} as const satisfies Record<string, ResourceDefinition>;

type ResourceKey = keyof typeof RESOURCES;
```

This approach gives us several benefits: the resource catalog is the single source of truth, TypeScript prevents typos in resource keys, and we can enforce consistency in loading strategies.

## Building a Deduplication Manager

The biggest footgun with preloading APIs is loading the same resource multiple times. Let's create a manager that tracks what's been loaded:

```ts
class ResourceManager {
  private loadedResources = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();

  private getResourceKey(url: string, strategy: LoadingStrategy): string {
    return `${strategy}:${url}`;
  }

  async loadResource<T extends ResourceKey>(key: T, options?: { force?: boolean }): Promise<void> {
    const resource = RESOURCES[key];
    const resourceKey = this.getResourceKey(resource.url, resource.strategy);

    // Skip if already loaded (unless forced)
    if (!options?.force && this.loadedResources.has(resourceKey)) {
      return;
    }

    // Return existing promise if loading is in progress
    const existingPromise = this.loadingPromises.get(resourceKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new loading promise
    const loadingPromise = this.executeLoad(resource);
    this.loadingPromises.set(resourceKey, loadingPromise);

    try {
      await loadingPromise;
      this.loadedResources.add(resourceKey);
    } finally {
      this.loadingPromises.delete(resourceKey);
    }
  }

  private async executeLoad(resource: ResourceDefinition): Promise<void> {
    const { url, type, strategy, priority, crossOrigin, integrity } = resource;

    switch (strategy) {
      case 'preload':
        preload(url, {
          as: type,
          ...(priority && { fetchPriority: priority }),
          ...(crossOrigin && { crossOrigin }),
          ...(integrity && { integrity }),
        });
        break;

      case 'preinit':
        preinit(url, {
          as: type,
          ...(priority && { fetchPriority: priority }),
          ...(crossOrigin && { crossOrigin }),
          ...(integrity && { integrity }),
        });
        break;

      case 'prefetch':
        prefetch(url);
        break;
    }
  }

  // Check loading state
  isLoaded(key: ResourceKey): boolean {
    const resource = RESOURCES[key];
    const resourceKey = this.getResourceKey(resource.url, resource.strategy);
    return this.loadedResources.has(resourceKey);
  }

  isLoading(key: ResourceKey): boolean {
    const resource = RESOURCES[key];
    const resourceKey = this.getResourceKey(resource.url, resource.strategy);
    return this.loadingPromises.has(resourceKey);
  }
}

// Singleton instance
export const resourceManager = new ResourceManager();
```

## Creating React Hooks for Resource Loading

Now let's wrap this in React hooks that feel natural to use in components:

```ts
import { useEffect, useState } from 'react';

export function useResourceLoader(resources: ResourceKey[], options?: { eager?: boolean }) {
  const [loadingStates, setLoadingStates] = useState(() =>
    resources.reduce(
      (acc, key) => ({
        ...acc,
        [key]: resourceManager.isLoaded(key) ? 'loaded' : 'pending',
      }),
      {} as Record<ResourceKey, 'pending' | 'loading' | 'loaded' | 'error'>,
    ),
  );

  useEffect(() => {
    if (!options?.eager) return;

    const loadResources = async () => {
      const loadPromises = resources.map(async (key) => {
        if (resourceManager.isLoaded(key)) return;

        setLoadingStates((prev) => ({ ...prev, [key]: 'loading' }));

        try {
          await resourceManager.loadResource(key);
          setLoadingStates((prev) => ({ ...prev, [key]: 'loaded' }));
        } catch (error) {
          console.error(`Failed to load resource: ${key}`, error);
          setLoadingStates((prev) => ({ ...prev, [key]: 'error' }));
        }
      });

      await Promise.all(loadPromises);
    };

    loadResources();
  }, [resources, options?.eager]);

  return {
    loadingStates,
    isLoading: Object.values(loadingStates).some((state) => state === 'loading'),
    isLoaded: (key: ResourceKey) => loadingStates[key] === 'loaded',
    loadResource: async (key: ResourceKey) => {
      if (resourceManager.isLoaded(key)) return;

      setLoadingStates((prev) => ({ ...prev, [key]: 'loading' }));

      try {
        await resourceManager.loadResource(key);
        setLoadingStates((prev) => ({ ...prev, [key]: 'loaded' }));
      } catch (error) {
        setLoadingStates((prev) => ({ ...prev, [key]: 'error' }));
        throw error;
      }
    },
  };
}

// Hook for conditional resource loading
export function useConditionalResources(condition: boolean, resources: ResourceKey[]) {
  return useResourceLoader(condition ? resources : [], { eager: condition });
}
```

## Real World Usage Patterns

Here's how these hooks work in practice across different component scenarios:

```tsx
// Layout component that preloads critical resources
function AppLayout({ children }: { children: React.ReactNode }) {
  // Eagerly load critical resources
  const { isLoading } = useResourceLoader(['criticalStyles', 'primaryFont', 'analytics'], {
    eager: true,
  });

  return (
    <div className="app-layout">
      {isLoading && <div className="loading-indicator" />}
      {children}
    </div>
  );
}

// Article page that conditionally loads fonts
function ArticlePage({ hasCustomFont }: { hasCustomFont: boolean }) {
  const { loadResource, isLoaded } = useConditionalResources(hasCustomFont, ['primaryFont']);

  useEffect(() => {
    // Load additional resources based on user interaction
    const handleUserScroll = () => {
      if (window.scrollY > 100) {
        loadResource('analytics');
      }
    };

    window.addEventListener('scroll', handleUserScroll);
    return () => window.removeEventListener('scroll', handleUserScroll);
  }, [loadResource]);

  return (
    <article className={hasCustomFont && isLoaded('primaryFont') ? 'custom-font' : ''}>
      {/* Article content */}
    </article>
  );
}

// Navigation component that prefetches next pages
function Navigation() {
  const { loadResource } = useResourceLoader([]);

  const handleLinkHover = (href: string) => {
    // Prefetch resources for likely next navigation
    if (href.includes('/dashboard')) {
      loadResource('dashboardStyles');
    }
  };

  return (
    <nav>
      <Link href="/dashboard" onMouseEnter={() => handleLinkHover('/dashboard')}>
        Dashboard
      </Link>
    </nav>
  );
}
```

## Advanced Resource Loading Strategies

Sometimes you need more sophisticated loading logic. Here are some patterns for handling complex scenarios:

```ts
// Priority-based loading manager
class PriorityResourceManager extends ResourceManager {
  private priorityQueue: Array<{ key: ResourceKey; priority: number }> = [];

  queueResource(key: ResourceKey, priority: number = 0): void {
    if (this.isLoaded(key) || this.isLoading(key)) return;

    this.priorityQueue.push({ key, priority });
    this.priorityQueue.sort((a, b) => b.priority - a.priority);
  }

  async processQueue(maxConcurrent: number = 3): Promise<void> {
    const batch = this.priorityQueue.splice(0, maxConcurrent);

    const loadPromises = batch.map(({ key }) =>
      this.loadResource(key).catch((error) =>
        console.error(`Priority loading failed for ${key}:`, error),
      ),
    );

    await Promise.all(loadPromises);

    // Process next batch if queue has items
    if (this.priorityQueue.length > 0) {
      await this.processQueue(maxConcurrent);
    }
  }
}

// Connection-aware loading
function useConnectionAwareLoading(resources: ResourceKey[]) {
  const [connectionInfo, setConnectionInfo] = useState(() =>
    'connection' in navigator
      ? {
          effectiveType: (navigator as any).connection?.effectiveType,
          saveData: (navigator as any).connection?.saveData,
        }
      : null,
  );

  useEffect(() => {
    const updateConnection = () => {
      if ('connection' in navigator) {
        setConnectionInfo({
          effectiveType: (navigator as any).connection?.effectiveType,
          saveData: (navigator as any).connection?.saveData,
        });
      }
    };

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateConnection);
      return () => (navigator as any).connection.removeEventListener('change', updateConnection);
    }
  }, []);

  const shouldPreload =
    !connectionInfo?.saveData && ['4g', '3g'].includes(connectionInfo?.effectiveType);

  return useResourceLoader(shouldPreload ? resources : [], { eager: shouldPreload });
}
```

## Debugging and DevTools Integration

Resource preloading can be tricky to debug. Let's add some developer experience improvements:

```ts
// Development-only resource monitor
class ResourceMonitor {
  private static instance: ResourceMonitor;
  private logs: Array<{
    timestamp: Date;
    action: string;
    resource: string;
    details?: any;
  }> = [];

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  log(action: string, resource: string, details?: any): void {
    if (process.env.NODE_ENV !== 'development') return;

    this.logs.push({
      timestamp: new Date(),
      action,
      resource,
      details,
    });

    console.group(`🚀 Resource ${action}: ${resource}`);
    if (details) console.log('Details:', details);
    console.log('Time:', new Date().toISOString());
    console.groupEnd();
  }

  getDuplicateLoads(): string[] {
    const loadCounts = this.logs.reduce(
      (acc, log) => {
        if (log.action === 'load') {
          acc[log.resource] = (acc[log.resource] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(loadCounts)
      .filter(([, count]) => count > 1)
      .map(([resource]) => resource);
  }

  getLoadingStats(): Record<string, number> {
    return this.logs.reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}

// Enhanced resource manager with monitoring
class MonitoredResourceManager extends ResourceManager {
  private monitor = ResourceMonitor.getInstance();

  async loadResource<T extends ResourceKey>(key: T, options?: { force?: boolean }): Promise<void> {
    this.monitor.log('requested', key, { force: options?.force });

    if (!options?.force && this.isLoaded(key)) {
      this.monitor.log('skipped', key, { reason: 'already loaded' });
      return;
    }

    this.monitor.log('loading', key);

    try {
      await super.loadResource(key, options);
      this.monitor.log('loaded', key);
    } catch (error) {
      this.monitor.log('failed', key, { error: error.message });
      throw error;
    }
  }
}
```

## Performance Considerations and Best Practices

Resource preloading is powerful, but it comes with tradeoffs you should understand:

### Memory and Bandwidth Impact

```ts
// ❌ Aggressive preloading can hurt performance
const BAD_PRELOAD_STRATEGY = [
  'heavyImage1',
  'heavyImage2',
  'heavyImage3', // 5MB each
  'unusedScript1',
  'unusedScript2', // User may never see these
  'allFonts', // Loading all font weights when you need one
];

// ✅ Strategic preloading based on user behavior
function useSmartPreloading() {
  const { loadResource } = useResourceLoader([]);

  useEffect(() => {
    // Preload based on user intent signals
    const handleMouseMove = () => {
      // User is actively browsing, preload likely next resources
      loadResource('nextPageStyles');
    };

    const handleIdle = () => {
      // Browser is idle, safe to prefetch lower-priority resources
      loadResource('backgroundImage');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('requestIdleCallback', handleIdle);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('requestIdleCallback', handleIdle);
    };
  }, [loadResource]);
}
```

### Critical Resource Prioritization

```ts
// Resource loading phases
const LOADING_PHASES = {
  critical: ['criticalStyles', 'primaryFont'], // Block render
  important: ['analytics', 'errorTracking'], // Load early
  optional: ['backgroundImage', 'socialWidgets'], // Load when idle
} as const;

function usePhaseBasedLoading() {
  const [currentPhase, setCurrentPhase] = useState<keyof typeof LOADING_PHASES>('critical');

  // Load critical resources immediately
  useResourceLoader(LOADING_PHASES.critical, { eager: true });

  // Load important resources after critical ones
  const { isLoading: criticalLoading } = useResourceLoader(LOADING_PHASES.critical);
  useResourceLoader(LOADING_PHASES.important, { eager: !criticalLoading });

  // Load optional resources when idle
  useEffect(() => {
    if (criticalLoading) return;

    const idleCallback = () => {
      setCurrentPhase('optional');
    };

    const timeoutId = setTimeout(idleCallback, 1000);
    return () => clearTimeout(timeoutId);
  }, [criticalLoading]);

  useResourceLoader(LOADING_PHASES.optional, { eager: currentPhase === 'optional' });
}
```

> [!WARNING]  
> Preloading too many resources can actually hurt performance by competing for bandwidth with critical resources. Always measure the impact on Core Web Vitals.

## Testing Resource Loading

Resource preloading logic needs testing, but mocking browser APIs can be tricky:

```ts
// Test utilities for resource loading
export class MockResourceManager extends ResourceManager {
  public mockLoadPromises = new Map<string, Promise<void>>();
  public mockLoadCalls: Array<{ key: ResourceKey; timestamp: Date }> = [];

  async loadResource<T extends ResourceKey>(key: T, options?: { force?: boolean }): Promise<void> {
    this.mockLoadCalls.push({ key, timestamp: new Date() });

    // Simulate loading delay
    const loadPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    this.mockLoadPromises.set(key, loadPromise);
    return loadPromise;
  }

  // Test helpers
  getLoadCallCount(key: ResourceKey): number {
    return this.mockLoadCalls.filter((call) => call.key === key).length;
  }

  reset(): void {
    this.mockLoadCalls = [];
    this.mockLoadPromises.clear();
  }
}

// Example test
describe('useResourceLoader', () => {
  let mockManager: MockResourceManager;

  beforeEach(() => {
    mockManager = new MockResourceManager();
  });

  test('should not load resources multiple times', async () => {
    const { result } = renderHook(() => useResourceLoader(['criticalStyles'], { eager: true }));

    await waitFor(() => {
      expect(result.current.isLoaded('criticalStyles')).toBe(true);
    });

    expect(mockManager.getLoadCallCount('criticalStyles')).toBe(1);
  });
});
```

Resource preloading with TypeScript doesn't have to be a source of bugs and performance surprises. By building type-safe abstractions around React's preloading APIs, you get the performance benefits of smart resource loading with the confidence that comes from compile-time checking and runtime deduplication.

The key principles: define your resources in a central catalog, use TypeScript to prevent mistakes, deduplicate aggressively, and always measure the performance impact. Your users will thank you for the faster loading times, and your future self will thank you for the maintainable code.
