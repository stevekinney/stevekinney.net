---
title: Web Workers with React
description: >-
  Offload expensive computations to Web Workers. Keep your UI responsive with
  parallel processing, proper state synchronization, and TypeScript support.
date: 2025-09-14T12:00:00.000Z
modified: '2025-09-30T21:02:22-05:00'
published: true
tags:
  - react
  - performance
  - web-workers
  - parallel-processing
---

Your React app is grinding to a halt. The culprit? A massive data transformation, complex calculation, or image processing task that's blocking the main thread. While your JavaScript crunches numbers, your UI freezes, animations stutter, and users rage-click unresponsive buttons. The solution isn't to optimize the algorithm (though you should do that too)—it's to move it off the main thread entirely with Web Workers.

Web Workers let you run JavaScript in background threads, parallel to your main execution thread. This means your expensive computations can run without blocking user interactions, keeping your React app responsive even during heavy processing. But integrating Workers with React's component model requires careful handling of state synchronization, lifecycle management, and TypeScript typing. This guide shows you exactly how to do it right.

## Understanding Web Workers in the Browser

Before diving into React integration, understand what Workers can and can't do:

```tsx
// Web Worker capabilities and limitations
interface WorkerCapabilities {
  // What Workers CAN do
  can: {
    compute: 'Run CPU-intensive calculations';
    fetch: 'Make network requests independently';
    indexedDB: 'Access browser storage';
    webAssembly: 'Run WASM modules for max performance';
    postMessage: 'Communicate with main thread';
    importScripts: 'Load additional JavaScript files';
  };

  // What Workers CANNOT do
  cannot: {
    dom: 'Access or manipulate the DOM';
    window: 'Access window object or globals';
    localStorage: 'Use localStorage (use IndexedDB instead)';
    parent: 'Access parent object directly';
    react: 'Use React components or hooks directly';
  };

  // Performance characteristics
  performance: {
    overhead: '~0.5-1ms to spawn a worker';
    messageLatency: '~0.1-0.3ms for postMessage';
    memory: 'Separate heap, typically 10-50MB baseline';
    concurrency: 'True parallel execution on multi-core CPUs';
  };
}
```

## Basic Web Worker Setup with React

Let's start with a simple Worker integration:

### Creating a TypeScript Worker

```typescript
// worker/calculator.worker.ts
// This file runs in the Worker thread

type WorkerMessage =
  | { type: 'CALCULATE_PRIMES'; limit: number }
  | { type: 'PROCESS_DATA'; data: number[] }
  | { type: 'CANCEL_OPERATION' };

type WorkerResponse =
  | { type: 'RESULT'; data: any }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'ERROR'; error: string };

// Worker context is different from window
const ctx: Worker = self as any;

// State within the worker
let isProcessing = false;
let shouldCancel = false;

// Calculate prime numbers (expensive operation)
function calculatePrimes(limit: number): number[] {
  const primes: number[] = [];

  for (let num = 2; num <= limit; num++) {
    if (shouldCancel) {
      throw new Error('Operation cancelled');
    }

    let isPrime = true;
    for (let i = 2; i * i <= num; i++) {
      if (num % i === 0) {
        isPrime = false;
        break;
      }
    }

    if (isPrime) {
      primes.push(num);
    }

    // Send progress updates
    if (num % 1000 === 0) {
      ctx.postMessage({
        type: 'PROGRESS',
        progress: (num / limit) * 100,
      } as WorkerResponse);
    }
  }

  return primes;
}

// Process large dataset
function processData(data: number[]): number[] {
  // Simulate expensive processing
  return data.map((value, index) => {
    // Report progress for large datasets
    if (index % 1000 === 0) {
      ctx.postMessage({
        type: 'PROGRESS',
        progress: (index / data.length) * 100,
      } as WorkerResponse);
    }

    // Some expensive computation
    return Math.sqrt(value) * Math.log(value + 1);
  });
}

// Listen for messages from main thread
ctx.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  if (type === 'CANCEL_OPERATION') {
    shouldCancel = true;
    return;
  }

  if (isProcessing) {
    ctx.postMessage({
      type: 'ERROR',
      error: 'Worker is busy',
    } as WorkerResponse);
    return;
  }

  isProcessing = true;
  shouldCancel = false;

  try {
    let result: any;

    switch (type) {
      case 'CALCULATE_PRIMES':
        result = calculatePrimes(event.data.limit);
        break;

      case 'PROCESS_DATA':
        result = processData(event.data.data);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    ctx.postMessage({
      type: 'RESULT',
      data: result,
    } as WorkerResponse);
  } catch (error) {
    ctx.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  } finally {
    isProcessing = false;
    shouldCancel = false;
  }
});

// Signal that worker is ready
ctx.postMessage({ type: 'READY' });
```

