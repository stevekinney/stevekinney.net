---
title: Streaming SSR Optimization
description: >-
  Master React 18+ streaming SSR. Optimize TTFB, implement progressive
  hydration, and deliver instant page loads.
date: 2025-09-07T00:30:00.000Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - ssr
  - streaming
  - react-18
---

Traditional Server-Side Rendering forces users to wait for the entire page to be generated before receiving any HTML. With 10,000 products to render, users stare at a blank screen while your server crunches through data. Streaming SSR changes this: it sends HTML as soon as it's ready, piece by piece, creating the perception of instant loading even when the full page takes time to generate.

React 18's streaming capabilities transform slow SSR from a liability into a competitive advantage. Users see above-the-fold content immediately while below-the-fold sections stream in progressively. The result? Dramatically improved Time to First Byte (TTFB), better Core Web Vitals scores, and users who stay engaged instead of bouncing to faster competitors.

## Understanding Streaming SSR

Traditional SSR is synchronous—the server must complete the entire page before sending any HTML:

```tsx
// Traditional SSR - All or nothing approach
app.get('/', async (req, res) => {
  // Server waits for ALL data before rendering
  const user = await fetchUser();
  const posts = await fetchPosts(); // Slow database query
  const comments = await fetchComments(); // Even slower
  const recommendations = await fetchRecommendations(); // Slowest

  // Only now can we render and send HTML
  const html = renderToString(
    <App user={user} posts={posts} comments={comments} recommendations={recommendations} />,
  );

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>...</head>
      <body>
        <div id="root">${html}</div>
      </body>
    </html>
  `);
});

// Result: 3+ second wait for TTFB, blank screen for users
```

Streaming SSR breaks this bottleneck by sending HTML incrementally:

```tsx
// Streaming SSR - Progressive HTML delivery
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  // Start streaming immediately
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() {
      // Send initial HTML shell immediately
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      pipe(res);
    },
    onError(error) {
      console.error('Streaming error:', error);
      res.statusCode = 500;
      res.end('Server Error');
    },
  });
});

// Result: Sub-100ms TTFB, immediate visual feedback
```

## Implementing Streaming SSR

### Basic Streaming Setup

```tsx
// server/streaming-ssr.ts
import { createReadableStream } from 'stream/web';
import { renderToPipeableStream } from 'react-dom/server';
import { Suspense } from 'react';

interface StreamingSSRConfig {
  bootstrapScripts?: string[];
  bootstrapModules?: string[];
  onShellReady?: () => void;
  onAllReady?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
}

class StreamingSSRRenderer {
  constructor(private config: StreamingSSRConfig = {}) {}

  renderToStream(element: React.ReactElement): ReadableStream<Uint8Array> {
    let controller: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });

    const { pipe } = renderToPipeableStream(element, {
      bootstrapScripts: this.config.bootstrapScripts || ['/build/client.js'],
      bootstrapModules: this.config.bootstrapModules,

      onShellReady: () => {
        // Send initial shell - above-the-fold content
        this.config.onShellReady?.();
      },

      onAllReady: () => {
        // All Suspense boundaries resolved
        this.config.onAllReady?.();
      },

      onError: (error: Error) => {
        console.error('Streaming SSR error:', error);
        this.config.onError?.(error);

        // Send error fallback
        const errorHTML = `
          <div style="padding: 20px; border: 1px solid red; background: #ffebee;">
            <h3>Something went wrong</h3>
            <p>Please try refreshing the page.</p>
          </div>
        `;

        controller.enqueue(new TextEncoder().encode(errorHTML));
        controller.close();
      },

      onShellError: (error: Error) => {
        // Critical shell error - fall back to client rendering
        console.error('Shell error:', error);
        controller.close();
      },
    });

    // Pipe React's stream to our ReadableStream
    pipe({
      write: (chunk) => {
        controller.enqueue(new TextEncoder().encode(chunk));
      },
      end: () => {
        controller.close();
      },
    });

    return stream;
  }
}

