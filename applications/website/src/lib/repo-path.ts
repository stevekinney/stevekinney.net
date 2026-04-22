export type RepoPath = `courses/${string}` | `writing/${string}`;

export const asRepoPath = (value: string): RepoPath => value as RepoPath;
