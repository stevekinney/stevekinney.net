---
title: Priority Hints & Resource Loading
description: >-
  Master browser resource loading with priority hints, preconnect, dns-prefetch,
  and modern loading strategies
date: 2025-01-14T00:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
status: published
tags:
  - React
  - Performance
  - Resource Loading
  - Priority Hints
  - Network Optimization
---

Your React app loads. Eventually. First the HTML, then the CSS, then the JavaScript, then the fonts, then the images, then more JavaScript, then the API calls... By the time your user sees anything useful, they've already mentally composed their resignation letter to your app. The browser is doing its best, but it's guessing at what's important. What if you could tell it exactly what to prioritize?

Enter the world of resource hints and priority loading—your secret weapons for orchestrating the perfect loading symphony. These aren't just `<link>` tags you sprinkle around hoping for the best. They're precision instruments that, when used correctly, can cut your Time to Interactive in half.

Let's dive into how modern browsers load resources and how you can take control of that process to deliver lightning-fast React applications.

## Understanding Browser Resource Loading

Before we optimize, let's understand how browsers prioritize resources:

```typescript
interface BrowserPrioritySystem {
  critical: ['HTML', 'CSS in <head>', 'Fonts in use'];
  high: ['Scripts in <head>', 'Preload resources', 'XHR/Fetch'];
  medium: ['Scripts in <body>', 'Images in viewport'];
  low: ['Images below fold', 'Async scripts', 'Prefetch'];
  idle: ['Prerender', 'Speculative loads'];
}

// Browser's default loading waterfall
// 1. Parse HTML
// 2. Discover resources
// 3. Assign priorities
// 4. Fetch based on priority and connection limits
// 5. Execute/render as resources arrive
```

## Priority Hints with fetchpriority

The `fetchpriority` attribute lets you override the browser's default priorities:

```typescript
// ❌ Browser guesses importance
const UnoptimizedHero: React.FC = () => {
  return (
    <div>
      <img src="/hero.jpg" alt="Hero" />
      <img src="/thumbnail1.jpg" alt="Thumb 1" />
      <img src="/thumbnail2.jpg" alt="Thumb 2" />
    </div>
  );
};

// ✅ Explicit priority hints
const OptimizedHero: React.FC = () => {
  return (
    <div>
      <img
        src="/hero.jpg"
        alt="Hero"
        fetchpriority="high"  // Load this first!
      />
      <img
        src="/thumbnail1.jpg"
        alt="Thumb 1"
        fetchpriority="low"   // Load after critical content
      />
      <img
        src="/thumbnail2.jpg"
        alt="Thumb 2"
        fetchpriority="low"
      />
    </div>
  );
};
```

### Dynamic Priority Management

Adjust priorities based on user behavior:

```typescript
const useDynamicPriority = () => {
  const [priority, setPriority] = useState<'high' | 'low' | 'auto'>('auto');

  useEffect(() => {
    // Detect slow connection
    const connection = (navigator as any).connection;
    if (connection?.effectiveType === '2g' || connection?.saveData) {
      setPriority('low');
      return;
    }

    // High priority for fast connections
    if (connection?.effectiveType === '4g') {
      setPriority('high');
    }
  }, []);

  return priority;
};

const AdaptiveImage: React.FC<{ src: string; critical?: boolean }> = ({
  src,
  critical = false
}) => {
  const priority = useDynamicPriority();

  return (
    <img
      src={src}
      fetchpriority={critical ? 'high' : priority}
      loading={critical ? 'eager' : 'lazy'}
    />
  );
};
```

## Preload Critical Resources

Tell the browser about critical resources before it discovers them naturally. For React 19's new resource preloading APIs (`preload`, `preinit`, `prefetchDNS`), see [resource-preloading-apis.md](./resource-preloading-apis.md).

```typescript
// React component for managing preloads
const ResourcePreloader: React.FC = () => {
  useEffect(() => {
    // Preload critical font
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.as = 'font';
    fontLink.type = 'font/woff2';
    fontLink.href = '/fonts/main.woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);

    // Preload critical CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'preload';
    cssLink.as = 'style';
    cssLink.href = '/critical.css';
    cssLink.onload = function () {
      this.rel = 'stylesheet';
    };
    document.head.appendChild(cssLink);

    // Preload hero image
    const imgLink = document.createElement('link');
    imgLink.rel = 'preload';
    imgLink.as = 'image';
    imgLink.href = '/hero.webp';
    imgLink.fetchpriority = 'high';
    document.head.appendChild(imgLink);

    return () => {
      // Cleanup if needed
    };
  }, []);

  return null;
};
```

### Smart Preloading Based on Routes

Preload resources for likely next navigation:

