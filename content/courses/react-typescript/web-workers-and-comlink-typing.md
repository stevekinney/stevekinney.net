---
title: Web Workers and Comlink Typing
description: >-
  Offload heavy work with strongly-typed workers—Comlink interfaces,
  transferable objects, and scheduling patterns.
date: 2025-09-14T18:00:00.000Z
modified: '2025-09-14T23:11:40.862Z'
published: true
tags:
  - react
  - typescript
  - web-workers
  - comlink
  - performance
  - off-main-thread
---

Move expensive computations off the main thread without losing type safety. Define worker contracts with TypeScript, use Comlink to call them like normal functions, and pass big data efficiently with transferables.

## Typed Worker Interface with Comlink

```ts
// worker.ts
export type WorkerAPI = {
  hash(data: ArrayBuffer): Promise<string>;
};

export const workerApi: WorkerAPI = {
  async hash(data) {
    // ...heavy work
    return 'sha256:...';
  },
};
```

```ts
// main.ts
import * as Comlink from 'comlink';
import type { WorkerAPI } from './worker';

const WorkerConstructor = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
const api = Comlink.wrap<WorkerAPI>(WorkerConstructor);

const result = await api.hash(transferableBuffer);
```

## Transferable Objects

Use `ArrayBuffer`, `MessagePort`, and `ImageBitmap` as transferables to avoid cloning overhead. Return ownership wisely for pipelines.

## Scheduling Patterns

- Queue tasks with backpressure.
- Pool workers for parallelizable workloads.
- Abort with `AbortSignal` plumbed through Comlink.

## Transfer Ownership Helper

```ts
function toTransferable(buffer: ArrayBuffer) {
  return [buffer, [buffer] as Transferable[]] as const;
}

// Usage
const [payload, transfer] = toTransferable(arrayBuffer);
api.hash(Comlink.transfer(payload, transfer));
```

## Abortable Tasks

```ts
// worker.ts
export const workerApi = {
  async fetchWithAbort(url: string, signal?: AbortSignal) {
    const res = await fetch(url, { signal });
    return res.text();
  },
};

// main
const ctrl = new AbortController();
api.fetchWithAbort('/data', ctrl.signal);
ctrl.abort();
```

## Worker Pool (Sketch)

```ts
type Job<I, O> = { input: I; resolve: (v: O) => void; reject: (e: any) => void };

export function createPool<N extends number, I, O>(size: N, makeWorker: () => Worker) {
  const workers = Array.from({ length: size }, makeWorker);
  const queue: Job<I, O>[] = [];
  let active = 0;

  const runNext = () => {
    if (!queue.length || active >= workers.length) return;
    const job = queue.shift()!;
    active++;
    // wrap worker call; on settle, active-- and runNext()
  };

  return {
    exec(input: I) {
      return new Promise<O>((resolve, reject) => {
        queue.push({ input, resolve, reject });
        runNext();
      });
    },
  };
}
```

## React Hook Integration

```ts
function useWorkerApi<T extends object>(factory: () => Worker) {
  const ref = useRef<Comlink.Remote<T>>();
  useEffect(() => {
    const w = factory();
    ref.current = Comlink.wrap<T>(w);
    return () => w.terminate();
  }, [factory]);
  return ref.current;
}
```

## See Also

- [React Performance with TypeScript](react-performance-with-typescript.md)
- [Typing Concurrent Features: Transitions and Deferrals](concurrent-features-typing.md)
- [Resource Preloading APIs Types](resource-preloading-apis-types.md)
