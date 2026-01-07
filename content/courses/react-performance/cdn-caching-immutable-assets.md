---
title: CDN Caching & Immutable Assets
description: >-
  Optimize React app delivery with CDN caching strategies, immutable
  deployments, and hashed chunking patterns
date: 2025-01-14T00:00:00.000Z
modified: '2025-09-30T21:02:22-05:00'
status: published
tags:
  - React
  - Performance
  - CDN
  - Caching
  - Build Optimization
---

Your React app's bundle is perfect. Tree-shaken, code-split, minified to perfection. Then you deploy it, and users around the world wait 3 seconds for it to download from your single origin server in Virginia. Meanwhile, your CDN edge servers sit idle, serving stale content because you're afraid of cache invalidation bugs.

Here's the truth: most React apps use maybe 10% of their CDN's capabilities. They treat it like a dumb file server instead of the intelligent, globally distributed caching layer it really is. They break caching with poor versioning strategies. They serve the same assets to everyone instead of optimizing for each user's location and device.

Let's fix that. Let's turn your CDN into a performance multiplier that serves immutable assets at light speed while keeping your deployments simple and your cache hit rates high.

## Understanding CDN Caching Fundamentals

Before we optimize, let's understand how CDNs cache your React app:

```typescript
interface CDNCacheHierarchy {
  browser: {
    cache: 'Local storage, memory, disk';
    duration: 'Hours to days';
  };
  edge: {
    cache: 'CDN edge servers near user';
    duration: 'Minutes to months';
  };
  shield: {
    cache: 'Regional CDN cache';
    duration: 'Hours to months';
  };
  origin: {
    cache: 'Your application server';
    duration: 'Source of truth';
  };
}

// Cache headers control behavior at each level
interface CacheHeaders {
  'Cache-Control': string;
  ETag: string;
  'Last-Modified': string;
  Vary: string;
  'Surrogate-Control'?: string; // CDN-specific
}
```

## Implementing Immutable Asset Strategy

Immutable assets + content hashing = perfect caching:

```typescript
// Webpack configuration for immutable assets
const webpackConfig = {
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
  },
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
        },
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react',
          priority: 20,
        },
      },
    },
  },
};

// Server configuration for immutable caching
const serveImmutableAssets = (app: Express) => {
  // Immutable assets - cache forever
  app.use('/static', (req, res, next) => {
    const isHashed = /\.[0-9a-f]{8}\./i.test(req.url);

    if (isHashed) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    } else {
      // Non-hashed assets - shorter cache
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }

    next();
  });

  // HTML files - never cache
  app.use('*.html', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });
};
```

## Advanced Chunking Strategies

Optimize chunk splitting for maximum cache efficiency:

```typescript
// ❌ Poor chunking - everything changes together
const badChunking = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        default: {
          minChunks: 2,
          reuseExistingChunk: true,
        },
      },
    },
  },
};

// ✅ Smart chunking - maximize cache hits
const smartChunking = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      maxAsyncRequests: 25,
      cacheGroups: {
        // Framework - rarely changes
        framework: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'framework',
          priority: 40,
          enforce: true,
        },
        // Libraries - changes occasionally
        libs: {
          test(module: any) {
            return module.size() > 50000 && /node_modules/.test(module.identifier());
          },
          name(module: any) {
            const hash = crypto.createHash('md5').update(module.identifier()).digest('hex');
            return `libs.${hash.substring(0, 8)}`;
          },
          priority: 30,
          minChunks: 1,
        },
        // Shared components - changes frequently
        commons: {
          name: 'commons',
          minChunks: 2,
          priority: 20,
        },
        // Async chunks
        async: {
          test: /[\\/]src[\\/]pages[\\/]/,
          chunks: 'async',
          name(module: any, chunks: any) {
            return chunks[0].name;
          },
          priority: 10,
        },
      },
    },
  },
};
```

## CDN Configuration Patterns

### Multi-Tier Caching Strategy