// Express.js integration
app.get('*', (req, res) => {
  const renderer = new StreamingSSRRenderer({
    bootstrapScripts: ['/build/client.js'],

    onShellReady: () => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
    },

    onError: (error) => {
      res.statusCode = 500;
    },
  });

  const stream = renderer.renderToStream(
    <Html>
      <Head>
        <title>Streaming SSR App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <App url={req.url} />
      </Body>
    </Html>,
  );

  // Convert web stream to Node stream for Express
  const nodeStream = Readable.fromWeb(stream);
  nodeStream.pipe(res);
});
```

### `Suspense` Boundaries for Streaming

```tsx
// components/StreamingApp.tsx
import { Suspense, lazy } from 'react';

// Lazy load components that depend on slow data
const UserProfile = lazy(() => import('./UserProfile'));
const ProductRecommendations = lazy(() => import('./ProductRecommendations'));
const RecentActivity = lazy(() => import('./RecentActivity'));

// Skeleton components for loading states
function UserProfileSkeleton() {
  return (
    <div className="user-profile-skeleton">
      <div className="skeleton avatar" style={{ width: 80, height: 80, borderRadius: '50%' }} />
      <div className="skeleton-content">
        <div className="skeleton name" style={{ width: 160, height: 24, marginBottom: 8 }} />
        <div className="skeleton email" style={{ width: 200, height: 16, marginBottom: 4 }} />
        <div className="skeleton role" style={{ width: 120, height: 16 }} />
      </div>
    </div>
  );
}

