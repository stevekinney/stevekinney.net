---
title: Speculation Rules & bfcache Optimization
description: >-
  Implement instant navigation with Speculation Rules API and optimize for
  back/forward cache in React applications
date: 2025-01-14T00:00:00.000Z
modified: '2025-09-20T10:39:54-06:00'
status: published
tags:
  - React
  - Performance
  - Speculation Rules
  - bfcache
  - Navigation
---

You click a link. The page loads instantly. You hit the back button. The previous page appears immediately, exactly as you left it. No spinners, no re-rendering, no waiting. This isn't magic—it's what happens when you properly leverage the Speculation Rules API and the back/forward cache (bfcache).

Most React apps break these powerful browser features without even knowing it. They prevent bfcache with careless event listeners. They ignore speculation rules that could prerender entire pages. They treat navigation like it's 2010, making users wait for every single page transition.

Let's fix that. Let's build React apps that navigate so fast, users think they're using a native app.

## Understanding Speculation Rules API

The Speculation Rules API lets you tell the browser which pages to prerender or prefetch:

```typescript
interface SpeculationRules {
  prerender?: Rule[];
  prefetch?: Rule[];
}

interface Rule {
  source: 'list' | 'document';
  urls?: string[];
  where?: DocumentRule;
  eagerness?: 'immediate' | 'eager' | 'moderate' | 'conservative';
  requires?: string[];
}

// Basic implementation
const addSpeculationRules = (rules: SpeculationRules) => {
  if (!HTMLScriptElement.supports?.('speculationrules')) {
    console.warn('Speculation Rules API not supported');
    return;
  }

  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify(rules);
  document.head.appendChild(script);
};
```

## Implementing Smart Speculation

### Static Speculation Rules

Define rules for common navigation patterns:

```typescript
const StaticSpeculation: React.FC = () => {
  useEffect(() => {
    // Only add rules if API is supported
    if (!HTMLScriptElement.supports?.('speculationrules')) {
      return;
    }

    const rules = {
      prerender: [
        {
          source: 'list',
          urls: ['/dashboard', '/profile'],
          eagerness: 'moderate',
        },
      ],
      prefetch: [
        {
          source: 'document',
          where: {
            and: [
              { href_matches: '/*' },
              { not: { href_matches: '/logout' } },
              { not: { href_matches: '/api/*' } },
            ],
          },
          eagerness: 'conservative',
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'speculationrules';
    script.textContent = JSON.stringify(rules);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
};
```

### Dynamic Speculation Based on User Behavior

Predict and prerender based on user patterns:

```typescript
class NavigationPredictor {
  private history: string[] = [];
  private patterns: Map<string, Map<string, number>> = new Map();

  recordNavigation(from: string, to: string) {
    this.history.push(to);
    if (this.history.length > 100) {
      this.history.shift();
    }

    // Update patterns
    if (!this.patterns.has(from)) {
      this.patterns.set(from, new Map());
    }

    const destinations = this.patterns.get(from)!;
    destinations.set(to, (destinations.get(to) || 0) + 1);
  }

  predictNext(currentPage: string, threshold: number = 0.3): string[] {
    const destinations = this.patterns.get(currentPage);
    if (!destinations) return [];

    const total = Array.from(destinations.values()).reduce((a, b) => a + b, 0);
    const predictions: Array<[string, number]> = [];

    for (const [url, count] of destinations) {
      const probability = count / total;
      if (probability >= threshold) {
        predictions.push([url, probability]);
      }
    }

    return predictions.sort((a, b) => b[1] - a[1]).map(([url]) => url);
  }
}

const usePredictiveSpeculation = () => {
  const location = useLocation();
  const predictorRef = useRef(new NavigationPredictor());
  const [speculating, setSpeculating] = useState<string[]>([]);

  useEffect(() => {
    const predictor = predictorRef.current;
    const currentPath = location.pathname;

    // Record navigation
    const previousPath = sessionStorage.getItem('previousPath');
    if (previousPath) {
      predictor.recordNavigation(previousPath, currentPath);
    }
    sessionStorage.setItem('previousPath', currentPath);

    // Predict next pages
    const predictions = predictor.predictNext(currentPath);

    if (predictions.length > 0 && HTMLScriptElement.supports?.('speculationrules')) {
      // Remove old speculation rules
      document.querySelectorAll('script[type="speculationrules"]').forEach((s) => s.remove());

      // Add new rules
      const script = document.createElement('script');
      script.type = 'speculationrules';
      script.textContent = JSON.stringify({
        prerender: [
          {
            source: 'list',
            urls: predictions.slice(0, 2), // Prerender top 2 predictions
            eagerness: 'moderate',
          },
        ],
        prefetch: [
          {
            source: 'list',
            urls: predictions.slice(2, 5), // Prefetch next 3
            eagerness: 'conservative',
          },
        ],
      });
      document.head.appendChild(script);

      setSpeculating(predictions);
    }
  }, [location]);

  return { speculating };
};
```