```typescript
const useRoutePreloader = () => {
  const location = useLocation();

  useEffect(() => {
    // Preload resources for likely next routes
    const preloadMap: Record<string, string[]> = {
      '/': ['/api/featured', '/images/hero.webp'],
      '/products': ['/api/products', '/js/product-gallery.js'],
      '/checkout': ['/api/cart', '/js/payment-processor.js'],
    };

    const currentPath = location.pathname;
    const resourcesToPreload = preloadMap[currentPath] || [];

    resourcesToPreload.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;

      // Determine resource type
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.includes('/api/')) {
        link.as = 'fetch';
      } else if (resource.match(/\.(webp|jpg|png)$/)) {
        link.as = 'image';
      }

      document.head.appendChild(link);
    });
  }, [location]);
};
```

## DNS Prefetch and Preconnect

Establish connections early to reduce latency:

```typescript
const ConnectionOptimizer: React.FC = () => {
  useEffect(() => {
    const connections = [
      { href: 'https://api.example.com', type: 'preconnect' },
      { href: 'https://cdn.example.com', type: 'preconnect' },
      { href: 'https://analytics.example.com', type: 'dns-prefetch' },
      { href: 'https://fonts.googleapis.com', type: 'preconnect' },
    ];

    connections.forEach(({ href, type }) => {
      const link = document.createElement('link');
      link.rel = type;
      link.href = href;

      if (type === 'preconnect') {
        link.crossOrigin = 'anonymous';
      }

      document.head.appendChild(link);
    });
  }, []);

  return null;
};
```

### Intelligent Connection Management

Only preconnect to domains you'll actually use:

```typescript
class ConnectionManager {
  private connected = new Set<string>();
  private pending = new Map<string, number>();
  private maxConnections = 6; // Browser limit

  preconnect(origin: string, priority: number = 0) {
    if (this.connected.has(origin)) return;

    this.pending.set(origin, priority);
    this.processPending();
  }

  private processPending() {
    if (this.connected.size >= this.maxConnections) return;

    // Sort by priority
    const sorted = Array.from(this.pending.entries()).sort((a, b) => b[1] - a[1]);

    const [origin] = sorted[0] || [];
    if (!origin) return;

    this.pending.delete(origin);
    this.connected.add(origin);

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Track connection lifecycle
    setTimeout(() => {
      this.connected.delete(origin);
      this.processPending();
    }, 10000); // Connections typically timeout after 10s
  }
}

const useConnectionManager = () => {
  const managerRef = useRef(new ConnectionManager());

  const preconnect = useCallback((url: string, priority?: number) => {
    const origin = new URL(url).origin;
    managerRef.current.preconnect(origin, priority);
  }, []);

  return { preconnect };
};
```

## Prefetch for Future Navigation

Load resources for likely future navigation:

```typescript
// ❌ No prefetching
const BasicLink: React.FC<{ href: string }> = ({ href, children }) => {
  return <Link to={href}>{children}</Link>;
};

// ✅ Smart prefetching on hover/focus
const SmartLink: React.FC<{ href: string }> = ({ href, children }) => {
  const [prefetched, setPrefetched] = useState(false);

  const prefetch = useCallback(() => {
    if (prefetched) return;

    // Prefetch the route's bundle
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/js/${href.slice(1)}.bundle.js`;
    link.as = 'script';
    document.head.appendChild(link);

    // Prefetch route data
    fetch(`/api/preload${href}`, {
      method: 'HEAD',
      priority: 'low'
    });

    setPrefetched(true);
  }, [href, prefetched]);

  return (
    <Link
      to={href}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
    >
      {children}
    </Link>
  );
};
```

### Intersection Observer Prefetching

Prefetch when links become visible:

```typescript
const usePrefetchOnVisible = (enabled: boolean = true) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const prefetchedUrls = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.href;

            if (!prefetchedUrls.current.has(href)) {
              prefetchedUrls.current.add(href);

              // Prefetch the page
              const prefetchLink = document.createElement('link');
              prefetchLink.rel = 'prefetch';
              prefetchLink.href = href;
              prefetchLink.as = 'document';
              document.head.appendChild(prefetchLink);

              // Stop observing
              observerRef.current?.unobserve(link);
            }
          }
        });
      },
      { rootMargin: '50px' },
    );

    // Observe all links
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      observerRef.current?.observe(link);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [enabled]);
};
```

## Prerender for Instant Navigation

Prerender entire pages for instant navigation:

```typescript
const usePrerenderPrediction = () => {
  const [prerendering, setPrerendering] = useState<string | null>(null);

  const predictNextPage = useCallback(() => {
    // Use analytics or ML to predict next page
    const predictions = analyzeUserBehavior();
    const mostLikely = predictions[0];

    if (mostLikely && mostLikely.probability > 0.7) {
      prerenderPage(mostLikely.url);
      setPrerendering(mostLikely.url);
    }
  }, []);

  const prerenderPage = (url: string) => {
    // Check if Speculation Rules API is supported
    if (HTMLScriptElement.supports?.('speculationrules')) {
      const script = document.createElement('script');
      script.type = 'speculationrules';
      script.textContent = JSON.stringify({
        prerender: [
          {
            source: 'list',
            urls: [url],
          },
        ],
      });
      document.head.appendChild(script);
    } else {
      // Fallback to prefetch
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      link.as = 'document';
      document.head.appendChild(link);
    }
  };

  return { predictNextPage, prerendering };
};
```

## Module Preloading for Code Splitting

Optimize code-split bundles with modulepreload:

```typescript
const ModulePreloader: React.FC = () => {
  useEffect(() => {
    // Preload critical modules
    const modules = ['/js/vendor.chunk.js', '/js/framework.chunk.js', '/js/main.chunk.js'];

    modules.forEach((module) => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = module;
      link.as = 'script';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, []);

  return null;
};

// Webpack configuration for modulepreload
const webpackConfig = {
  output: {
    crossOriginLoading: 'anonymous',
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
        },
        framework: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'framework',
          priority: 20,
        },
      },
    },
  },
};
```

## Resource Timing API Integration

Monitor the impact of your resource hints:

```typescript
class ResourceTimingMonitor {
  private metrics: Map<string, PerformanceResourceTiming> = new Map();

