---
title: Real-Time Data Performance in React
description: >-
  Handle high-frequency updates without killing performance. Master WebSockets,
  Server-Sent Events, throttling, and efficient state updates for real-time
  React apps.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - real-time
  - websockets
  - streaming
---

Real-time data is React's kryptonite. Stock prices updating 100 times per second, chat messages flooding in, live collaboration with dozens of users—each update triggers a re-render, and suddenly your smooth React app becomes a stuttering mess. The challenge isn't the network; modern WebSockets can handle thousands of messages per second. The challenge is React's reconciliation process choking on the frequency of updates.

But real-time doesn't have to mean real-slow. With the right patterns—throttling, batching, virtualization, and selective updates—you can handle massive data streams while maintaining 60fps. The key is understanding where the bottlenecks are (hint: it's not always where you think) and implementing the right optimizations at each layer of your stack. This guide shows you how to build React applications that handle real-time data like a pro.

## Understanding Real-Time Performance Challenges

Real-time data creates unique performance problems:

```tsx
// Real-time data performance characteristics
interface RealTimePerformance {
  // Performance challenges
  challenges: {
    updateFrequency: 'Updates faster than frame rate (>60Hz)';
    reconciliation: 'React diffing overhead on every update';
    memoryGrowth: 'Unbounded data accumulation';
    stateManagement: 'State updates triggering cascading renders';
    networkBackpressure: 'Client cant process messages fast enough';
  };

  // Key metrics
  metrics: {
    messagesPerSecond: number; // Incoming message rate
    updatesPerSecond: number; // React update rate
    droppedFrames: number; // Frames below 60fps
    memoryUsage: number; // Heap size over time
    latency: number; // Message to render time
  };

  // Optimization strategies
  strategies: {
    throttling: 'Limit update frequency';
    batching: 'Group multiple updates';
    virtualization: 'Render only visible items';
    webWorkers: 'Process data off main thread';
    selective: 'Update only changed components';
  };
}

// Performance impact by update frequency
const updateFrequencyImpact = {
  '1Hz': { impact: 'Negligible', strategy: 'Direct updates' },
  '10Hz': { impact: 'Low', strategy: 'Basic throttling' },
  '60Hz': { impact: 'Medium', strategy: 'Batching + throttling' },
  '100Hz': { impact: 'High', strategy: 'Web Workers + virtualization' },
  '1000Hz': { impact: 'Extreme', strategy: 'Sampling + aggregation' },
};
```

## WebSocket Connection Management

Efficient WebSocket setup with reconnection and backpressure:

```tsx
// Advanced WebSocket manager
class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private messageQueue: any[] = [];
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    connectTime: 0,
    disconnects: 0,
  };

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.stats.connectTime = Date.now();

      // Flush queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.send(message);
      }

      this.emit('connection', { status: 'connected' });
    };

    this.ws.onmessage = (event) => {
      this.stats.messagesReceived++;
      this.stats.bytesReceived += event.data.length;

      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.stats.disconnects++;
      this.emit('connection', { status: 'disconnected' });
      this.scheduleReconnect();
    };
  }

  private handleMessage(data: any) {
    const { type, payload } = data;

    // Handle system messages
    if (type === 'ping') {
      this.send({ type: 'pong', timestamp: Date.now() });
      return;
    }

    // Emit to subscribers
    this.emit(type, payload);
  }

  private emit(event: string, data: any) {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${event}:`, error);
        }
      });
    }

    // Also emit wildcard
    const wildcardHandlers = this.subscribers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler({ type: event, data }));
    }
  }

  subscribe(event: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    this.subscribers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(event);
        }
      }
    };
  }

  send(data: any) {
    const message = JSON.stringify(data);

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      this.stats.messagesSent++;
      this.stats.bytesSent += message.length;
    } else {
      // Queue message for later
      this.messageQueue.push(data);

      // Limit queue size to prevent memory issues
      if (this.messageQueue.length > 1000) {
        this.messageQueue.shift(); // Drop oldest message
        console.warn('WebSocket message queue overflow');
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('error', new Error('Connection failed'));
      return;
    }

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  getStats() {
    return {
      ...this.stats,
      queueSize: this.messageQueue.length,
      isConnected: this.isConnected,
      uptime: this.isConnected ? Date.now() - this.stats.connectTime : 0,
    };
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}

// React hook for WebSocket
export function useWebSocket(url: string) {
  const [manager] = useState(() => new WebSocketManager(url));
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState(manager.getStats());

  useEffect(() => {
    const unsubscribe = manager.subscribe('connection', ({ status }) => {
      setIsConnected(status === 'connected');
    });

    // Update stats periodically
    const interval = setInterval(() => {
      setStats(manager.getStats());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      manager.close();
    };
  }, [manager]);

  return {
    subscribe: manager.subscribe.bind(manager),
    send: manager.send.bind(manager),
    isConnected,
    stats,
  };
}
```

## Throttling and Batching Updates

Control update frequency to maintain performance:

```tsx
// Advanced throttling and batching
class UpdateBatcher<T> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastFlush = 0;

  constructor(
    private callback: (batch: T[]) => void,
    private options: {
      maxBatchSize: number;
      maxWaitTime: number;
      throttleMs: number;
    },
  ) {}

  add(item: T) {
    this.batch.push(item);

    // Flush if batch is full
    if (this.batch.length >= this.options.maxBatchSize) {
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.options.maxWaitTime);
    }
  }

  private flush() {
    if (this.batch.length === 0) return;

    // Enforce throttling
    const now = Date.now();
    const timeSinceLastFlush = now - this.lastFlush;

    if (timeSinceLastFlush < this.options.throttleMs) {
      // Reschedule flush
      if (this.timer) clearTimeout(this.timer);

      this.timer = setTimeout(() => {
        this.flush();
      }, this.options.throttleMs - timeSinceLastFlush);

      return;
    }

    // Process batch
    const batchToProcess = this.batch;
    this.batch = [];
    this.lastFlush = now;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.callback(batchToProcess);
  }

  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.batch = [];
  }
}

