type CachedLoaderOptions<T> = {
  /** How long a complete snapshot is served before recomputing, in milliseconds. */
  timeToLive: number;
  /** How long an incomplete snapshot is served before retrying, in milliseconds. */
  retryTimeToLive: number;
  /** Decides which time-to-live applies to a freshly computed value. */
  isComplete: (value: T) => boolean;
};

type Snapshot<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Wraps an expensive computation in a time-based, per-instance memo.
 *
 * The returned function serves the cached value until it expires, dedupes
 * concurrent callers onto a single in-flight computation, and — because a
 * failed computation should not be served for a full day — applies the shorter
 * `retryTimeToLive` when `isComplete` reports the value as partial. A rejected
 * computation caches nothing, so the next caller retries immediately.
 */
export const createCachedLoader = <T>(
  compute: () => Promise<T>,
  options: CachedLoaderOptions<T>,
): (() => Promise<T>) => {
  let snapshot: Snapshot<T> | null = null;
  let inFlight: Promise<T> | null = null;

  return () => {
    if (snapshot && Date.now() < snapshot.expiresAt) return Promise.resolve(snapshot.value);
    if (inFlight) return inFlight;

    inFlight = compute()
      .then((value) => {
        const timeToLive = options.isComplete(value) ? options.timeToLive : options.retryTimeToLive;

        snapshot = { value, expiresAt: Date.now() + timeToLive };

        return value;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };
};