  startMonitoring() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          this.metrics.set(resource.name, resource);
          this.analyzeResource(resource);
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private analyzeResource(resource: PerformanceResourceTiming) {
    const metrics = {
      dns: resource.domainLookupEnd - resource.domainLookupStart,
      tcp: resource.connectEnd - resource.connectStart,
      ttfb: resource.responseStart - resource.fetchStart,
      download: resource.responseEnd - resource.responseStart,
      total: resource.responseEnd - resource.fetchStart,
    };

    // Check if preconnect helped
    if (metrics.dns === 0 && metrics.tcp === 0) {
      console.log(`✅ Preconnect worked for ${new URL(resource.name).origin}`);
    }

    // Check if resource was cached
    if (resource.transferSize === 0 && resource.decodedBodySize > 0) {
      console.log(`✅ Resource cached: ${resource.name}`);
    }

    // Alert on slow resources
    if (metrics.total > 1000) {
      console.warn(`⚠️ Slow resource: ${resource.name} took ${metrics.total}ms`);
    }
  }

  getMetrics() {
    return Array.from(this.metrics.values()).map((r) => ({
      name: r.name,
      duration: r.duration,
      size: r.transferSize,
      cached: r.transferSize === 0 && r.decodedBodySize > 0,
      protocol: r.nextHopProtocol,
    }));
  }
}
```

## Adaptive Loading Strategy

Adjust loading strategy based on device and network:

```typescript
const useAdaptiveLoading = () => {
  const [strategy, setStrategy] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');

  useEffect(() => {
    const connection = (navigator as any).connection;
    const memory = (performance as any).memory;

    // Determine strategy based on conditions
    const determineStrategy = () => {
      // Check network
      if (connection?.saveData) {
        return 'conservative';
      }

      if (connection?.effectiveType === '4g' && connection?.rtt < 50) {
        return 'aggressive';
      }

      // Check memory
      if (memory?.usedJSHeapSize / memory?.jsHeapSizeLimit > 0.9) {
        return 'conservative';
      }

      return 'balanced';
    };

    setStrategy(determineStrategy());

    // Listen for changes
    connection?.addEventListener('change', () => {
      setStrategy(determineStrategy());
    });
  }, []);

  return strategy;
};

const AdaptiveResourceLoader: React.FC = () => {
  const strategy = useAdaptiveLoading();

  const getResourceHints = () => {
    switch (strategy) {
      case 'aggressive':
        return {
          preconnect: ['api', 'cdn', 'analytics', 'fonts'],
          preload: ['critical.css', 'main.js', 'hero.webp'],
          prefetch: ['next-page.html', 'next-bundle.js'],
          modulepreload: true
        };

      case 'conservative':
        return {
          preconnect: ['api'],
          preload: ['critical.css'],
          prefetch: [],
          modulepreload: false
        };

      default:
        return {
          preconnect: ['api', 'cdn'],
          preload: ['critical.css', 'main.js'],
          prefetch: ['next-page.html'],
          modulepreload: true
        };
    }
  };

  const hints = getResourceHints();

  return (
    <>
      {hints.preconnect.map(domain => (
        <link key={domain} rel="preconnect" href={`https://${domain}.example.com`} />
      ))}
      {hints.preload.map(resource => (
        <link key={resource} rel="preload" href={`/${resource}`} as={getResourceType(resource)} />
      ))}
    </>
  );
};
```

## Best Practices Checklist

✅ **Use fetchpriority wisely:**

- High for LCP images and critical resources
- Low for below-fold content
- Auto for everything else

✅ **Preload critical resources:**

- Fonts used above the fold
- Critical CSS
- Hero images
- Important API calls

✅ **Preconnect to origins:**

- API servers
- CDN domains
- Third-party critical services
- Limit to 2-3 domains

✅ **Prefetch intelligently:**

- Next likely navigation
- Resources visible in viewport
- Based on user behavior patterns

✅ **Monitor impact:**

- Use Resource Timing API
- Track Core Web Vitals
- Measure actual vs expected improvement

✅ **Adapt to conditions:**

- Respect Save-Data header
- Adjust for slow connections
- Consider device memory