function ProductRecommendationsSkeleton() {
  return (
    <div className="recommendations-skeleton">
      <h3>Recommended for you</h3>
      <div className="product-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="product-skeleton">
            <div className="skeleton product-image" style={{ width: '100%', height: 200 }} />
            <div
              className="skeleton product-title"
              style={{ width: '80%', height: 16, margin: '8px 0' }}
            />
            <div className="skeleton product-price" style={{ width: '40%', height: 20 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StreamingApp() {
  return (
    <div className="app">
      {/* Immediate content - no Suspense needed */}
      <Header />
      <Navigation />

      {/* Above-the-fold content that's fast to load */}
      <main className="main-content">
        <section className="hero">
          <h1>Welcome to Our Store</h1>
          <p>Discover amazing products</p>
        </section>

        {/* First streaming boundary - user-specific data */}
        <aside className="sidebar">
          <Suspense fallback={<UserProfileSkeleton />}>
            <UserProfile />
          </Suspense>
        </aside>

        {/* Second streaming boundary - slow product recommendations */}
        <section className="recommendations">
          <Suspense fallback={<ProductRecommendationsSkeleton />}>
            <ProductRecommendations />
          </Suspense>
        </section>

        {/* Third streaming boundary - non-critical activity feed */}
        <section className="activity-feed">
          <Suspense fallback={<div className="loading-spinner">Loading recent activity...</div>}>
            <RecentActivity />
          </Suspense>
        </section>
      </main>

      <Footer />
    </div>
  );
}
```

### Data Fetching for Streaming

```tsx
// utils/streaming-data.ts
import { Suspense } from 'react';

// Create a cache for streaming data promises
const streamingCache = new Map<string, Promise<any>>();

/**
 * Suspend component rendering until data is available
 * Integrates with React's streaming SSR
 */
function suspendUntilData<T>(key: string, fetcher: () => Promise<T>): T {
  if (!streamingCache.has(key)) {
    const promise = fetcher().catch((error) => {
      // Remove failed promise from cache so it can be retried
      streamingCache.delete(key);
      throw error;
    });

    streamingCache.set(key, promise);
  }

  const promise = streamingCache.get(key)!;

  // Check if promise is resolved
  if (promise.status === 'fulfilled') {
    return promise.value;
  } else if (promise.status === 'rejected') {
    throw promise.reason;
  }

  // Promise is still pending - suspend the component
  throw promise;
}

// React components that use streaming data
function UserProfile() {
  // This will suspend until user data is available
  const user = suspendUntilData('current-user', async () => {
    const response = await fetch('/api/user/current');
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  });

  return (
    <div className="user-profile">
      <img src={user.avatar} alt={`${user.name} avatar`} />
      <div>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <span className="role">{user.role}</span>
      </div>
    </div>
  );
}

function ProductRecommendations() {
  // Suspend until recommendations are loaded
  const recommendations = suspendUntilData('product-recommendations', async () => {
    // Simulate slow recommendation algorithm
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await fetch('/api/recommendations');
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    return response.json();
  });

  return (
    <div className="recommendations">
      <h3>Recommended for you</h3>
      <div className="product-grid">
        {recommendations.map((product: Product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// Advanced: Streaming with error boundaries
function StreamingErrorBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ComponentType<{ error: Error }>;
}) {
  return (
    <ErrorBoundary
      fallback={({ error }) => <fallback error={error} />}
      onError={(error, errorInfo) => {
        // Log streaming errors for monitoring
        console.error('Streaming boundary error:', error, errorInfo);

        // Send to error tracking service
        if (typeof window !== 'undefined') {
          // Client-side error tracking
          window.errorTracker?.captureException(error, {
            context: 'streaming-ssr',
            errorInfo,
          });
        }
      }}
    >
      <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
    </ErrorBoundary>
  );
}
```

## Advanced Streaming Patterns

### Priority-Based Streaming

```tsx
// Priority-based streaming for optimal user experience
interface StreamingPriority {
  critical: React.ReactNode[]; // Above-the-fold content
  important: React.ReactNode[]; // User-specific data
  nice: React.ReactNode[]; // Recommendations, ads
  background: React.ReactNode[]; // Analytics, tracking
}

function PriorityStreamingApp({ content }: { content: StreamingPriority }) {
  return (
    <div className="app">
      {/* Priority 1: Critical path - no Suspense */}
      {content.critical}

      {/* Priority 2: Important content - fast timeout */}
      <Suspense fallback={<ImportantContentSkeleton />}>
        <StreamingBoundary timeout={500}>{content.important}</StreamingBoundary>
      </Suspense>

      {/* Priority 3: Nice-to-have - longer timeout */}
      <Suspense fallback={<NiceContentSkeleton />}>
        <StreamingBoundary timeout={2000}>{content.nice}</StreamingBoundary>
      </Suspense>

      {/* Priority 4: Background - no timeout, fail silently */}
      <Suspense fallback={null}>
        <StreamingBoundary timeout={Infinity}>{content.background}</StreamingBoundary>
      </Suspense>
    </div>
  );
}

// Custom boundary with timeout and error handling
function StreamingBoundary({
  children,
  timeout,
  fallback = null,
}: {
  children: React.ReactNode;
  timeout: number;
  fallback?: React.ReactNode;
}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (timeout === Infinity) return;

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  if (timedOut) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### Streaming with Real-Time Updates

```tsx
// Combine streaming SSR with real-time updates
function LiveStreamingApp() {
  return (
    <div className="app">
      {/* Static content streams normally */}
      <Header />
      <Navigation />

      {/* Real-time content that updates after hydration */}
      <Suspense fallback={<LiveDataSkeleton />}>
        <LiveDataStream />
      </Suspense>

      {/* Chat component that works during streaming */}
      <Suspense fallback={<ChatSkeleton />}>
        <LiveChat />
      </Suspense>
    </div>
  );
}

function LiveDataStream() {
  const initialData = suspendUntilData('live-data', fetchLiveData);
  const [data, setData] = useState(initialData);

  useEffect(() => {
    // Set up real-time updates after component mounts
    const ws = new WebSocket('/ws/live-data');

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setData((current) => ({ ...current, ...update }));
    };

    return () => ws.close();
  }, []);

  return (
    <div className="live-data">
      <h2>Live Metrics</h2>
      <div className="metrics">
        <Metric label="Active Users" value={data.activeUsers} />
        <Metric label="Revenue" value={`$${data.revenue.toLocaleString()}`} />
        <Metric label="Orders" value={data.orders} />
      </div>
    </div>
  );
}
```

## Progressive Hydration

```tsx
// Progressive hydration for streaming SSR
class ProgressiveHydrator {
  private hydrated = new Set<string>();
  private observers = new Map<string, IntersectionObserver>();

  /**
   * Hydrate component when it becomes visible
   */
  hydrateOnVisible(componentId: string, Component: React.ComponentType<any>, props: any) {
    if (this.hydrated.has(componentId)) return;

    const element = document.querySelector(`[data-component-id="${componentId}"]`);
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.performHydration(componentId, Component, props, element as HTMLElement);
            observer.disconnect();
            this.observers.delete(componentId);
          }
        });
      },
      { rootMargin: '50px' }, // Start hydrating 50px before visible
    );

    observer.observe(element);
    this.observers.set(componentId, observer);
  }

  /**
   * Hydrate component on user interaction
   */
  hydrateOnInteraction(
    componentId: string,
    Component: React.ComponentType<any>,
    props: any,
    events = ['mouseenter', 'click', 'focus', 'touchstart'],
  ) {
    if (this.hydrated.has(componentId)) return;

    const element = document.querySelector(`[data-component-id="${componentId}"]`);
    if (!element) return;

    const hydrate = () => {
      this.performHydration(componentId, Component, props, element as HTMLElement);

      // Remove event listeners
      events.forEach((event) => {
        element.removeEventListener(event, hydrate);
      });
    };

    // Add event listeners
    events.forEach((event) => {
      element.addEventListener(event, hydrate, { once: true, passive: true });
    });
  }

  /**
   * Hydrate component immediately (high priority)
   */
  hydrateImmediately(componentId: string, Component: React.ComponentType<any>, props: any) {
    if (this.hydrated.has(componentId)) return;

    const element = document.querySelector(`[data-component-id="${componentId}"]`);
    if (!element) return;

    // Use requestIdleCallback for non-blocking hydration
    requestIdleCallback(
      () => {
        this.performHydration(componentId, Component, props, element as HTMLElement);
      },
      { timeout: 1000 }, // Fallback after 1 second
    );
  }

  private performHydration(
    componentId: string,
    Component: React.ComponentType<any>,
    props: any,
    element: HTMLElement,
  ) {
    if (this.hydrated.has(componentId)) return;

    try {
      const startTime = performance.now();

      // Hydrate the component
      const root = createRoot(element);
      root.render(<Component {...props} />);

      const endTime = performance.now();

      // Track hydration performance
      this.trackHydrationMetrics(componentId, endTime - startTime);

      this.hydrated.add(componentId);

      console.log(`✅ Hydrated ${componentId} in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.error(`❌ Failed to hydrate ${componentId}:`, error);

      // Send error to monitoring service
      this.reportHydrationError(componentId, error);
    }
  }

  private trackHydrationMetrics(componentId: string, duration: number) {
    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'progressive_hydration', {
        event_category: 'Performance',
        event_label: componentId,
        value: Math.round(duration),
      });
    }
  }

  private reportHydrationError(componentId: string, error: any) {
    // Send to error tracking service
    if (typeof window !== 'undefined' && window.errorTracker) {
      window.errorTracker.captureException(error, {
        context: 'progressive-hydration',
        componentId,
      });
    }
  }
}

// Usage in client-side entry point
const hydrator = new ProgressiveHydrator();

// Critical components hydrate immediately
hydrator.hydrateImmediately('header', Header, headerProps);
hydrator.hydrateImmediately('navigation', Navigation, navProps);

// Above-the-fold components hydrate on visibility
hydrator.hydrateOnVisible('hero', Hero, heroProps);
hydrator.hydrateOnVisible('product-list', ProductList, productListProps);

// Interactive components hydrate on interaction
hydrator.hydrateOnInteraction('search', SearchComponent, searchProps);
hydrator.hydrateOnInteraction('cart', ShoppingCart, cartProps);

// Below-the-fold components hydrate on visibility
hydrator.hydrateOnVisible('recommendations', Recommendations, recommendationsProps);
hydrator.hydrateOnVisible('footer', Footer, footerProps);
```

## Performance Optimization

### Streaming Performance Monitoring

```tsx
// Monitor streaming SSR performance
class StreamingPerformanceMonitor {
  private metrics = {
    ttfb: 0,
    firstChunkTime: 0,
    shellReadyTime: 0,
    fullPageTime: 0,
    hydrationTime: 0,
    chunkCount: 0,
    errors: 0,
  };

  constructor() {
    this.setupPerformanceObservers();
  }

  private setupPerformanceObservers() {
    // Monitor navigation timing for TTFB
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;

      this.metrics.ttfb = navigation.responseStart - navigation.requestStart;
      this.metrics.fullPageTime = navigation.loadEventEnd - navigation.requestStart;

      this.reportMetrics();
    });

    // Monitor streaming-specific events
    window.addEventListener('streaming-shell-ready', (event: CustomEvent) => {
      this.metrics.shellReadyTime = event.detail.timestamp - performance.timeOrigin;
    });

    window.addEventListener('streaming-chunk-received', () => {
      this.metrics.chunkCount++;

      if (this.metrics.chunkCount === 1) {
        this.metrics.firstChunkTime = performance.now();
      }
    });

    window.addEventListener('streaming-hydration-complete', (event: CustomEvent) => {
      this.metrics.hydrationTime = event.detail.duration;
    });

    window.addEventListener('streaming-error', () => {
      this.metrics.errors++;
    });
  }

  reportMetrics() {
    console.table({
      TTFB: `${this.metrics.ttfb.toFixed(2)}ms`,
      'First Chunk': `${this.metrics.firstChunkTime.toFixed(2)}ms`,
      'Shell Ready': `${this.metrics.shellReadyTime.toFixed(2)}ms`,
      'Full Page': `${this.metrics.fullPageTime.toFixed(2)}ms`,
      Hydration: `${this.metrics.hydrationTime.toFixed(2)}ms`,
      Chunks: this.metrics.chunkCount,
      Errors: this.metrics.errors,
    });

    // Send to analytics
    this.sendToAnalytics();
  }

  private sendToAnalytics() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'streaming_ssr_performance', {
        event_category: 'Performance',
        custom_map: {
          dimension1: this.metrics.ttfb,
          dimension2: this.metrics.shellReadyTime,
          dimension3: this.metrics.hydrationTime,
          metric1: this.metrics.chunkCount,
        },
      });
    }
  }
}