// React hook for batched updates
export function useBatchedUpdates<T>(
  processor: (batch: T[]) => void,
  options = {
    maxBatchSize: 100,
    maxWaitTime: 100,
    throttleMs: 16, // One frame
  },
) {
  const batcherRef = useRef<UpdateBatcher<T> | null>(null);

  useEffect(() => {
    batcherRef.current = new UpdateBatcher(processor, options);

    return () => {
      batcherRef.current?.destroy();
    };
  }, [processor, options]);

  const add = useCallback((item: T) => {
    batcherRef.current?.add(item);
  }, []);

  return { add };
}

// Throttled state updates
export function useThrottledState<T>(
  initialValue: T,
  throttleMs = 100,
): [T, (value: T) => void, T] {
  const [value, setValue] = useState(initialValue);
  const [displayValue, setDisplayValue] = useState(initialValue);
  const lastUpdateRef = useRef(0);
  const pendingValueRef = useRef<T | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const throttledSetValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      pendingValueRef.current = newValue;

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate >= throttleMs) {
        // Update immediately
        setDisplayValue(newValue);
        lastUpdateRef.current = now;
        pendingValueRef.current = null;
      } else {
        // Schedule update
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
          if (pendingValueRef.current !== null) {
            setDisplayValue(pendingValueRef.current);
            lastUpdateRef.current = Date.now();
            pendingValueRef.current = null;
          }
        }, throttleMs - timeSinceLastUpdate);
      }
    },
    [throttleMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [displayValue, throttledSetValue, value];
}
```

## Virtualization for Large Data Sets

Handle large real-time lists efficiently:

```tsx
// Virtual list for real-time data
function RealTimeVirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Auto-scroll to bottom for new messages
  const [autoScroll, setAutoScroll] = useState(true);
  const prevItemsLength = useRef(items.length);

  useEffect(() => {
    if (autoScroll && items.length > prevItemsLength.current) {
      scrollRef.current?.scrollTo({
        top: items.length * itemHeight,
        behavior: 'smooth',
      });
    }
    prevItemsLength.current = items.length;
  }, [items.length, autoScroll, itemHeight]);

  const handleUserScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

    setAutoScroll(isAtBottom);
  }, []);

  return (
    <div
      ref={scrollRef}
      style={{ height, overflow: 'auto' }}
      onScroll={(e) => {
        handleScroll(e);
        handleUserScroll();
      }}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => (
          <div
            key={startIndex + i}
            style={{
              position: 'absolute',
              top: (startIndex + i) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, startIndex + i)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Selective Component Updates

Update only what's changed:

```tsx
// Selective update system
class SelectiveUpdateManager {
  private subscriptions: Map<string, Set<() => void>> = new Map();
  private data: Map<string, any> = new Map();

  update(path: string, value: any) {
    const oldValue = this.data.get(path);

    if (oldValue === value) return; // No change

    this.data.set(path, value);

    // Notify only subscribers to this path
    const subscribers = this.subscriptions.get(path);
    if (subscribers) {
      subscribers.forEach((callback) => callback());
    }

    // Notify wildcard subscribers
    const wildcardPath = path.split('.').slice(0, -1).join('.') + '.*';
    const wildcardSubscribers = this.subscriptions.get(wildcardPath);
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach((callback) => callback());
    }
  }

  subscribe(path: string, callback: () => void): () => void {
    if (!this.subscriptions.has(path)) {
      this.subscriptions.set(path, new Set());
    }

    this.subscriptions.get(path)!.add(callback);

    return () => {
      const subs = this.subscriptions.get(path);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscriptions.delete(path);
        }
      }
    };
  }

  get(path: string): any {
    return this.data.get(path);
  }
}

// React hook for selective updates
export function useSelectiveUpdate<T>(path: string, initialValue: T): T {
  const manager = useRef(new SelectiveUpdateManager());
  const [value, setValue] = useState<T>(() => manager.current.get(path) ?? initialValue);

  useEffect(() => {
    return manager.current.subscribe(path, () => {
      setValue(manager.current.get(path));
    });
  }, [path]);

  return value;
}

// Memoized real-time component
const RealTimeDataRow = memo(
  function RealTimeDataRow({ data, fields }: { data: any; fields: string[] }) {
    return (
      <div className="data-row">
        {fields.map((field) => (
          <RealTimeCell key={field} path={`${data.id}.${field}`} />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if specified fields change
    return prevProps.fields.every((field) => prevProps.data[field] === nextProps.data[field]);
  },
);

function RealTimeCell({ path }: { path: string }) {
  const value = useSelectiveUpdate(path, null);

  return <div className="data-cell">{value}</div>;
}
```

## Server-Sent Events (SSE)

Alternative to WebSockets for one-way streaming:

```tsx
// SSE manager for real-time updates
class SSEManager {
  private eventSource: EventSource | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private lastEventId: string | null = null;

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    const url = new URL(this.url);

    if (this.lastEventId) {
      url.searchParams.set('lastEventId', this.lastEventId);
    }

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onopen = () => {
      console.log('SSE connected');
      this.reconnectAttempts = 0;
      this.emit('connected', null);
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.reconnect();
      }
    };

    this.eventSource.onmessage = (event) => {
      this.lastEventId = event.lastEventId;

      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    // Custom event handlers
    this.eventSource.addEventListener('update', (event: any) => {
      const data = JSON.parse(event.data);
      this.emit('update', data);
    });

    this.eventSource.addEventListener('delete', (event: any) => {
      const data = JSON.parse(event.data);
      this.emit('delete', data);
    });
  }

  private emit(event: string, data: any) {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in SSE handler for ${event}:`, error);
        }
      });
    }
  }

  subscribe(event: string, handler: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    this.subscribers.get(event)!.add(handler);

    return () => {
      const handlers = this.subscribers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(event);
        }
      }
    };
  }

  private reconnect() {
    if (this.reconnectAttempts >= 5) {
      console.error('Max SSE reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`SSE reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  close() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}

// React hook for SSE
export function useSSE(url: string) {
  const [manager] = useState(() => new SSEManager(url));
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubConnect = manager.subscribe('connected', () => {
      setIsConnected(true);
    });

    const unsubError = manager.subscribe('error', () => {
      setIsConnected(false);
    });

    return () => {
      unsubConnect();
      unsubError();
      manager.close();
    };
  }, [manager]);

  return {
    subscribe: manager.subscribe.bind(manager),
    isConnected,
  };
}
```

## Web Worker Processing

Process real-time data off the main thread:

```tsx
// worker/realtime-processor.ts
const ctx: Worker = self as any;

interface DataPoint {
  id: string;
  timestamp: number;
  value: number;
}

class RealTimeProcessor {
  private buffer: DataPoint[] = [];
  private aggregates: Map<string, any> = new Map();

  process(data: DataPoint) {
    this.buffer.push(data);

    // Keep buffer size limited
    if (this.buffer.length > 10000) {
      this.buffer.shift();
    }

    // Update aggregates
    this.updateAggregates(data);

    // Send processed data back
    ctx.postMessage({
      type: 'processed',
      data: {
        latest: data,
        aggregates: Object.fromEntries(this.aggregates),
        bufferSize: this.buffer.length,
      },
    });
  }

  private updateAggregates(data: DataPoint) {
    const window = 60000; // 1 minute window

    const now = Date.now();
    const windowData = this.buffer.filter((d) => now - d.timestamp < window);

    const values = windowData.map((d) => d.value);

    this.aggregates.set('count', windowData.length);
    this.aggregates.set(
      'sum',
      values.reduce((a, b) => a + b, 0),
    );
    this.aggregates.set('avg', this.aggregates.get('sum') / windowData.length);
    this.aggregates.set('min', Math.min(...values));
    this.aggregates.set('max', Math.max(...values));
  }

  batch(dataPoints: DataPoint[]) {
    dataPoints.forEach((point) => this.process(point));
  }
}

const processor = new RealTimeProcessor();

ctx.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'process':
      processor.process(data);
      break;

    case 'batch':
      processor.batch(data);
      break;
  }
});

