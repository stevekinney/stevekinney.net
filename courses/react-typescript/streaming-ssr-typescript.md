---
title: Streaming SSR with TypeScript
description: >-
  Type-safe streaming SSR in React 19—Suspense boundaries, progressive
  hydration, and streaming data patterns with full type safety.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
published: true
tags:
  - react
  - typescript
  - ssr
  - streaming
  - suspense
  - hydration
---

Streaming SSR in React 19 is like upgrading from dial-up to fiber optic. Instead of waiting for your entire page to render on the server before sending anything, you can start streaming HTML to the browser immediately, progressively sending chunks as they become ready. But here's where it gets interesting: combining this with TypeScript means you need to think about types that work across the server-client boundary, handle partial hydration states, and ensure type safety during progressive enhancement.

Let's dive into how streaming SSR works with TypeScript, covering everything from basic setup to advanced patterns that will make your apps feel instantaneous.

## Understanding Streaming SSR

Traditional SSR renders everything on the server, then sends one big HTML chunk. Streaming SSR sends HTML in pieces as they're ready, which means users see content faster and time-to-first-byte (TTFB) improves dramatically.

### The Streaming Mental Model

```tsx
// Traditional SSR: Everything waits for the slowest part
async function TraditionalPage() {
  const [user, posts, recommendations] = await Promise.all([
    fetchUser(), // 100ms
    fetchPosts(), // 500ms
    fetchRecommendations(), // 2000ms
  ]);

  // User waits 2000ms before seeing anything
  return (
    <div>
      <UserProfile user={user} />
      <PostList posts={posts} />
      <Recommendations items={recommendations} />
    </div>
  );
}

// Streaming SSR: Send what's ready immediately
function StreamingPage() {
  return (
    <div>
      <Suspense fallback={<UserProfileSkeleton />}>
        <UserProfile /> {/* Streams when ready (100ms) */}
      </Suspense>

      <Suspense fallback={<PostListSkeleton />}>
        <PostList /> {/* Streams when ready (500ms) */}
      </Suspense>

      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations /> {/* Streams when ready (2000ms) */}
      </Suspense>
    </div>
  );
}
```

## Setting Up Streaming SSR with TypeScript

Let's build a type-safe streaming SSR setup from the ground up.

### Server Setup with Node.js Streams

```tsx
// server/streaming-renderer.ts
import { renderToPipeableStream } from 'react-dom/server';
import { Transform } from 'stream';
import type { ReactElement } from 'react';

interface StreamingOptions {
  bootstrapScripts?: string[];
  onShellReady?: () => void;
  onAllReady?: () => void;
  onError?: (error: Error) => void;
}

export function createStreamingRenderer(element: ReactElement, options: StreamingOptions = {}) {
  return new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(element, {
      bootstrapScripts: options.bootstrapScripts,

      onShellReady() {
        // Shell is ready, start streaming
        options.onShellReady?.();
        resolve(pipe);
      },

      onShellError(error) {
        // Error before shell, can't recover
        reject(error);
      },

      onError(error) {
        // Error during streaming
        options.onError?.(error);
        console.error('Streaming error:', error);
      },

      onAllReady() {
        // Everything is rendered
        options.onAllReady?.();
      },
    });

    // Timeout to prevent hanging
    setTimeout(() => {
      abort();
      reject(new Error('Render timeout'));
    }, 10000);
  });
}
```

### Type-Safe HTML Template

```tsx
// server/html-template.ts
interface HtmlTemplateOptions {
  title: string;
  meta?: Record<string, string>;
  links?: Array<{ rel: string; href: string }>;
  scripts?: Array<{ src: string; async?: boolean; defer?: boolean }>;
  bodyAttributes?: Record<string, string>;
}

export function createHtmlTemplate(options: HtmlTemplateOptions): {
  head: string;
  tail: string;
} {
  const metaTags = Object.entries(options.meta || {})
    .map(([name, content]) => `<meta name="${name}" content="${content}">`)
    .join('\n');

  const linkTags = (options.links || [])
    .map((link) => `<link rel="${link.rel}" href="${link.href}">`)
    .join('\n');

  const scriptTags = (options.scripts || [])
    .map((script) => {
      const attrs = [`src="${script.src}"`, script.async && 'async', script.defer && 'defer']
        .filter(Boolean)
        .join(' ');
      return `<script ${attrs}></script>`;
    })
    .join('\n');

  const bodyAttrs = Object.entries(options.bodyAttributes || {})
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  const head = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  ${metaTags}
  ${linkTags}
</head>
<body ${bodyAttrs}>
  <div id="root">`;

  const tail = `</div>
  ${scriptTags}
</body>
</html>`;

  return { head, tail };
}
```

### Express Server with Streaming

```tsx
// server/app.ts
import express from 'express';
import { createStreamingRenderer } from './streaming-renderer';
import { createHtmlTemplate } from './html-template';
import { App } from '../src/App';

