export type RepoPath = `courses/${string}` | `writing/${string}`;

/**
 * Narrow a string to a RepoPath, throwing if it does not start with one of
 * the canonical content roots. Use this at boundaries where the caller has
 * external input; inside pipeline code that already holds a RepoPath, pass
 * it through directly instead.
 */
export const asRepoPath = (value: string): RepoPath => {
  if (value.startsWith('courses/') || value.startsWith('writing/')) {
    return value as RepoPath;
  }
  throw new TypeError(`Expected RepoPath (courses/… or writing/…), got '${value}'.`);
};