// React hook for worker processing
export function useRealTimeWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [aggregates, setAggregates] = useState<any>({});

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/realtime-processor.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (event) => {
      if (event.data.type === 'processed') {
        setAggregates(event.data.data.aggregates);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const process = useCallback((data: DataPoint) => {
    workerRef.current?.postMessage({ type: 'process', data });
  }, []);

  const processBatch = useCallback((data: DataPoint[]) => {
    workerRef.current?.postMessage({ type: 'batch', data });
  }, []);

  return { process, processBatch, aggregates };
}
```

## Performance Monitoring

Track real-time performance metrics:

```tsx
// Real-time performance monitor
class RealTimePerformanceMonitor {
  private metrics = {
    messagesPerSecond: 0,
    updatesPerSecond: 0,
    droppedFrames: 0,
    avgLatency: 0,
    maxLatency: 0,
    memoryUsage: 0,
  };

  private messageTimestamps: number[] = [];
  private updateTimestamps: number[] = [];
  private frameDrops = 0;
  private lastFrameTime = performance.now();

  trackMessage() {
    const now = Date.now();
    this.messageTimestamps.push(now);

    // Keep only last second
    this.messageTimestamps = this.messageTimestamps.filter((t) => now - t < 1000);

    this.metrics.messagesPerSecond = this.messageTimestamps.length;
  }

  trackUpdate(latency: number) {
    const now = Date.now();
    this.updateTimestamps.push(now);

    // Keep only last second
    this.updateTimestamps = this.updateTimestamps.filter((t) => now - t < 1000);

    this.metrics.updatesPerSecond = this.updateTimestamps.length;

    // Update latency metrics
    this.metrics.avgLatency = this.metrics.avgLatency * 0.9 + latency * 0.1;
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
  }

  trackFrame() {
    const now = performance.now();
    const frameDuration = now - this.lastFrameTime;

    if (frameDuration > 16.67) {
      // Slower than 60fps
      this.frameDrops++;
      this.metrics.droppedFrames = this.frameDrops;
    }

    this.lastFrameTime = now;
  }

  trackMemory() {
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
    }
  }

  getMetrics() {
    this.trackMemory();
    return { ...this.metrics };
  }

  reset() {
    this.messageTimestamps = [];
    this.updateTimestamps = [];
    this.frameDrops = 0;
    this.metrics.maxLatency = 0;
  }
}

