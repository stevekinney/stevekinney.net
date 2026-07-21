import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCachedLoader } from './cache';

const TIME_TO_LIVE = 24 * 60 * 60 * 1000;
const RETRY_TIME_TO_LIVE = 5 * 60 * 1000;

type Value = { complete: boolean; id: number };

const createLoader = (compute: () => Promise<Value>) =>
  createCachedLoader(compute, {
    timeToLive: TIME_TO_LIVE,
    retryTimeToLive: RETRY_TIME_TO_LIVE,
    isComplete: (value) => value.complete,
  });

describe('createCachedLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes on first call and serves the cached value within the time to live', async () => {
    const compute = vi.fn(async (): Promise<Value> => ({ complete: true, id: 1 }));
    const load = createLoader(compute);

    await expect(load()).resolves.toEqual({ complete: true, id: 1 });

    vi.advanceTimersByTime(TIME_TO_LIVE - 1);

    await expect(load()).resolves.toEqual({ complete: true, id: 1 });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('recomputes once the time to live has elapsed', async () => {
    let id = 0;
    const compute = vi.fn(async (): Promise<Value> => ({ complete: true, id: (id += 1) }));
    const load = createLoader(compute);

    await expect(load()).resolves.toEqual({ complete: true, id: 1 });

    vi.advanceTimersByTime(TIME_TO_LIVE);

    await expect(load()).resolves.toEqual({ complete: true, id: 2 });
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent callers onto a single in-flight computation', async () => {
    let resolve: ((value: Value) => void) | undefined;
    const compute = vi.fn(
      () =>
        new Promise<Value>((promiseResolve) => {
          resolve = promiseResolve;
        }),
    );
    const load = createLoader(compute);

    const first = load();
    const second = load();

    resolve?.({ complete: true, id: 1 });

    await expect(first).resolves.toEqual({ complete: true, id: 1 });
    await expect(second).resolves.toEqual({ complete: true, id: 1 });
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('holds an incomplete value only for the retry time to live', async () => {
    let id = 0;
    const compute = vi.fn(async (): Promise<Value> => ({ complete: false, id: (id += 1) }));
    const load = createLoader(compute);

    await expect(load()).resolves.toEqual({ complete: false, id: 1 });

    vi.advanceTimersByTime(RETRY_TIME_TO_LIVE - 1);

    await expect(load()).resolves.toEqual({ complete: false, id: 1 });

    vi.advanceTimersByTime(1);

    await expect(load()).resolves.toEqual({ complete: false, id: 2 });
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('caches nothing when the computation rejects, so the next caller retries', async () => {
    const compute = vi
      .fn<() => Promise<Value>>()
      .mockRejectedValueOnce(new Error('upstream unavailable'))
      .mockResolvedValueOnce({ complete: true, id: 2 });
    const load = createLoader(compute);

    await expect(load()).rejects.toThrow('upstream unavailable');
    await expect(load()).resolves.toEqual({ complete: true, id: 2 });
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