// Server-side performance tracking
class ServerStreamingMonitor {
  trackRequest(
    req: Request,
    streamStats: {
      shellTime: number;
      totalChunks: number;
      errors: number;
    },
  ) {
    console.log(`📊 Streaming SSR Stats for ${req.url}:`);
    console.log(`  Shell rendered in: ${streamStats.shellTime}ms`);
    console.log(`  Total chunks: ${streamStats.totalChunks}`);
    console.log(`  Errors: ${streamStats.errors}`);

    // Log to monitoring service
    this.sendServerMetrics(req.url, streamStats);
  }

  private sendServerMetrics(url: string, stats: any) {
    // Send to application monitoring (e.g., New Relic, DataDog)
    if (process.env.NODE_ENV === 'production') {
      // Example: New Relic custom metrics
      // newrelic.recordMetric('Custom/Streaming/ShellTime', stats.shellTime);
      // newrelic.recordMetric('Custom/Streaming/ChunkCount', stats.totalChunks);
    }
  }
}
```

### Cache-Friendly Streaming

```tsx
// Implement caching for streaming components
class StreamingCache {
  private cache = new Map<
    string,
    {
      data: any;
      timestamp: number;
      ttl: number;
    }
  >();

  /**
   * Cache component data with TTL
   */
  set(key: string, data: any, ttlMs: number = 300000) {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get cached data if still valid
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: RegExp) {
    for (const [key] of this.cache) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      const isExpired = now - entry.timestamp > entry.ttl;
      if (isExpired) {
        this.cache.delete(key);
      }
    }
  }
}