// React component for monitoring
function RealTimeMonitor() {
  const monitor = useRef(new RealTimePerformanceMonitor());
  const [metrics, setMetrics] = useState(monitor.current.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(monitor.current.getMetrics());
    }, 1000);

    const frameInterval = setInterval(() => {
      monitor.current.trackFrame();
    }, 16);

    return () => {
      clearInterval(interval);
      clearInterval(frameInterval);
    };
  }, []);

  return (
    <div className="realtime-monitor">
      <div>Messages/sec: {metrics.messagesPerSecond}</div>
      <div>Updates/sec: {metrics.updatesPerSecond}</div>
      <div>Dropped frames: {metrics.droppedFrames}</div>
      <div>Avg latency: {metrics.avgLatency.toFixed(2)}ms</div>
      <div>Max latency: {metrics.maxLatency.toFixed(2)}ms</div>
      <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
    </div>
  );
}
```

## Best Practices Checklist

```typescript
interface RealTimeBestPractices {
  // Connection management
  connection: {
    autoReconnect: 'Implement automatic reconnection with backoff';
    heartbeat: 'Send periodic heartbeats to detect disconnections';
    queueMessages: 'Queue messages during disconnection';
    compression: 'Enable compression for large payloads';
  };

  // Update optimization
  updates: {
    throttleUpdates: 'Limit update frequency to 60fps max';
    batchUpdates: 'Group multiple updates together';
    selectiveUpdates: 'Update only changed components';
    virtualizeList: 'Use virtualization for large lists';
  };

  // Memory management
  memory: {
    limitBuffer: 'Cap message buffer size';
    clearOldData: 'Remove data outside viewport';
    unsubscribe: 'Clean up subscriptions on unmount';
    monitorGrowth: 'Track memory usage over time';
  };

  // Performance
  performance: {
    useWorkers: 'Process data in Web Workers';
    debounceRenders: 'Debounce rapid state changes';
    memoComponents: 'Memoize expensive components';
    profileRegularly: 'Monitor performance metrics';
  };
}
```