```typescript
class CDNCacheStrategy {
  private rules: Map<string, CacheRule> = new Map();

  constructor() {
    // Define caching rules by asset type
    this.rules.set('js', {
      pattern: /\.[0-9a-f]{8}\.js$/,
      cacheControl: 'public, max-age=31536000, immutable',
      cdnCache: 'max-age=31536000',
      browserCache: 'max-age=31536000',
    });

    this.rules.set('css', {
      pattern: /\.[0-9a-f]{8}\.css$/,
      cacheControl: 'public, max-age=31536000, immutable',
      cdnCache: 'max-age=31536000',
      browserCache: 'max-age=31536000',
    });

    this.rules.set('images', {
      pattern: /\.(jpg|jpeg|png|webp|avif)$/,
      cacheControl: 'public, max-age=86400, stale-while-revalidate=604800',
      cdnCache: 'max-age=2592000',
      browserCache: 'max-age=86400',
    });

    this.rules.set('fonts', {
      pattern: /\.(woff|woff2|ttf|otf)$/,
      cacheControl: 'public, max-age=31536000, immutable',
      cdnCache: 'max-age=31536000',
      browserCache: 'max-age=31536000',
    });

    this.rules.set('api', {
      pattern: /^\/api\//,
      cacheControl: 'private, no-cache',
      cdnCache: 'no-store',
      browserCache: 'no-store',
    });
  }

  getHeaders(path: string): Headers {
    for (const [_, rule] of this.rules) {
      if (rule.pattern.test(path)) {
        return {
          'Cache-Control': rule.cacheControl,
          'Surrogate-Control': rule.cdnCache,
          'CDN-Cache-Control': rule.cdnCache,
          'Cloudflare-CDN-Cache-Control': rule.cdnCache,
        };
      }
    }

    // Default fallback
    return {
      'Cache-Control': 'public, max-age=0, must-revalidate',
    };
  }
}

interface CacheRule {
  pattern: RegExp;
  cacheControl: string;
  cdnCache: string;
  browserCache: string;
}

interface Headers {
  [key: string]: string;
}
```

### Edge Function Cache Management

Use edge functions for intelligent caching:

```typescript
// Cloudflare Worker example
const edgeCacheHandler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;

  // Check cache
  let response = await cache.match(cacheKey);

  if (response) {
    // Add cache hit header
    response = new Response(response.body, response);
    response.headers.set('X-Cache', 'HIT');
    response.headers.set('X-Cache-Age', getAge(response));
    return response;
  }

  // Cache miss - fetch from origin
  response = await fetch(request);

  // Cache based on content type
  const contentType = response.headers.get('content-type') || '';
  const shouldCache = shouldCacheResponse(url.pathname, contentType, response.status);

  if (shouldCache) {
    // Clone response for caching
    const responseToCache = response.clone();

    // Add cache headers
    const headers = new Headers(responseToCache.headers);
    headers.set('X-Cache', 'MISS');
    headers.set('X-Cache-Time', new Date().toISOString());

    // Store in cache
    await cache.put(
      cacheKey,
      new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      }),
    );
  }

  return response;
};

const shouldCacheResponse = (path: string, contentType: string, status: number): boolean => {
  // Only cache successful responses
  if (status !== 200) return false;

  // Cache static assets
  if (/\.(js|css|jpg|jpeg|png|webp|woff2?)$/.test(path)) {
    return true;
  }

  // Cache JSON API responses conditionally
  if (contentType.includes('application/json')) {
    return path.includes('/api/public/');
  }

  return false;
};
```

## Cache Invalidation Strategies

### Smart Purging with Surrogate Keys

```typescript
class SurrogateKeyManager {
  private keyMap = new Map<string, Set<string>>();

  // Tag resources with surrogate keys
  tagResource(resource: string, keys: string[]) {
    keys.forEach(key => {
      if (!this.keyMap.has(key)) {
        this.keyMap.set(key, new Set());
      }
      this.keyMap.get(key)!.add(resource);
    });
  }

  // Get all resources for a key
  getResourcesByKey(key: string): string[] {
    return Array.from(this.keyMap.get(key) || []);
  }

  // Generate surrogate key header
  generateHeader(keys: string[]): string {
    return keys.join(' ');
  }

  // Purge by surrogate key
  async purgeByKey(key: string, cdnApi: CDNApi) {
    await cdnApi.purge({
      surrogateKey: key
    });

    // Clean up local map
    this.keyMap.delete(key);
  }
}

// React component with surrogate keys
const ProductPage: React.FC<{ productId: string }> = ({ productId }) => {
  useEffect(() => {
    // Set surrogate keys for this page
    const keys = [
      `product-${productId}`,
      'product-page',
      `category-${getCategoryId(productId)}`
    ];

    // Send keys to CDN
    fetch('/api/cdn/tag', {
      method: 'POST',
      body: JSON.stringify({
        url: window.location.href,
        keys
      })
    });
  }, [productId]);

  return <ProductDetails id={productId} />;
};

// Server-side implementation
app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  const product = getProduct(productId);

  // Set surrogate keys
  res.setHeader('Surrogate-Key', `product-${productId} products category-${product.category}`);
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

  res.json(product);
});
```

