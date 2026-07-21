/**
 * Shared types for the `/dashboard` page, its API endpoints, and its feeds.
 *
 * These types are client-safe: the page imports them for rendering, and the
 * server-only modules under `$lib/server/dashboard/` produce them.
 */

/** The rolling twelve-month window a dashboard snapshot covers. */
export type DashboardStatWindow = {
  /** ISO 8601 timestamp; inclusive start of the window. */
  from: string;
  /** ISO 8601 timestamp; exclusive end of the window. */
  to: string;
};

/** Commit volume for a single repository within the window. */
export type GithubRepositoryCommits = {
  nameWithOwner: string;
  url: string;
  stargazerCount: number;
  commits: number;
};

/** GitHub activity for the window plus a few profile-level totals. */
export type GithubStats = {
  login: string;
  profileUrl: string;
  followers: number;
  publicRepositories: number;
  totalStars: number;
  pullRequests: {
    /** Pull requests currently open, regardless of when they were opened. */
    openNow: number;
    mergedLastYear: number;
  };
  commits: {
    totalLastYear: number;
    /** GitHub's `restrictedContributionsCount` — activity in private repositories. */
    privateContributionsLastYear: number;
    /** Sorted by commit count, descending. */
    byRepository: GithubRepositoryCommits[];
  };
  issues: {
    openedLastYear: number;
    closedLastYear: number;
  };
  reviews: {
    totalLastYear: number;
  };
};

/** Download stats for a single npm package. */
export type NpmPackageStats = {
  name: string;
  description?: string;
  version: string;
  url: string;
  downloadsLastYear: number;
};

/** npm activity across every package Steve maintains. */
export type NpmStats = {
  packageCount: number;
  totalDownloadsLastYear: number;
  /** Sorted by downloads, descending. */
  topPackages: NpmPackageStats[];
};

/** A course in this repository, annotated with its most recent commit. */
export type CourseUpdate = {
  slug: string;
  title: string;
  description: string;
  /** Site path, e.g. `/courses/react-typescript`. */
  path: string;
  lessonCount: number;
  /** ISO 8601 timestamp of the latest commit touching the course directory. */
  lastUpdatedAt: string;
  lastCommit: {
    /** First line of the commit message. */
    message: string;
    url: string;
    sha: string;
  } | null;
};

/**
 * A dashboard section either resolved or failed; failures carry a message so
 * the page can render the healthy sections and explain the missing one.
 */
export type DashboardSection<T> = { status: 'ok'; data: T } | { status: 'error'; error: string };

/** The full dashboard snapshot served by `/api/dashboard`. */
export type DashboardData = {
  /** ISO 8601 timestamp of when this snapshot was computed. */
  generatedAt: string;
  window: DashboardStatWindow;
  github: DashboardSection<GithubStats>;
  npm: DashboardSection<NpmStats>;
  courses: DashboardSection<CourseUpdate[]>;
};