### React Hook for Worker Management

```tsx
// hooks/useWebWorker.ts
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebWorkerOptions {
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  terminateOnUnmount?: boolean;
}

export function useWebWorker<T = any>(workerPath: string, options: UseWebWorkerOptions = {}) {
  const { onProgress, onError, terminateOnUnmount = true } = options;

  const workerRef = useRef<Worker | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker
  useEffect(() => {
    // Create worker with proper typing
    workerRef.current = new Worker(new URL(workerPath, import.meta.url), { type: 'module' });

    const worker = workerRef.current;

    // Set up message handler
    worker.onmessage = (event: MessageEvent) => {
      const { type, data, error: errorMsg, progress: prog } = event.data;

      switch (type) {
        case 'READY':
          console.log('Worker ready');
          break;

        case 'PROGRESS':
          setProgress(prog);
          onProgress?.(prog);
          break;

        case 'ERROR':
          setError(errorMsg);
          onError?.(errorMsg);
          setIsProcessing(false);
          break;

        case 'RESULT':
          // Results handled by promise resolution
          setIsProcessing(false);
          setProgress(100);
          break;
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      const errorMsg = `Worker error: ${event.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
      setIsProcessing(false);
    };

    // Cleanup
    return () => {
      if (terminateOnUnmount && worker) {
        worker.terminate();
      }
    };
  }, [workerPath, onProgress, onError, terminateOnUnmount]);

  // Send message to worker and get result
  const postMessage = useCallback(<R = T,>(message: any): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      setIsProcessing(true);
      setError(null);
      setProgress(0);

      const worker = workerRef.current;

      // One-time result handler
      const handleResult = (event: MessageEvent) => {
        if (event.data.type === 'RESULT') {
          worker.removeEventListener('message', handleResult);
          resolve(event.data.data);
        } else if (event.data.type === 'ERROR') {
          worker.removeEventListener('message', handleResult);
          reject(new Error(event.data.error));
        }
      };

      worker.addEventListener('message', handleResult);
      worker.postMessage(message);
    });
  }, []);

  // Cancel ongoing operation
  const cancel = useCallback(() => {
    if (workerRef.current && isProcessing) {
      workerRef.current.postMessage({ type: 'CANCEL_OPERATION' });
      setIsProcessing(false);
      setProgress(0);
    }
  }, [isProcessing]);

  // Terminate worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  return {
    postMessage,
    cancel,
    terminate,
    isProcessing,
    progress,
    error,
  };
}
```

### Using the Worker in a Component

```tsx
// components/PrimeCalculator.tsx
function PrimeCalculator() {
  const [limit, setLimit] = useState(100000);
  const [results, setResults] = useState<number[]>([]);

  const { postMessage, cancel, isProcessing, progress, error } = useWebWorker(
    '../worker/calculator.worker.ts',
  );

  const calculatePrimes = async () => {
    try {
      const primes = await postMessage<number[]>({
        type: 'CALCULATE_PRIMES',
        limit,
      });
      setResults(primes);
    } catch (err) {
      console.error('Failed to calculate primes:', err);
    }
  };

  return (
    <div className="prime-calculator">
      <h2>Prime Number Calculator</h2>

      <div className="controls">
        <input
          type="number"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          disabled={isProcessing}
          placeholder="Enter limit"
        />

        <button onClick={calculatePrimes} disabled={isProcessing}>
          {isProcessing ? 'Calculating...' : 'Calculate Primes'}
        </button>

        {isProcessing && <button onClick={cancel}>Cancel</button>}
      </div>

      {isProcessing && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span>{progress.toFixed(1)}%</span>
        </div>
      )}

      {error && <div className="error">Error: {error}</div>}

      {results.length > 0 && (
        <div className="results">
          <h3>Found {results.length} prime numbers</h3>
          <div className="prime-list">
            {results.slice(0, 100).join(', ')}
            {results.length > 100 && '...'}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Advanced Worker Patterns

### Worker Pool for Parallel Processing

```tsx
// utils/workerPool.ts
export class WorkerPool<T = any> {
  private workers: Worker[] = [];
  private queue: Array<{
    data: any;
    resolve: (value: T) => void;
    reject: (error: any) => void;
  }> = [];
  private busyWorkers = new Set<Worker>();

  constructor(
    private workerPath: string,
    private poolSize: number = navigator.hardwareConcurrency || 4,
  ) {
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(new URL(this.workerPath, import.meta.url), { type: 'module' });

      worker.onmessage = (event) => {
        this.handleWorkerMessage(worker, event);
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.busyWorkers.delete(worker);
        this.processQueue();
      };

      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(worker: Worker, event: MessageEvent) {
    const { type, data, error } = event.data;

    // Get the task associated with this worker
    const task = (worker as any).__currentTask;

    if (type === 'RESULT') {
      task?.resolve(data);
    } else if (type === 'ERROR') {
      task?.reject(new Error(error));
    }

    // Mark worker as available
    this.busyWorkers.delete(worker);
    delete (worker as any).__currentTask;

    // Process next item in queue
    this.processQueue();
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    // Find available worker
    const availableWorker = this.workers.find((w) => !this.busyWorkers.has(w));

    if (!availableWorker) return;

    // Get next task from queue
    const task = this.queue.shift();
    if (!task) return;

    // Assign task to worker
    this.busyWorkers.add(availableWorker);
    (availableWorker as any).__currentTask = task;
    availableWorker.postMessage(task.data);
  }

  async process(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      this.processQueue();
    });
  }

  async processAll(items: any[]): Promise<T[]> {
    return Promise.all(items.map((item) => this.process(item)));
  }

  terminate() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.queue = [];
    this.busyWorkers.clear();
  }

  getStats() {
    return {
      poolSize: this.poolSize,
      busyWorkers: this.busyWorkers.size,
      queueLength: this.queue.length,
      utilization: (this.busyWorkers.size / this.poolSize) * 100,
    };
  }
}

// Hook for using worker pool
export function useWorkerPool<T = any>(workerPath: string, poolSize?: number) {
  const poolRef = useRef<WorkerPool<T> | null>(null);
  const [stats, setStats] = useState({
    poolSize: 0,
    busyWorkers: 0,
    queueLength: 0,
    utilization: 0,
  });

  useEffect(() => {
    poolRef.current = new WorkerPool<T>(workerPath, poolSize);

    // Update stats periodically
    const interval = setInterval(() => {
      if (poolRef.current) {
        setStats(poolRef.current.getStats());
      }
    }, 100);

    return () => {
      clearInterval(interval);
      poolRef.current?.terminate();
    };
  }, [workerPath, poolSize]);

  const process = useCallback(async (data: any): Promise<T> => {
    if (!poolRef.current) {
      throw new Error('Worker pool not initialized');
    }
    return poolRef.current.process(data);
  }, []);

  const processAll = useCallback(async (items: any[]): Promise<T[]> => {
    if (!poolRef.current) {
      throw new Error('Worker pool not initialized');
    }
    return poolRef.current.processAll(items);
  }, []);

  return {
    process,
    processAll,
    stats,
  };
}
```

### Transferable Objects for Large Data

```tsx
// utils/transferableWorker.ts

// Worker that handles large binary data efficiently
// worker/imageProcessor.worker.ts
const ctx: Worker = self as any;

interface ImageProcessingMessage {
  type: 'PROCESS_IMAGE';
  imageData: ImageData;
  filter: 'blur' | 'sharpen' | 'grayscale';
}

function processImage(imageData: ImageData, filter: string): ImageData {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Create new ImageData for result
  const output = new ImageData(width, height);
  const outputPixels = output.data;

  switch (filter) {
    case 'grayscale':
      for (let i = 0; i < pixels.length; i += 4) {
        const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
        outputPixels[i] = gray; // R
        outputPixels[i + 1] = gray; // G
        outputPixels[i + 2] = gray; // B
        outputPixels[i + 3] = pixels[i + 3]; // A
      }
      break;

    case 'blur':
      // Simple box blur
      const blurRadius = 2;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0,
            g = 0,
            b = 0,
            a = 0;
          let count = 0;

          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const ny = y + dy;
              const nx = x + dx;

              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                const idx = (ny * width + nx) * 4;
                r += pixels[idx];
                g += pixels[idx + 1];
                b += pixels[idx + 2];
                a += pixels[idx + 3];
                count++;
              }
            }
          }

          const idx = (y * width + x) * 4;
          outputPixels[idx] = r / count;
          outputPixels[idx + 1] = g / count;
          outputPixels[idx + 2] = b / count;
          outputPixels[idx + 3] = a / count;
        }
      }
      break;

    // Add more filters as needed
  }

  return output;
}

ctx.addEventListener('message', (event: MessageEvent<ImageProcessingMessage>) => {
  const { type, imageData, filter } = event.data;

  if (type === 'PROCESS_IMAGE') {
    const result = processImage(imageData, filter);

    // Transfer the result back (zero-copy transfer)
    ctx.postMessage(
      { type: 'RESULT', imageData: result },
      [result.data.buffer], // Transfer ownership of the buffer
    );
  }
});

// Hook for efficient data transfer
export function useTransferableWorker(workerPath: string) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL(workerPath, import.meta.url), { type: 'module' });

    return () => {
      workerRef.current?.terminate();
    };
  }, [workerPath]);

  const processWithTransfer = useCallback(
    async <T = any,>(message: any, transferables: Transferable[]): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'));
          return;
        }

        const worker = workerRef.current;

        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'RESULT') {
            worker.removeEventListener('message', handleMessage);
            resolve(event.data);
          } else if (event.data.type === 'ERROR') {
            worker.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error));
          }
        };

        worker.addEventListener('message', handleMessage);

        // Transfer ownership of buffers to worker (zero-copy)
        worker.postMessage(message, transferables);
      });
    },
    [],
  );

  return { processWithTransfer };
}
```

### SharedArrayBuffer for Real-Time Communication

```tsx
// utils/sharedWorker.ts
// Note: SharedArrayBuffer requires specific headers for security

export class SharedMemoryWorker {
  private worker: Worker;
  private sharedBuffer: SharedArrayBuffer;
  private sharedArray: Int32Array;

  constructor(workerPath: string, bufferSize: number = 1024) {
    // Create shared memory
    this.sharedBuffer = new SharedArrayBuffer(bufferSize * 4); // 4 bytes per int32
    this.sharedArray = new Int32Array(this.sharedBuffer);

    // Create worker with shared memory
    this.worker = new Worker(new URL(workerPath, import.meta.url), { type: 'module' });

    // Send shared buffer to worker
    this.worker.postMessage({
      type: 'INIT_SHARED_MEMORY',
      buffer: this.sharedBuffer,
    });
  }

  // Atomic operations for thread-safe access
  read(index: number): number {
    return Atomics.load(this.sharedArray, index);
  }

  write(index: number, value: number): void {
    Atomics.store(this.sharedArray, index, value);
  }

  increment(index: number): number {
    return Atomics.add(this.sharedArray, index, 1);
  }

  compareExchange(index: number, expectedValue: number, newValue: number): number {
    return Atomics.compareExchange(this.sharedArray, index, expectedValue, newValue);
  }

  // Wait for value change (blocking)
  waitFor(index: number, value: number, timeout?: number): 'ok' | 'timed-out' {
    return Atomics.wait(this.sharedArray, index, value, timeout);
  }

  // Notify waiting threads
  notify(index: number, count: number = 1): number {
    return Atomics.notify(this.sharedArray, index, count);
  }

  terminate(): void {
    this.worker.terminate();
  }
}

// Worker side implementation
// worker/sharedMemory.worker.ts
const ctx: Worker = self as any;
let sharedArray: Int32Array | null = null;

ctx.addEventListener('message', (event) => {
  if (event.data.type === 'INIT_SHARED_MEMORY') {
    sharedArray = new Int32Array(event.data.buffer);

    // Start processing with shared memory
    processSharedData();
  }
});

function processSharedData() {
  if (!sharedArray) return;

  // Example: Increment counter in shared memory
  setInterval(() => {
    // Atomic increment at index 0
    const newValue = Atomics.add(sharedArray, 0, 1);

    // Notify main thread of update
    Atomics.notify(sharedArray, 0, 1);
  }, 100);
}
```

## Real-World Use Cases

### Case 1: Data Visualization Processing

```tsx
// components/DataVisualizer.tsx
interface DataPoint {
  x: number;
  y: number;
  value: number;
}

function DataVisualizer({ rawData }: { rawData: number[][] }) {
  const [processedData, setProcessedData] = useState<DataPoint[]>([]);
  const [clusters, setClusters] = useState<DataPoint[][]>([]);

  const { postMessage, isProcessing, progress } = useWebWorker('../worker/dataProcessor.worker.ts');

  useEffect(() => {
    processData();
  }, [rawData]);

  const processData = async () => {
    try {
      // Process raw data in worker
      const processed = await postMessage<DataPoint[]>({
        type: 'PROCESS_DATA',
        data: rawData,
      });
      setProcessedData(processed);

      // Perform clustering in worker
      const clusterResult = await postMessage<DataPoint[][]>({
        type: 'CLUSTER_DATA',
        data: processed,
        config: { k: 5, iterations: 100 },
      });
      setClusters(clusterResult);
    } catch (error) {
      console.error('Data processing failed:', error);
    }
  };

  return (
    <div className="data-visualizer">
      {isProcessing ? (
        <div className="loading">Processing data... {progress.toFixed(0)}%</div>
      ) : (
        <Canvas data={processedData} clusters={clusters} width={800} height={600} />
      )}
    </div>
  );
}
```

### Case 2: Real-Time Search with Worker

```tsx
// components/WorkerSearch.tsx
function WorkerSearch({ dataset }: { dataset: Item[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [searchTime, setSearchTime] = useState(0);

  const searchWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize search worker with dataset
    searchWorkerRef.current = new Worker(new URL('../worker/search.worker.ts', import.meta.url), {
      type: 'module',
    });

    const worker = searchWorkerRef.current;

    // Index the dataset in the worker
    worker.postMessage({
      type: 'INDEX_DATA',
      data: dataset,
    });

    worker.onmessage = (event) => {
      if (event.data.type === 'SEARCH_RESULTS') {
        setResults(event.data.results);
        setSearchTime(event.data.time);
      }
    };

    return () => {
      worker.terminate();
    };
  }, [dataset]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    // Debounce search
    const timer = setTimeout(() => {
      searchWorkerRef.current?.postMessage({
        type: 'SEARCH',
        query,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="worker-search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search dataset..."
      />

      {searchTime > 0 && (
        <div className="search-stats">
          Found {results.length} results in {searchTime.toFixed(2)}ms
        </div>
      )}

      <div className="results">
        {results.map((item) => (
          <SearchResult key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

### Case 3: Background Sync and Caching

```tsx
// utils/syncWorker.ts
export class SyncWorker {
  private worker: Worker;
  private syncQueue: Set<string> = new Set();

  constructor() {
    this.worker = new Worker(new URL('../worker/sync.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.setupMessageHandler();
    this.setupPeriodicSync();
  }

  private setupMessageHandler() {
    this.worker.onmessage = (event) => {
      const { type, id, success } = event.data;

      if (type === 'SYNC_COMPLETE') {
        this.syncQueue.delete(id);

        // Notify React components
        window.dispatchEvent(
          new CustomEvent('sync-complete', {
            detail: { id, success },
          }),
        );
      }
    };
  }

  private setupPeriodicSync() {
    // Sync every 30 seconds
    setInterval(() => {
      this.syncPendingData();
    }, 30000);

    // Sync when online
    window.addEventListener('online', () => {
      this.syncPendingData();
    });
  }

  async queueForSync(id: string, data: any) {
    this.syncQueue.add(id);

    // Store in IndexedDB for persistence
    await this.storeLocal(id, data);

    // Try immediate sync if online
    if (navigator.onLine) {
      this.worker.postMessage({
        type: 'SYNC_ITEM',
        id,
        data,
      });
    }
  }

  private async storeLocal(id: string, data: any) {
    // Store in IndexedDB (simplified)
    const db = await this.openDB();
    const tx = db.transaction(['pending'], 'readwrite');
    await tx.objectStore('pending').put({ id, data, timestamp: Date.now() });
  }

  private async syncPendingData() {
    if (!navigator.onLine) return;

    const pending = await this.getPendingItems();

    pending.forEach((item) => {
      this.worker.postMessage({
        type: 'SYNC_ITEM',
        id: item.id,
        data: item.data,
      });
    });
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SyncDB', 1);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('pending')) {
          db.createObjectStore('pending', { keyPath: 'id' });
        }
      };
    });
  }

  private async getPendingItems(): Promise<any[]> {
    const db = await this.openDB();
    const tx = db.transaction(['pending'], 'readonly');
    const store = tx.objectStore('pending');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Hook for background sync
export function useBackgroundSync() {
  const syncWorkerRef = useRef<SyncWorker | null>(null);
  const [syncStatus, setSyncStatus] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    syncWorkerRef.current = new SyncWorker();

    const handleSyncComplete = (event: CustomEvent) => {
      const { id, success } = event.detail;
      setSyncStatus((prev) => new Map(prev).set(id, success));
    };

    window.addEventListener('sync-complete', handleSyncComplete as any);

    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete as any);
    };
  }, []);

  const queueSync = useCallback(async (id: string, data: any) => {
    await syncWorkerRef.current?.queueForSync(id, data);
    setSyncStatus((prev) => new Map(prev).set(id, false)); // Pending
  }, []);

  return {
    queueSync,
    syncStatus,
    isSynced: (id: string) => syncStatus.get(id) === true,
    isPending: (id: string) => syncStatus.get(id) === false,
  };
}
```

## Performance Monitoring and Debugging

```tsx
// utils/workerPerformance.ts
export class WorkerPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  startMeasure(id: string) {
    this.startTimes.set(id, performance.now());
  }

  endMeasure(id: string): number {
    const startTime = this.startTimes.get(id);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;

    // Store metric
    if (!this.metrics.has(id)) {
      this.metrics.set(id, []);
    }
    this.metrics.get(id)!.push(duration);

    this.startTimes.delete(id);
    return duration;
  }

  getStats(id: string) {
    const times = this.metrics.get(id) || [];
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);

    return {
      count: times.length,
      mean: times.reduce((a, b) => a + b, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  report() {
    console.group('Worker Performance Report');

    this.metrics.forEach((times, id) => {
      const stats = this.getStats(id);
      if (stats) {
        console.table({
          Operation: id,
          'Avg Time': `${stats.mean.toFixed(2)}ms`,
          P95: `${stats.p95.toFixed(2)}ms`,
          Count: stats.count,
        });
      }
    });

    console.groupEnd();
  }
}

// Debug component for worker monitoring
function WorkerDebugPanel() {
  const [workerStats, setWorkerStats] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Get all active workers (custom tracking needed)
      const stats = getActiveWorkerStats();
      setWorkerStats(stats);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="worker-debug-panel">
      <h3>Active Workers</h3>
      <table>
        <thead>
          <tr>
            <th>Worker</th>
            <th>Status</th>
            <th>Messages</th>
            <th>Avg Time</th>
          </tr>
        </thead>
        <tbody>
          {workerStats.map((stat) => (
            <tr key={stat.id}>
              <td>{stat.name}</td>
              <td>{stat.status}</td>
              <td>{stat.messageCount}</td>
              <td>{stat.avgTime.toFixed(2)}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Best Practices and Pitfalls

```tsx
// Common patterns and anti-patterns

// ✅ Good: Reuse workers for multiple operations
const worker = new Worker('./worker.js');
worker.postMessage({ type: 'TASK_1', data });
// Later...
worker.postMessage({ type: 'TASK_2', data });

// ❌ Bad: Create new worker for each operation
const worker1 = new Worker('./worker.js');
worker1.postMessage(data1);
worker1.terminate();

const worker2 = new Worker('./worker.js');
worker2.postMessage(data2);
worker2.terminate();

// ✅ Good: Transfer large data efficiently
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage({ buffer }, [buffer]); // Transfer ownership

// ❌ Bad: Clone large data unnecessarily
const largeArray = new Float32Array(1000000);
worker.postMessage({ array: largeArray }); // Clones entire array

// ✅ Good: Handle worker errors gracefully
worker.onerror = (error) => {
  console.error('Worker error:', error);
  // Fallback to main thread processing
  processOnMainThread(data);
};

// ❌ Bad: No error handling
worker.postMessage(data); // Hope for the best

// ✅ Good: Clean up workers properly
useEffect(() => {
  const worker = new Worker('./worker.js');

  return () => {
    worker.terminate();
  };
}, []);

// ❌ Bad: Memory leak from unterminated workers
useEffect(() => {
  const worker = new Worker('./worker.js');
  // No cleanup!
}, []);
```

## Wrapping Up

Web Workers are your escape hatch from JavaScript's single-threaded limitations. They let you run expensive computations without freezing your UI, process data in parallel on multi-core devices, and create truly responsive React applications even under heavy load.

The key is knowing when to use them (computations over 16ms, large data processing, background sync) and when not to (simple calculations, frequent small operations, DOM manipulation). With proper TypeScript typing, efficient data transfer using Transferable objects, and careful lifecycle management, Workers become a powerful tool in your React performance arsenal.