## Back/Forward Cache (bfcache) Optimization

The bfcache stores complete page snapshots for instant back/forward navigation:

### Understanding bfcache Blockers

```typescript
// ❌ Common bfcache blockers
const BfcacheBlocker: React.FC = () => {
  useEffect(() => {
    // Unload event blocks bfcache
    window.addEventListener('unload', () => {
      console.log('Page unloading');
    });

    // Open connections block bfcache
    const ws = new WebSocket('wss://example.com');

    // IndexedDB transactions can block
    const request = indexedDB.open('mydb');
  }, []);

  return <div>This component blocks bfcache!</div>;
};

// ✅ bfcache-friendly implementation
const BfcacheFriendly: React.FC = () => {
  useEffect(() => {
    // Use pagehide instead of unload
    const handlePageHide = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page is being cached
        console.log('Page entering bfcache');
      }
    };

    // Use pageshow to detect restoration
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Page restored from bfcache
        console.log('Page restored from bfcache');
        // Refresh any stale data
        refreshData();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return <div>bfcache optimized!</div>;
};
```

### Managing WebSocket Connections

Close connections properly for bfcache:

```typescript
const useBfcacheWebSocket = (url: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket(url);
    wsRef.current.onopen = () => setConnected(true);
    wsRef.current.onclose = () => setConnected(false);
  }, [url]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();

    // Handle bfcache events
    const handlePageHide = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Entering bfcache - close connection
        disconnect();
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Restored from bfcache - reconnect
        connect();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      disconnect();
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [connect, disconnect]);

  return { connected, reconnect: connect };
};
```

### Handling Timers and Intervals

Pause and resume timers for bfcache:

```typescript
const useBfcacheTimer = (callback: () => void, delay: number) => {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      savedCallback.current();
    }, delay);
    setIsPaused(false);
  }, [delay]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPaused(true);
    }
  }, []);

  useEffect(() => {
    start();

    const handlePageHide = (e: PageTransitionEvent) => {
      if (e.persisted) {
        stop(); // Pause timer when entering bfcache
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        start(); // Resume timer when restored
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      stop();
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [start, stop]);

  return { isPaused, start, stop };
};
```

## Testing bfcache Eligibility

Build tools to test and monitor bfcache:

```typescript
class BfcacheAnalyzer {
  private blockers: string[] = [];

  analyze(): { eligible: boolean; blockers: string[] } {
    this.blockers = [];

    // Check for unload handlers
    if (window.onunload !== null) {
      this.blockers.push('unload event handler');
    }

    // Check for beforeunload handlers
    if (window.onbeforeunload !== null) {
      this.blockers.push('beforeunload event handler');
    }

    // Check for open IndexedDB connections
    this.checkIndexedDB();

    // Check for active WebSockets
    this.checkWebSockets();

    // Check for pending network requests
    this.checkPendingRequests();

    return {
      eligible: this.blockers.length === 0,
      blockers: this.blockers
    };
  }

  private checkIndexedDB() {
    // Check if any IndexedDB databases are open
    if ('databases' in indexedDB) {
      indexedDB.databases().then(databases => {
        if (databases.length > 0) {
          this.blockers.push(`Open IndexedDB: ${databases.map(db => db.name).join(', ')}`);
        }
      });
    }
  }

  private checkWebSockets() {
    // Monitor WebSocket constructor
    const originalWebSocket = window.WebSocket;
    let activeConnections = 0;

    window.WebSocket = new Proxy(originalWebSocket, {
      construct(target, args) {
        activeConnections++;
        const ws = new target(...args);

        const originalClose = ws.close;
        ws.close = function(...args) {
          activeConnections--;
          return originalClose.apply(this, args);
        };

        return ws;
      }
    });

    if (activeConnections > 0) {
      this.blockers.push(`${activeConnections} active WebSocket connections`);
    }
  }

  private checkPendingRequests() {
    // Check for pending fetch requests
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const pending = resources.filter(r => r.responseEnd === 0);

    if (pending.length > 0) {
      this.blockers.push(`${pending.length} pending network requests`);
    }
  }
}

// React component for monitoring
const BfcacheMonitor: React.FC = () => {
  const [analysis, setAnalysis] = useState<{ eligible: boolean; blockers: string[] } | null>(null);

  useEffect(() => {
    const analyzer = new BfcacheAnalyzer();

    const check = () => {
      const result = analyzer.analyze();
      setAnalysis(result);
    };

    check();
    const interval = setInterval(check, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!analysis) return null;

  return (
    <div className={`bfcache-monitor ${analysis.eligible ? 'eligible' : 'blocked'}`}>
      <h3>bfcache Status: {analysis.eligible ? '✅ Eligible' : '❌ Blocked'}</h3>
      {analysis.blockers.length > 0 && (
        <ul>
          {analysis.blockers.map((blocker, i) => (
            <li key={i}>{blocker}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

## Monitoring Speculation Success

Track whether speculation is working:

```typescript
class SpeculationMonitor {
  private speculatedUrls = new Set<string>();
  private hits = 0;
  private misses = 0;