const streamingCache = new StreamingCache();

// Enhanced data fetching with caching
function suspendUntilCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 300000,
): T {
  // Check cache first
  const cached = streamingCache.get(key);
  if (cached) {
    return cached;
  }

  // Check if promise is already in flight
  if (!streamingCache.has(`${key}:promise`)) {
    const promise = fetcher()
      .then((data) => {
        // Cache the result
        streamingCache.set(key, data, ttlMs);
        streamingCache.set(`${key}:promise`, null, 0); // Clear promise
        return data;
      })
      .catch((error) => {
        streamingCache.set(`${key}:promise`, null, 0); // Clear promise on error
        throw error;
      });

    streamingCache.set(`${key}:promise`, promise, 60000); // Cache promise for 1 minute
  }

  const promise = streamingCache.get(`${key}:promise`);
  if (promise) {
    throw promise; // Suspend until promise resolves
  }

  // This shouldn't happen, but fallback to fetching
  throw fetcher();
}

// Cleanup cache periodically
setInterval(() => {
  streamingCache.cleanup();
}, 60000); // Every minute
```

## Edge Cases and Error Handling

### Streaming Error Recovery

```tsx
// Robust error handling for streaming SSR
class StreamingErrorHandler {
  private errorCount = 0;
  private maxErrors = 5;
  private fallbackHTML = `
    <div class="streaming-error-fallback">
      <h2>Content temporarily unavailable</h2>
      <p>Please refresh the page to try again.</p>
      <button onclick="window.location.reload()">Refresh</button>
    </div>
  `;

