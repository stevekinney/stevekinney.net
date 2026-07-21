import type {
  CourseUpdate,
  DashboardData,
  DashboardSection,
  DashboardStatWindow,
  GithubRepositoryCommits,
  GithubStats,
  NpmPackageStats,
  NpmStats,
} from '$lib/dashboard-types';

// Manual type guards rather than zod: this validates `/api/dashboard`'s
// response, which is our own server's output (not third-party input), and
// zod's runtime was the single largest contributor to this route's client
// bundle — pulling it in just to re-check our own API's shape blew the
// project's build-size budget.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';
const isArray = <Item>(value: unknown, isItem: (item: unknown) => item is Item): value is Item[] =>
  Array.isArray(value) && value.every(isItem);

const isDashboardStatWindow = (value: unknown): value is DashboardStatWindow =>
  isRecord(value) && isString(value.from) && isString(value.to);

const isGithubRepositoryCommits = (value: unknown): value is GithubRepositoryCommits =>
  isRecord(value) &&
  isString(value.nameWithOwner) &&
  isString(value.url) &&
  isNumber(value.stargazerCount) &&
  isNumber(value.commits);

const isGithubStats = (value: unknown): value is GithubStats => {
  if (!isRecord(value)) return false;

  const { pullRequests, commits, issues, reviews } = value;

  return (
    isString(value.login) &&
    isString(value.profileUrl) &&
    isNumber(value.followers) &&
    isNumber(value.publicRepositories) &&
    isNumber(value.totalStars) &&
    isRecord(pullRequests) &&
    isNumber(pullRequests.openNow) &&
    isNumber(pullRequests.mergedLastYear) &&
    isRecord(commits) &&
    isNumber(commits.totalLastYear) &&
    isNumber(commits.privateContributionsLastYear) &&
    isArray(commits.byRepository, isGithubRepositoryCommits) &&
    isRecord(issues) &&
    isNumber(issues.openedLastYear) &&
    isNumber(issues.closedLastYear) &&
    isRecord(reviews) &&
    isNumber(reviews.totalLastYear)
  );
};

const isNpmPackageStats = (value: unknown): value is NpmPackageStats =>
  isRecord(value) &&
  isString(value.name) &&
  (value.description === undefined || isString(value.description)) &&
  isString(value.version) &&
  isString(value.url) &&
  isNumber(value.downloadsLastYear);

const isNpmStats = (value: unknown): value is NpmStats =>
  isRecord(value) &&
  isNumber(value.packageCount) &&
  isNumber(value.totalDownloadsLastYear) &&
  isArray(value.topPackages, isNpmPackageStats);

const isCourseUpdate = (value: unknown): value is CourseUpdate => {
  if (!isRecord(value)) return false;

  const { lastCommit } = value;
  const hasValidCommit =
    lastCommit === null ||
    (isRecord(lastCommit) &&
      isString(lastCommit.message) &&
      isString(lastCommit.url) &&
      isString(lastCommit.sha));

  return (
    isString(value.slug) &&
    isString(value.title) &&
    isString(value.description) &&
    isString(value.path) &&
    isNumber(value.lessonCount) &&
    isString(value.lastUpdatedAt) &&
    hasValidCommit
  );
};

const isDashboardSection = <T>(
  value: unknown,
  isData: (data: unknown) => data is T,
): value is DashboardSection<T> => {
  if (!isRecord(value)) return false;
  if (value.status === 'ok') return isData(value.data);
  if (value.status === 'error') return isString(value.error);

  return false;
};

/** Validates an untrusted `/api/dashboard` response body before the page renders it. */
export const isDashboardData = (value: unknown): value is DashboardData =>
  isRecord(value) &&
  isString(value.generatedAt) &&
  isDashboardStatWindow(value.window) &&
  isDashboardSection(value.github, isGithubStats) &&
  isDashboardSection(value.npm, isNpmStats) &&
  isDashboardSection(value.courses, (data): data is CourseUpdate[] =>
    isArray(data, isCourseUpdate),
  );