  recordSpeculation(urls: string[]) {
    urls.forEach((url) => this.speculatedUrls.add(url));
  }

  recordNavigation(url: string) {
    if (this.speculatedUrls.has(url)) {
      this.hits++;
      console.log(`✅ Speculation hit: ${url}`);
    } else {
      this.misses++;
      console.log(`❌ Speculation miss: ${url}`);
    }
  }

  getMetrics() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      speculatedCount: this.speculatedUrls.size,
    };
  }
}

const useSpeculationMonitor = () => {
  const monitorRef = useRef(new SpeculationMonitor());
  const location = useLocation();

  useEffect(() => {
    // Record navigation
    monitorRef.current.recordNavigation(location.pathname);

    // Report metrics
    const metrics = monitorRef.current.getMetrics();
    if (metrics.hits + metrics.misses > 10) {
      console.log('Speculation metrics:', metrics);

      // Send to analytics
      if (metrics.hitRate < 0.5) {
        console.warn('Low speculation hit rate - consider adjusting strategy');
      }
    }
  }, [location]);

  return monitorRef.current;
};
```

## Advanced Speculation Patterns

### Viewport-Based Speculation

Speculate on links visible in viewport:

```typescript
const useViewportSpeculation = () => {
  const [visibleLinks, setVisibleLinks] = useState<string[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => (e.target as HTMLAnchorElement).href)
          .filter((href) => href.startsWith(window.location.origin));

        setVisibleLinks((prev) => [...new Set([...prev, ...visible])]);
      },
      { rootMargin: '50px' },
    );

    document.querySelectorAll('a[href]').forEach((link) => {
      observer.observe(link);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visibleLinks.length === 0) return;
    if (!HTMLScriptElement.supports?.('speculationrules')) return;

    const script = document.createElement('script');
    script.type = 'speculationrules';
    script.textContent = JSON.stringify({
      prefetch: [
        {
          source: 'list',
          urls: visibleLinks.slice(0, 10), // Limit to 10
          eagerness: 'conservative',
        },
      ],
    });

    document.head.appendChild(script);

    return () => script.remove();
  }, [visibleLinks]);
};
```

### Time-Based Speculation

Increase speculation eagerness over time:

```typescript
const useProgressiveSpeculation = () => {
  const [timeOnPage, setTimeOnPage] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setTimeOnPage(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [location]);

  useEffect(() => {
    if (!HTMLScriptElement.supports?.('speculationrules')) return;

    let eagerness: 'conservative' | 'moderate' | 'eager';

    if (timeOnPage < 3000) {
      eagerness = 'conservative';
    } else if (timeOnPage < 10000) {
      eagerness = 'moderate';
    } else {
      eagerness = 'eager';
    }

    const script = document.createElement('script');
    script.type = 'speculationrules';
    script.textContent = JSON.stringify({
      prefetch: [
        {
          source: 'document',
          where: { href_matches: '/*' },
          eagerness,
        },
      ],
    });

    document.head.appendChild(script);

    return () => script.remove();
  }, [timeOnPage]);
};
```

## Integration with React Router

Integrate speculation with React Router:

```typescript
const SpeculativeRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [routes, setRoutes] = useState<string[]>([]);

  useEffect(() => {
    // Extract all routes from React Router
    const extractRoutes = (element: React.ReactElement): string[] => {
      const paths: string[] = [];

      React.Children.forEach(element.props.children, (child) => {
        if (React.isValidElement(child) && child.props.path) {
          paths.push(child.props.path);
        }
      });

      return paths;
    };

    // Add speculation rules for all routes
    if (HTMLScriptElement.supports?.('speculationrules')) {
      const script = document.createElement('script');
      script.type = 'speculationrules';
      script.textContent = JSON.stringify({
        prefetch: [{
          source: 'list',
          urls: routes,
          eagerness: 'moderate'
        }]
      });
      document.head.appendChild(script);
    }
  }, [routes]);

  return <>{children}</>;
};
```

## Best Practices Checklist

✅ **Enable bfcache:**

- Use pagehide/pageshow instead of unload
- Close connections before caching
- Pause timers and intervals
- Clear sensitive data

✅ **Implement smart speculation:**

- Start conservative, increase eagerness
- Base on user behavior patterns
- Respect device capabilities
- Monitor hit rates

✅ **Test thoroughly:**

- Check bfcache eligibility
- Monitor speculation success
- Test on real devices
- Measure actual impact

✅ **Handle edge cases:**

- Reconnect WebSockets on restore
- Refresh stale data
- Update timestamps
- Clear outdated speculation

✅ **Respect resources:**

- Limit concurrent prerenders
- Consider data saver mode
- Adapt to network conditions
- Clean up unused speculation