const app = express();

interface RequestContext {
  user?: User;
  locale: string;
  theme: 'light' | 'dark';
}

// Type-safe server context
app.get('/', async (req, res) => {
  const context: RequestContext = {
    user: req.session?.user,
    locale: req.headers['accept-language']?.split(',')[0] || 'en',
    theme: req.cookies.theme || 'light',
  };

  const { head, tail } = createHtmlTemplate({
    title: 'My Streaming App',
    meta: {
      description: 'A streaming SSR React app',
      viewport: 'width=device-width, initial-scale=1',
    },
    scripts: [{ src: '/static/js/bundle.js', defer: true }],
  });

  try {
    // Write the head immediately
    res.write(head);

    // Create the React app with context
    const appElement = <App context={context} />;

    // Start streaming
    const stream = await createStreamingRenderer(appElement, {
      bootstrapScripts: ['/static/js/bundle.js'],

      onShellReady() {
        res.status(200);
        res.set({
          'Content-Type': 'text/html',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
        });
      },

      onError(error) {
        console.error('Streaming error:', error);
        // Inject error into HTML comment
        res.write(`<!-- Error: ${error.message} -->`);
      },
    });

    // Pipe the stream to response
    stream.pipe(res);

    // When streaming is done, write the tail
    stream.on('end', () => {
      res.write(tail);
      res.end();
    });
  } catch (error) {
    console.error('Fatal error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## Progressive Hydration Patterns

With streaming SSR, different parts of your app hydrate at different times. TypeScript helps manage this complexity.

### Hydration Boundary Component

```tsx
// components/HydrationBoundary.tsx
import { Suspense, lazy, ReactNode, ComponentType } from 'react';

interface HydrationBoundaryProps<T> {
  fallback: ReactNode;
  load: () => Promise<{ default: ComponentType<T> }>;
  props: T;
  priority?: 'high' | 'medium' | 'low';
}

export function HydrationBoundary<T extends object>({
  fallback,
  load,
  props,
  priority = 'medium',
}: HydrationBoundaryProps<T>) {
  // Lazy load with priority hints
  const Component = lazy(() => {
    if (priority === 'high') {
      return load();
    }

    // Defer lower priority components
    return new Promise((resolve) => {
      const timeout = priority === 'medium' ? 0 : 100;
      setTimeout(() => resolve(load()), timeout);
    });
  });

  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
}

// Usage with type safety
interface UserProfileProps {
  userId: string;
}

function Page() {
  return (
    <HydrationBoundary<UserProfileProps>
      fallback={<UserProfileSkeleton />}
      load={() => import('./UserProfile')}
      props={{ userId: '123' }}
      priority="high"
    />
  );
}
```

### Progressive Enhancement Types

```tsx
// types/progressive.ts
export interface ProgressiveComponentProps<T = {}> {
  // Server-side props (always available)
  serverProps: T;
  // Client-side props (available after hydration)
  clientProps?: Partial<T>;
  // Hydration state
  isHydrated: boolean;
}

// Hook for progressive enhancement
import { useEffect, useState } from 'react';

export function useProgressiveEnhancement<T>(serverValue: T, enhancedValue: () => T): T {
  const [value, setValue] = useState(serverValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    setValue(enhancedValue());
  }, []);

  return value;
}

// Progressive image component
interface ProgressiveImageProps {
  src: string;
  placeholder: string;
  alt: string;
  width?: number;
  height?: number;
}

export function ProgressiveImage({ src, placeholder, alt, width, height }: ProgressiveImageProps) {
  const imageSrc = useProgressiveEnhancement(placeholder, () => src);

  return (
    <img src={imageSrc} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
  );
}
```

## Streaming Data Patterns

Managing data fetching with streaming SSR requires careful typing to handle partial states.

### Streaming Data Fetcher

```tsx
// hooks/useStreamingData.ts
type StreamingState<T> =
  | { status: 'pending' }
  | { status: 'streaming'; data: Partial<T> }
  | { status: 'complete'; data: T }
  | { status: 'error'; error: Error };

export function useStreamingData<T>(streamPromise: Promise<ReadableStream<T>>): StreamingState<T> {
  const [state, setState] = useState<StreamingState<T>>({ status: 'pending' });

  useEffect(() => {
    let reader: ReadableStreamDefaultReader<T>;

    async function startStreaming() {
      try {
        const stream = await streamPromise;
        reader = stream.getReader();

        let accumulated: Partial<T> = {};

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            setState({ status: 'complete', data: accumulated as T });
            break;
          }

          accumulated = { ...accumulated, ...value };
          setState({ status: 'streaming', data: accumulated });
        }
      } catch (error) {
        setState({ status: 'error', error: error as Error });
      }
    }

    startStreaming();

    return () => {
      reader?.cancel();
    };
  }, [streamPromise]);

  return state;
}

// Type-safe streaming response
interface StreamingResponse<T> {
  stream(): ReadableStream<T>;
  json(): Promise<T>;
}

export async function fetchStreaming<T>(
  url: string,
  options?: RequestInit,
): Promise<StreamingResponse<T>> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Accept: 'application/x-ndjson',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return {
    stream(): ReadableStream<T> {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      return new ReadableStream<T>({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.close();
              break;
            }

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(Boolean);

            for (const line of lines) {
              try {
                const data = JSON.parse(line) as T;
                controller.enqueue(data);
              } catch (e) {
                console.error('Failed to parse streaming data:', e);
              }
            }
          }
        },
      });
    },

    async json(): Promise<T> {
      const text = await response.text();
      return JSON.parse(text);
    },
  };
}
```

### Server Components with Streaming

```tsx
// app/components/StreamingDataList.tsx
import { Suspense } from 'react';

interface DataItem {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// Server Component that streams data
async function StreamingDataList({ query }: { query: string }) {
  // This runs on the server and can stream data
  const dataStream = await fetchStreamingData(query);

  return (
    <div className="data-list">
      {await dataStream.map(async (chunk) => (
        <Suspense key={chunk.id} fallback={<ItemSkeleton />}>
          <DataItem data={await chunk} />
        </Suspense>
      ))}
    </div>
  );
}

// Individual item component
async function DataItem({ data }: { data: Promise<DataItem> }) {
  const item = await data;

  return (
    <article className="data-item">
      <h3>{item.title}</h3>
      <p>{item.content}</p>
      {item.metadata && (
        <dl className="metadata">
          {Object.entries(item.metadata).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

// Skeleton component for loading state
function ItemSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-title" />
      <div className="skeleton-content" />
    </div>
  );
}
```

## `Suspense` Boundaries and Error Handling

Streaming SSR requires careful error boundary placement and typing.

### Type-Safe Error Boundaries

```tsx
// components/StreamingErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isStreaming: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  streamingFallback?: ReactNode;
}

export class StreamingErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      isStreaming: typeof window === 'undefined',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    this.setState({ errorInfo });

    // Log to error reporting service
    if (typeof window !== 'undefined') {
      console.error('Client error:', error, errorInfo);
    } else {
      console.error('Server error:', error);
    }
  }

  componentDidMount() {
    this.setState({ isStreaming: false });
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // During streaming, show streaming fallback
      if (this.state.isStreaming && this.props.streamingFallback) {
        return this.props.streamingFallback;
      }

      // After hydration, show error UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error.stack}</pre>
          </details>
          <button onClick={this.retry}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error handling in streaming context
export function useStreamingError() {
  const [error, setError] = useState<Error | null>(null);

  const throwError = (error: Error) => {
    if (typeof window === 'undefined') {
      // On server, throw immediately for streaming error boundary
      throw error;
    } else {
      // On client, set state for graceful handling
      setError(error);
    }
  };

  return { error, throwError };
}
```

### Nested `Suspense` Patterns

```tsx
// components/NestedSuspense.tsx
interface SuspenseConfig {
  fallback: ReactNode;
  errorFallback?: ReactNode;
  priority?: number;
  timeout?: number;
}

interface NestedSuspenseProps {
  children: ReactNode;
  boundaries: SuspenseConfig[];
}

export function NestedSuspense({ children, boundaries }: NestedSuspenseProps) {
  return boundaries.reduceRight(
    (content, boundary) => (
      <StreamingErrorBoundary
        streamingFallback={boundary.errorFallback}
        fallback={(error, retry) => (
          <div className="error-fallback">
            <p>Failed to load this section</p>
            <button onClick={retry}>Retry</button>
          </div>
        )}
      >
        <Suspense fallback={boundary.fallback}>{content}</Suspense>
      </StreamingErrorBoundary>
    ),
    children,
  );
}

// Usage with typed configuration
function StreamingPage() {
  const suspenseBoundaries: SuspenseConfig[] = [
    {
      fallback: <HeaderSkeleton />,
      priority: 1,
    },
    {
      fallback: <ContentSkeleton />,
      errorFallback: <ContentError />,
      priority: 2,
    },
    {
      fallback: <FooterSkeleton />,
      priority: 3,
      timeout: 5000,
    },
  ];

  return (
    <NestedSuspense boundaries={suspenseBoundaries}>
      <Header />
      <MainContent />
      <Footer />
    </NestedSuspense>
  );
}
```

## Optimizing Streaming Performance

TypeScript can help optimize streaming performance through type-safe caching and prefetching.

### Streaming Cache

```tsx
// utils/streaming-cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  stream?: ReadableStream<T>;
}

interface CacheOptions {
  ttl?: number; // Time to live in ms
  maxSize?: number;
  streamable?: boolean;
}

export class StreamingCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(private options: CacheOptions = {}) {
    this.options.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.options.maxSize = options.maxSize ?? 100;
  }

  set(key: string, data: T, stream?: ReadableStream<T>): void {
    // Evict oldest if at capacity
    if (this.cache.size >= (this.options.maxSize ?? 100)) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      stream,
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > (this.options.ttl ?? 0)) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  getStream(key: string): ReadableStream<T> | undefined {
    const entry = this.cache.get(key);
    return entry?.stream;
  }

  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Hook for using cache in components
export function useStreamingCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions,
): { data: T | undefined; isLoading: boolean; error?: Error } {
  const cache = useMemo(() => new StreamingCache<T>(options), []);
  const [state, setState] = useState<{
    data: T | undefined;
    isLoading: boolean;
    error?: Error;
  }>({
    data: cache.get(key),
    isLoading: !cache.get(key),
  });

  useEffect(() => {
    if (!state.data) {
      fetcher()
        .then((data) => {
          cache.set(key, data);
          setState({ data, isLoading: false });
        })
        .catch((error) => {
          setState({ data: undefined, isLoading: false, error });
        });
    }
  }, [key]);

  return state;
}
```

### Prefetching Strategies

```tsx
// utils/prefetch.ts
interface PrefetchOptions {
  priority?: 'high' | 'low';
  threshold?: number; // Intersection observer threshold
  rootMargin?: string;
}

export function usePrefetch<T>(url: string, options: PrefetchOptions = {}): () => Promise<T> {
  const prefetchedRef = useRef<Promise<T>>();

  useEffect(() => {
    if (options.priority === 'high') {
      // Prefetch immediately for high priority
      prefetchedRef.current = fetch(url).then((r) => r.json());
    }
  }, [url, options.priority]);

  const prefetch = useCallback(() => {
    if (!prefetchedRef.current) {
      prefetchedRef.current = fetch(url).then((r) => r.json());
    }
    return prefetchedRef.current;
  }, [url]);

  return prefetch;
}

// Intersection observer for viewport-based prefetching
export function useViewportPrefetch(
  ref: RefObject<HTMLElement>,
  prefetchFn: () => void,
  options: PrefetchOptions = {},
) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            prefetchFn();
            observer.disconnect();
          }
        });
      },
      {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin ?? '50px',
      },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, prefetchFn, options]);
}

// Component with prefetching
function PrefetchableSection({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefetch = usePrefetch<SectionData>(`/api/sections/${id}`);

  useViewportPrefetch(ref, prefetch, {
    threshold: 0.5,
    rootMargin: '100px',
  });

  return (
    <div ref={ref}>
      <Suspense fallback={<SectionSkeleton />}>
        <SectionContent id={id} />
      </Suspense>
    </div>
  );
}
```

## Monitoring and Debugging

Track streaming performance with TypeScript-powered monitoring.

### Performance Metrics

```tsx
// utils/streaming-metrics.ts
interface StreamingMetrics {
  ttfb: number; // Time to first byte
  fcp: number; // First contentful paint
  lcp: number; // Largest contentful paint
  streamingDuration: number;
  chunksReceived: number;
  errors: Array<{ timestamp: number; error: Error }>;
}

export class StreamingMonitor {
  private metrics: StreamingMetrics = {
    ttfb: 0,
    fcp: 0,
    lcp: 0,
    streamingDuration: 0,
    chunksReceived: 0,
    errors: [],
  };

  private startTime = Date.now();

  recordTTFB(): void {
    this.metrics.ttfb = Date.now() - this.startTime;
  }

  recordChunk(): void {
    this.metrics.chunksReceived++;
  }

  recordError(error: Error): void {
    this.metrics.errors.push({
      timestamp: Date.now(),
      error,
    });
  }

  recordStreamingComplete(): void {
    this.metrics.streamingDuration = Date.now() - this.startTime;
  }

  getMetrics(): StreamingMetrics {
    return { ...this.metrics };
  }

  // Send metrics to analytics
  async reportMetrics(endpoint: string): Promise<void> {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.metrics),
      });
    } catch (error) {
      console.error('Failed to report metrics:', error);
    }
  }
}

// React hook for monitoring
export function useStreamingMonitor() {
  const monitor = useMemo(() => new StreamingMonitor(), []);

  useEffect(() => {
    // Monitor performance events
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            monitor.metrics.fcp = entry.startTime;
          }
        }
        if (entry.entryType === 'largest-contentful-paint') {
          monitor.metrics.lcp = entry.startTime;
        }
      }
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

    return () => observer.disconnect();
  }, [monitor]);

  return monitor;
}
```

## Production Deployment

Deploy streaming SSR with proper TypeScript configurations.

### Build Configuration

```typescript
// build.config.ts
interface BuildConfig {
  mode: 'development' | 'production';
  streaming: {
    enabled: boolean;
    timeout: number;
    maxChunkSize: number;
  };
  typescript: {
    strict: boolean;
    skipLibCheck: boolean;
  };
}

export const buildConfig: BuildConfig = {
  mode: process.env.NODE_ENV as 'development' | 'production',
  streaming: {
    enabled: true,
    timeout: 10000,
    maxChunkSize: 16 * 1024, // 16KB
  },
  typescript: {
    strict: true,
    skipLibCheck: true,
  },
};

// Webpack configuration for streaming
export const webpackConfig = {
  entry: './src/index.tsx',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Critical components for initial render
        critical: {
          test: /[\\/]src[\\/]components[\\/]critical[\\/]/,
          name: 'critical',
          priority: 30,
        },
        // Async components for streaming
        async: {
          test: /[\\/]src[\\/]components[\\/]async[\\/]/,
          name: 'async',
          priority: 20,
          reuseExistingChunk: true,
        },
        // Vendor bundle
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
        },
      },
    },
  },
};
```

### CDN and Edge Configuration

```tsx
// edge/streaming-handler.ts
interface EdgeConfig {
  cacheControl: string;
  streamingEnabled: boolean;
  compressionLevel: number;
}

export async function handleStreamingRequest(
  request: Request,
  config: EdgeConfig,
): Promise<Response> {
  const url = new URL(request.url);

  // Check if streaming is supported
  const acceptsStreaming = request.headers.get('accept')?.includes('text/html');

  if (!acceptsStreaming || !config.streamingEnabled) {
    // Fallback to traditional SSR
    return handleTraditionalSSR(request);
  }

  // Create streaming response
  const { readable, writable } = new TransformStream();
  const response = new Response(readable, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': config.cacheControl,
      'X-Streaming': 'true',
    },
  });

  // Start streaming in background
  streamResponse(request, writable).catch(console.error);

  return response;
}

async function streamResponse(request: Request, writable: WritableStream): Promise<void> {
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  try {
    // Write initial HTML
    await writer.write(encoder.encode('<!DOCTYPE html><html><head>'));

    // Stream head content
    const head = await generateHead(request);
    await writer.write(encoder.encode(head));

    // Start body
    await writer.write(encoder.encode('</head><body><div id="root">'));

    // Stream app content
    const appStream = await renderApp(request);
    const reader = appStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
    }

    // Close HTML
    await writer.write(encoder.encode('</div></body></html>'));
  } finally {
    await writer.close();
  }
}
```

## Wrapping Up

Streaming SSR with TypeScript transforms how users experience your React applications. By sending HTML as it's ready, you dramatically improve perceived performance while maintaining type safety across the entire stack. The patterns we've explored—from progressive hydration to streaming data fetchers—give you the tools to build applications that feel instant.

Remember: streaming SSR isn't just about speed, it's about user experience. Start with critical content, stream the rest, and use TypeScript to ensure everything stays type-safe from server to client. Your users will notice the difference, and your development team will appreciate the maintainability.
