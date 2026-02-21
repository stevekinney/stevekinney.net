---
title: Service Worker Strategies for React Apps
description: >-
  Implement service workers for offline-first React apps. Master caching
  strategies, background sync, and push notifications for blazing-fast
  performance.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - service-workers
  - pwa
  - caching
---

Your React app loads instantly—until the user loses their internet connection. Then it's a blank screen, spinning wheels, and frustrated users. Service Workers change that game entirely. They're your app's personal proxy server, sitting between your React code and the network, intercepting requests, serving cached responses, and even working offline. But implement them wrong, and you'll cache stale data forever, break your app updates, or worse, serve the wrong content to the wrong users.

The power of Service Workers goes far beyond offline support. They enable instant loading with cache-first strategies, background data synchronization when connectivity returns, push notifications to re-engage users, and even periodic background updates. This guide shows you how to implement Service Workers correctly in React applications, from basic caching strategies to advanced patterns that make your app feel native.

## Understanding Service Workers in React Context

Service Workers are JavaScript workers that run in a separate thread from your React app:

```tsx
// Service Worker lifecycle and capabilities
interface ServiceWorkerCapabilities {
  // What Service Workers CAN do
  capabilities: {
    networkInterception: 'Intercept all network requests';
    cacheManagement: 'Store and serve cached responses';
    backgroundSync: 'Sync data when online';
    pushNotifications: 'Receive push messages';
    offlineSupport: 'Work without internet';
  };

  // What Service Workers CANNOT do
  limitations: {
    domAccess: 'Cannot access DOM directly';
    synchronousXHR: 'No synchronous requests';
    localStorage: 'No access to localStorage';
    parentScope: 'Cannot access parent page scope';
  };

  // Lifecycle phases
  lifecycle: {
    install: 'Download and cache assets';
    activate: 'Clean up old caches';
    fetch: 'Intercept network requests';
    sync: 'Background synchronization';
    push: 'Handle push messages';
  };
}

// Basic Service Worker registration in React
function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  const [swStatus, setSwStatus] = useState<'idle' | 'installing' | 'active' | 'error'>('idle');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setSwStatus('installing');

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            setSwStatus('active');

            // Check if this is an update
            if (navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          }
        });
      });

      // Check for updates periodically
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      ); // Every hour
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      setSwStatus('error');
    }
  };

  const skipWaiting = () => {
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  return (
    <ServiceWorkerContext.Provider value={{ swStatus, updateAvailable, skipWaiting }}>
      {children}
      {updateAvailable && <UpdateNotification onUpdate={skipWaiting} />}
    </ServiceWorkerContext.Provider>
  );
}
```

## Caching Strategies

Different content requires different caching strategies:

```javascript
// sw.js - Service Worker implementation
const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  images: `images-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
};

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/bundle.js',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );

  // Force waiting SW to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );

  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategy selector
  if (request.method !== 'GET') {
    // Only cache GET requests
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    // Network first for API calls
    event.respondWith(networkFirst(request, CACHE_NAMES.api));
  } else if (request.destination === 'image') {
    // Cache first for images
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
  } else if (url.pathname.startsWith('/static/')) {
    // Cache only for static assets
    event.respondWith(cacheOnly(request, CACHE_NAMES.static));
  } else {
    // Stale while revalidate for HTML
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic));
  }
});

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return caches.match('/offline.html');
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match('/offline.html');
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Cache-only strategy
async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  return cached || fetch(request);
}
```

## Advanced Caching with Workbox

Workbox simplifies Service Worker implementation:

```javascript
// sw.js with Workbox
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache manifest (injected by build tool)
precacheAndRoute(self.__WB_MANIFEST);

// Cache images with size/age limits
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);

// API routes with background sync
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
      bgSyncPlugin,
    ],
  }),
);

// Handle offline page
import { offlineFallback } from 'workbox-recipes';

offlineFallback({
  pageFallback: '/offline.html',
});