  handleStreamingError(error: Error, componentName: string, res: Response): boolean {
    this.errorCount++;

    console.error(`Streaming error in ${componentName}:`, error);

    // Log error for monitoring
    this.logError(error, componentName);

    // If too many errors, fall back to client rendering
    if (this.errorCount >= this.maxErrors) {
      this.sendFallbackResponse(res);
      return false;
    }

    // Send error boundary HTML
    this.sendErrorBoundary(res, componentName, error);
    return true;
  }

  private sendErrorBoundary(res: Response, componentName: string, error: Error) {
    const errorHTML = `
      <div class="streaming-error-boundary" data-component="${componentName}">
        ${this.fallbackHTML}
        <!-- Error details for debugging -->
        ${
          process.env.NODE_ENV === 'development'
            ? `
          <details>
            <summary>Error Details (Development Only)</summary>
            <pre>${error.stack}</pre>
          </details>
        `
            : ''
        }
      </div>
    `;

    res.write(errorHTML);
  }

  private sendFallbackResponse(res: Response) {
    const fallbackPage = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loading...</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div id="root">Loading...</div>
          <script>
            // Force client-side rendering
            window.__FORCE_CLIENT_RENDER__ = true;
          </script>
          <script src="/build/client.js"></script>
        </body>
      </html>
    `;

    res.end(fallbackPage);
  }

  private logError(error: Error, componentName: string) {
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry error tracking
      // Sentry.captureException(error, {
      //   context: 'streaming-ssr',
      //   component: componentName,
      // });
    }
  }
}
```

## Testing Streaming SSR

```tsx
// Testing utilities for streaming SSR
class StreamingSSRTester {
  async testStreamingResponse(url: string): Promise<{
    ttfb: number;
    firstChunk: number;
    totalTime: number;
    chunkCount: number;
    errors: string[];
  }> {
    const startTime = performance.now();
    let firstChunkTime = 0;
    let chunkCount = 0;
    const errors: string[] = [];

    return new Promise((resolve, reject) => {
      fetch(url)
        .then((response) => {
          const ttfb = performance.now() - startTime;

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          function readChunk(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                const totalTime = performance.now() - startTime;

                resolve({
                  ttfb,
                  firstChunk: firstChunkTime,
                  totalTime,
                  chunkCount,
                  errors,
                });

                return;
              }

              chunkCount++;

              if (chunkCount === 1) {
                firstChunkTime = performance.now() - startTime;
              }

              // Check for error indicators in the chunk
              const chunkText = decoder.decode(value, { stream: true });
              if (chunkText.includes('streaming-error-boundary')) {
                errors.push('Error boundary detected in chunk');
              }

              return readChunk();
            });
          }

          return readChunk();
        })
        .catch(reject);
    });
  }

  async runStreamingTests() {
    const testUrls = ['/', '/dashboard', '/profile', '/products'];

    const results = await Promise.all(
      testUrls.map(async (url) => {
        const result = await this.testStreamingResponse(url);
        return { url, ...result };
      }),
    );

    console.log('🔬 Streaming SSR Test Results:');
    console.table(
      results.map((r) => ({
        URL: r.url,
        TTFB: `${r.ttfb.toFixed(2)}ms`,
        'First Chunk': `${r.firstChunk.toFixed(2)}ms`,
        'Total Time': `${r.totalTime.toFixed(2)}ms`,
        Chunks: r.chunkCount,
        Errors: r.errors.length,
      })),
    );

    return results;
  }
}

// Integration with testing framework
describe('Streaming SSR', () => {
  const tester = new StreamingSSRTester();

  it('should achieve good TTFB performance', async () => {
    const results = await tester.testStreamingResponse('/');

    expect(results.ttfb).toBeLessThan(200); // Under 200ms TTFB
    expect(results.firstChunk).toBeLessThan(500); // First chunk within 500ms
    expect(results.errors).toHaveLength(0); // No errors
  });

  it('should stream content progressively', async () => {
    const results = await tester.testStreamingResponse('/dashboard');

    expect(results.chunkCount).toBeGreaterThan(1); // Multiple chunks
    expect(results.firstChunk).toBeLessThan(results.totalTime); // Progressive loading
  });
});
```