### Progressive Cache Warming

Warm cache after deployments:

```typescript
class CacheWarmer {
  private urls: Set<string> = new Set();
  private concurrency = 5;

  async warmCache(manifest: BuildManifest) {
    // Collect all URLs to warm
    this.collectUrls(manifest);

    // Warm in batches
    const urlArray = Array.from(this.urls);
    const results = [];

    for (let i = 0; i < urlArray.length; i += this.concurrency) {
      const batch = urlArray.slice(i, i + this.concurrency);
      const promises = batch.map((url) => this.warmUrl(url));
      results.push(...(await Promise.allSettled(promises)));
    }

    return this.analyzeResults(results);
  }

  private collectUrls(manifest: BuildManifest) {
    // Critical assets
    manifest.criticalAssets.forEach((asset) => {
      this.urls.add(asset.url);
    });

    // Route bundles
    manifest.routes.forEach((route) => {
      this.urls.add(route.bundleUrl);
      route.chunks.forEach((chunk) => this.urls.add(chunk));
    });

    // Preload assets
    manifest.preloadAssets.forEach((asset) => {
      this.urls.add(asset);
    });
  }

  private async warmUrl(url: string): Promise<WarmResult> {
    const start = Date.now();

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'X-Cache-Warmer': 'true',
        },
      });

      return {
        url,
        success: response.ok,
        duration: Date.now() - start,
        cacheStatus: response.headers.get('X-Cache') || 'unknown',
      };
    } catch (error) {
      return {
        url,
        success: false,
        duration: Date.now() - start,
        error: error.message,
      };
    }
  }

  private analyzeResults(results: PromiseSettledResult<WarmResult>[]) {
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter((r) => r.status === 'rejected' || !r.value?.success);

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      averageDuration: successful.reduce((acc, r) => acc + r.value.duration, 0) / successful.length,
    };
  }
}

interface BuildManifest {
  criticalAssets: Array<{ url: string; type: string }>;
  routes: Array<{ path: string; bundleUrl: string; chunks: string[] }>;
  preloadAssets: string[];
}

interface WarmResult {
  url: string;
  success: boolean;
  duration: number;
  cacheStatus?: string;
  error?: string;
}
```

## Monitoring CDN Performance

Track cache performance and optimize:

```typescript
class CDNMetricsCollector {
  private metrics: CDNMetrics = {
    hitRate: 0,
    bandwidthSaved: 0,
    originRequests: 0,
    edgeRequests: 0,
    averageLatency: 0,
  };

  collectFromHeaders(headers: Headers) {
    const cacheStatus = headers.get('X-Cache');
    const servedBy = headers.get('X-Served-By');
    const cacheHits = parseInt(headers.get('X-Cache-Hits') || '0');

    if (cacheStatus === 'HIT') {
      this.metrics.edgeRequests++;
    } else {
      this.metrics.originRequests++;
    }

    this.calculateHitRate();
  }

  private calculateHitRate() {
    const total = this.metrics.edgeRequests + this.metrics.originRequests;
    if (total > 0) {
      this.metrics.hitRate = this.metrics.edgeRequests / total;
    }
  }

  async reportMetrics() {
    // Send to monitoring service
    await fetch('/api/metrics/cdn', {
      method: 'POST',
      body: JSON.stringify({
        ...this.metrics,
        timestamp: Date.now(),
      }),
    });

    // Alert on low hit rate
    if (this.metrics.hitRate < 0.8 && this.metrics.edgeRequests > 100) {
      console.warn(`Low CDN hit rate: ${(this.metrics.hitRate * 100).toFixed(2)}%`);
    }
  }
}

interface CDNMetrics {
  hitRate: number;
  bandwidthSaved: number;
  originRequests: number;
  edgeRequests: number;
  averageLatency: number;
}

// React hook for monitoring
const useCDNMetrics = () => {
  const collectorRef = useRef(new CDNMetricsCollector());

  useEffect(() => {
    // Intercept fetch to collect metrics
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      collectorRef.current.collectFromHeaders(response.headers);
      return response;
    };

    // Report metrics periodically
    const interval = setInterval(() => {
      collectorRef.current.reportMetrics();
    }, 30000);

    return () => {
      window.fetch = originalFetch;
      clearInterval(interval);
    };
  }, []);

  return collectorRef.current;
};
```

