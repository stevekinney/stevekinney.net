/**
 * Lets only the newest load win. Walking a dropped folder can take a while,
 * so a file chosen directly after a folder drop can finish first; without
 * this, the folder's files would land later and replace the newer choice.
 */
export const createLatestRequest = () => {
  let generation = 0;

  /** Starts a request. The check it returns stays true until a newer request starts. */
  const start = (): (() => boolean) => {
    generation += 1;
    const mine = generation;

    return () => mine === generation;
  };

  /**
   * Starts a request that waits for `pending`, then hands its value to
   * `onResolved` or its failure to `onRejected`, unless a newer request
   * started in the meantime.
   */
  const follow = <T>(
    pending: Promise<T>,
    onResolved: (value: T) => unknown,
    onRejected: (error: unknown) => void,
  ): Promise<void> => {
    const isCurrent = start();

    return pending
      .then(async (value) => {
        if (isCurrent()) await onResolved(value);
      })
      .catch((error: unknown) => {
        if (isCurrent()) onRejected(error);
      });
  };

  return { start, follow };
};