// Runtime caching for Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  }),
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30,
      }),
    ],
  }),
);
```

## Background Sync Implementation

Sync data when connectivity returns:

```tsx
// React hook for background sync
function useBackgroundSync() {
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const queueSync = useCallback(async (action: string, data: any) => {
    const syncItem: SyncItem = {
      id: `${Date.now()}-${Math.random()}`,
      action,
      data,
      timestamp: Date.now(),
      attempts: 0,
    };

    // Store in IndexedDB for persistence
    await storeSyncItem(syncItem);

    // Add to queue
    setSyncQueue((prev) => [...prev, syncItem]);

    // Register sync event
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('data-sync');
    } else {
      // Fallback to online event
      window.addEventListener('online', () => processSyncQueue(), { once: true });
    }
  }, []);

  const processSyncQueue = useCallback(async () => {
    setIsSyncing(true);
    const items = await getAllSyncItems();

    for (const item of items) {
      try {
        await processSyncItem(item);
        await removeSyncItem(item.id);
        setSyncQueue((prev) => prev.filter((i) => i.id !== item.id));
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);

        // Increment attempts
        item.attempts++;

        if (item.attempts >= 3) {
          // Max retries reached
          await removeSyncItem(item.id);
          setSyncQueue((prev) => prev.filter((i) => i.id !== item.id));
        } else {
          await updateSyncItem(item);
        }
      }
    }

    setIsSyncing(false);
  }, []);

  useEffect(() => {
    // Listen for sync complete messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        setSyncQueue((prev) => prev.filter((i) => i.id !== event.data.id));
      }
    });

    // Load existing queue
    getAllSyncItems().then(setSyncQueue);
  }, []);

  return {
    queueSync,
    syncQueue,
    isSyncing,
    processSyncQueue,
  };
}

// Service Worker sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'data-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  const db = await openDB('sync-store', 1);
  const tx = db.transaction('sync-items', 'readonly');
  const items = await tx.objectStore('sync-items').getAll();

  for (const item of items) {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (response.ok) {
        // Remove from store
        const deleteTx = db.transaction('sync-items', 'readwrite');
        await deleteTx.objectStore('sync-items').delete(item.id);

        // Notify client
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            id: item.id,
          });
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

## Push Notifications

Implement push notifications for engagement:

```tsx
// Push notification setup
function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    const permission = await Notification.requestPermission();
    setPermission(permission);

    if (permission === 'granted') {
      await subscribeUser();
    }
  };

  const subscribeUser = async () => {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY!),
    });

    setSubscription(subscription);

    // Send subscription to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
  };

  const unsubscribe = async () => {
    if (subscription) {
      await subscription.unsubscribe();
      setSubscription(null);

      // Remove from server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
    unsubscribe,
  };
}

// Service Worker push handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id,
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Notification', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
```

## Offline-First React Components

Build components that work offline:

```tsx
// Offline-aware data fetching
function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    fallback?: T;
  },
) {
  const [data, setData] = useState<T | undefined>(options?.fallback);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [key, isOnline]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    // Try cache first
    const cached = await getCachedData<T>(key);

    if (cached && isDataFresh(cached, options?.ttl)) {
      setData(cached.data);
      setIsLoading(false);

      // Revalidate in background if online
      if (isOnline) {
        revalidateData();
      }
      return;
    }

    // No fresh cache, fetch if online
    if (isOnline) {
      try {
        const fresh = await fetcher();
        setData(fresh);
        await cacheData(key, fresh);
      } catch (err) {
        setError(err as Error);

        // Fall back to stale cache if available
        if (cached) {
          setData(cached.data);
        }
      }
    } else if (cached) {
      // Offline: use stale cache
      setData(cached.data);
    } else {
      // Offline with no cache
      setError(new Error('No cached data available offline'));
    }

    setIsLoading(false);
  };

  const revalidateData = async () => {
    try {
      const fresh = await fetcher();

      // Update if data changed
      if (JSON.stringify(fresh) !== JSON.stringify(data)) {
        setData(fresh);
        await cacheData(key, fresh);
      }
    } catch (err) {
      console.error('Background revalidation failed:', err);
    }
  };

  const mutate = async (updater: (prev: T) => T) => {
    const updated = updater(data!);
    setData(updated);

    // Optimistically update cache
    await cacheData(key, updated);

    // Queue sync if offline
    if (!isOnline) {
      await queueSync('update', { key, data: updated });
    }
  };

  return {
    data,
    isLoading,
    error,
    isOnline,
    mutate,
    revalidate: loadData,
  };
}

// Offline status indicator
function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`offline-banner ${isOnline ? 'online' : 'offline'}`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>✅ Back online</>
      ) : (
        <>⚠️ You're offline - changes will sync when connection returns</>
      )}
    </div>
  );
}
```

## Cache Management Strategies

Intelligent cache management for optimal performance:

```javascript
// Advanced cache management
class CacheManager {
  constructor() {
    this.cacheNames = {
      static: 'static-v1',
      dynamic: 'dynamic-v1',
      api: 'api-v1',
    };

    this.limits = {
      dynamic: 50,
      api: 100,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  async pruneCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    if (requests.length <= maxItems) return;

    // Sort by last accessed (approximation)
    const sortedRequests = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request);
        const date = response.headers.get('date');
        return {
          request,
          timestamp: date ? new Date(date).getTime() : 0,
        };
      }),
    );

    sortedRequests.sort((a, b) => a.timestamp - b.timestamp);

    // Delete oldest entries
    const toDelete = sortedRequests.slice(0, requests.length - maxItems);

    await Promise.all(toDelete.map(({ request }) => cache.delete(request)));
  }

  async clearExpiredEntries() {
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);

        if (this.isExpired(response)) {
          await cache.delete(request);
        }
      }
    }
  }

  isExpired(response) {
    const date = response.headers.get('date');
    if (!date) return false;

    const age = Date.now() - new Date(date).getTime();
    return age > this.limits.maxAge;
  }

  async getCacheSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: (estimate.usage / estimate.quota) * 100,
      };
    }
    return null;
  }

  async clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
}

// Periodic cache cleanup
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAN_CACHE') {
    const manager = new CacheManager();
    manager.pruneCache(manager.cacheNames.dynamic, 50);
    manager.pruneCache(manager.cacheNames.api, 100);
    manager.clearExpiredEntries();
  }
});
```

## Service Worker Updates

Handle updates gracefully:

```tsx
// Update prompt component
function ServiceWorkerUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const onServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
      setShowPrompt(true);
      setWaitingWorker(registration.waiting);
    };

    // Check for waiting worker
    navigator.serviceWorker?.ready.then((registration) => {
      if (registration.waiting) {
        onServiceWorkerUpdate(registration);
      }

      // Listen for new waiting workers
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && registration.waiting) {
            onServiceWorkerUpdate(registration);
          }
        });
      });
    });
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;

    // Tell waiting worker to skip waiting
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    // Listen for controlling service worker to change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  };

  if (!showPrompt) return null;

  return (
    <div className="update-prompt">
      <p>A new version is available!</p>
      <button onClick={handleUpdate}>Update Now</button>
      <button onClick={() => setShowPrompt(false)}>Later</button>
    </div>
  );
}
```

## Performance Monitoring

Track Service Worker performance:

```javascript
// Service Worker performance metrics
class ServiceWorkerMetrics {
  constructor() {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      networkRequests: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      requestCount: 0,
    };
  }

  async trackFetch(event) {
    const startTime = performance.now();
    const request = event.request;

    try {
      const cache = await caches.match(request);

      if (cache) {
        this.metrics.cacheHits++;
        this.recordResponseTime(performance.now() - startTime);
        return cache;
      }

      this.metrics.cacheMisses++;
      this.metrics.networkRequests++;

      const response = await fetch(request);
      this.recordResponseTime(performance.now() - startTime);

      return response;
    } catch (error) {
      this.recordResponseTime(performance.now() - startTime);
      throw error;
    }
  }

  recordResponseTime(time) {
    this.metrics.totalResponseTime += time;
    this.metrics.requestCount++;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.requestCount;
  }

  getReport() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
    };
  }
}
```

## Best Practices Checklist

```typescript
interface ServiceWorkerBestPractices {
  // Registration
  registration: {
    checkSupport: 'Verify browser support before registering';
    productionOnly: 'Only register in production builds';
    updateRegularly: 'Check for updates periodically';
    handleErrors: 'Gracefully handle registration failures';
  };

  // Caching
  caching: {
    strategicCaching: 'Use appropriate strategy per resource type';
    versionCaches: 'Version cache names for easy updates';
    limitCacheSize: 'Implement cache size limits';
    expireOldEntries: 'Remove stale cache entries';
  };

  // Updates
  updates: {
    skipWaiting: 'Allow users to skip waiting for updates';
    notifyUsers: 'Inform users about available updates';
    gracefulMigration: 'Migrate data between versions';
    testUpdates: 'Test update flow thoroughly';
  };

  // Performance
  performance: {
    lazyRegistration: 'Register after page load';
    selectiveCache: 'Cache critical resources only';
    networkTimeout: 'Set reasonable network timeouts';
    monitorMetrics: 'Track cache hit rates and performance';
  };
}
```