## Geographic Distribution Optimization

Optimize asset delivery based on user location:

```typescript
class GeoCDNOptimizer {
  private edgeLocations = new Map<string, EdgeLocation>();

  async optimizeForUser(userIp: string): Promise<CDNConfig> {
    const userLocation = await this.getUserLocation(userIp);
    const nearestEdge = this.findNearestEdge(userLocation);

    return {
      primaryCDN: nearestEdge.url,
      fallbackCDN: this.getFallbackEdge(nearestEdge).url,
      preloadEdges: this.getPreloadEdges(userLocation),
      cacheStrategy: this.determineStrategy(userLocation),
    };
  }

  private findNearestEdge(location: GeoLocation): EdgeLocation {
    let nearest: EdgeLocation | null = null;
    let minDistance = Infinity;

    for (const edge of this.edgeLocations.values()) {
      const distance = this.calculateDistance(location, edge.location);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = edge;
      }
    }

    return nearest || this.getDefaultEdge();
  }

  private determineStrategy(location: GeoLocation): CacheStrategy {
    // Adjust strategy based on region
    const region = this.getRegion(location);

    switch (region) {
      case 'asia-pacific':
        // Higher cache times due to distance from origin
        return {
          edgeTTL: 86400,
          browserTTL: 7200,
          staleWhileRevalidate: 604800,
        };

      case 'europe':
        return {
          edgeTTL: 43200,
          browserTTL: 3600,
          staleWhileRevalidate: 86400,
        };

      default:
        return {
          edgeTTL: 21600,
          browserTTL: 1800,
          staleWhileRevalidate: 43200,
        };
    }
  }
}

interface EdgeLocation {
  id: string;
  url: string;
  location: GeoLocation;
  capacity: number;
  latency: number;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  country: string;
  region: string;
}

interface CDNConfig {
  primaryCDN: string;
  fallbackCDN: string;
  preloadEdges: string[];
  cacheStrategy: CacheStrategy;
}

interface CacheStrategy {
  edgeTTL: number;
  browserTTL: number;
  staleWhileRevalidate: number;
}
```

## Version Migration Strategies

Handle version transitions smoothly:

```typescript
class VersionMigrationManager {
  private currentVersion: string;
  private newVersion: string | null = null;

  async deployNewVersion(version: string) {
    this.newVersion = version;

    // Stage 1: Deploy to CDN without switching
    await this.deployToCDN(version);

    // Stage 2: Warm cache
    await this.warmNewVersion(version);

    // Stage 3: Gradual rollout
    await this.gradualRollout(version);

    // Stage 4: Complete migration
    await this.completeMigration(version);
  }

  private async gradualRollout(version: string) {
    const stages = [1, 5, 10, 25, 50, 100]; // Percentage of traffic

    for (const percentage of stages) {
      await this.updateTrafficSplit(version, percentage);

      // Monitor for issues
      const healthy = await this.monitorHealth(version, percentage);

      if (!healthy) {
        await this.rollback();
        throw new Error(`Rollout failed at ${percentage}%`);
      }

      // Wait before next stage
      await this.wait(300000); // 5 minutes
    }
  }

  private async updateTrafficSplit(version: string, percentage: number) {
    // Update CDN configuration
    await fetch('/api/cdn/traffic-split', {
      method: 'POST',
      body: JSON.stringify({
        rules: [
          {
            version: this.currentVersion,
            weight: 100 - percentage,
          },
          {
            version: version,
            weight: percentage,
          },
        ],
      }),
    });
  }

  private async monitorHealth(version: string, percentage: number): Promise<boolean> {
    const metrics = await this.getMetrics(version);

    return metrics.errorRate < 0.01 && metrics.latency < 1000 && metrics.cacheHitRate > 0.8;
  }
}
```

## Best Practices Checklist

✅ **Implement immutable assets:**

- Use content hashing for all static files
- Set immutable cache headers
- Never update files in place

✅ **Optimize chunking:**

- Separate vendor from app code
- Create framework-specific chunks
- Use deterministic module IDs

✅ **Configure CDN properly:**

- Set appropriate cache headers
- Use surrogate keys for invalidation
- Implement stale-while-revalidate

✅ **Monitor performance:**

- Track cache hit rates
- Measure origin offload
- Monitor geographic distribution

✅ **Handle deployments gracefully:**

- Warm cache before switching
- Use gradual rollouts
- Maintain old versions temporarily
