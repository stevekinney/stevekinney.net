import { env } from '$env/dynamic/private';
import { z } from 'zod';

import type {
  DashboardStatWindow,
  GithubRepositoryCommits,
  GithubStats,
} from '$lib/dashboard-types';

const GITHUB_LOGIN = 'stevekinney';
const GITHUB_PROFILE_URL = 'https://github.com/stevekinney';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const GITHUB_REST_URL = 'https://api.github.com';
const REQUEST_TIMEOUT_MILLISECONDS = 10_000;
const MONTHLY_WINDOW_COUNT = 12;
const STARGAZER_PAGE_SIZE = 100;
const MAX_STARGAZER_PAGES = 10;
const TOP_REPOSITORY_COUNT = 10;

const buildHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  'User-Agent': 'stevekinney.net-dashboard',
});

const GraphqlEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

// GitHub's secondary rate limit rejects bursts of concurrent GraphQL requests
// with a 403 (observed live), and its documentation asks for serial requests.
// This queue threads every GraphQL call through one at a time; the compute
// runs at most once a day, so the added seconds are irrelevant.
let graphqlQueue: Promise<unknown> = Promise.resolve();

const enqueueGraphql = <T>(task: () => Promise<T>): Promise<T> => {
  const result = graphqlQueue.then(task, task);
  graphqlQueue = result.catch(() => undefined);

  return result;
};

/**
 * POSTs a GraphQL query to the GitHub API — serially, never concurrently —
 * and returns its `data`, validated against `schema`. Throws on a non-2xx
 * response, a non-empty `errors` array, or a response shape that fails
 * validation.
 */
const requestGraphql = <Schema extends z.ZodTypeAny>(
  fetchImpl: typeof globalThis.fetch,
  token: string,
  query: string,
  variables: Record<string, unknown>,
  schema: Schema,
): Promise<z.infer<Schema>> =>
  enqueueGraphql(() => performGraphqlRequest(fetchImpl, token, query, variables, schema));

const performGraphqlRequest = async <Schema extends z.ZodTypeAny>(
  fetchImpl: typeof globalThis.fetch,
  token: string,
  query: string,
  variables: Record<string, unknown>,
  schema: Schema,
): Promise<z.infer<Schema>> => {
  const response = await fetchImpl(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 200);

    throw new Error(`GitHub GraphQL request failed with status ${response.status}: ${body}`);
  }

  const envelope = GraphqlEnvelopeSchema.safeParse(await response.json());
  if (!envelope.success) {
    throw new Error('GitHub GraphQL response did not match the expected shape.');
  }

  const [firstError] = envelope.data.errors ?? [];
  if (firstError) throw new Error(`GitHub GraphQL error: ${firstError.message}`);

  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success) {
    const message = parsed.error.message;
    throw new Error(`GitHub GraphQL response did not match the expected shape: ${message}`);
  }

  return parsed.data;
};

const ContributionsScalarsSchema = z.object({
  user: z.object({
    contributionsCollection: z.object({
      totalCommitContributions: z.number().optional(),
      restrictedContributionsCount: z.number().optional(),
      totalPullRequestReviewContributions: z.number().optional(),
    }),
  }),
});

type ContributionsScalars = z.infer<
  typeof ContributionsScalarsSchema
>['user']['contributionsCollection'];

const TOTAL_COMMIT_CONTRIBUTIONS_QUERY = `
	query($login: String!, $from: DateTime!, $to: DateTime!) {
		user(login: $login) {
			contributionsCollection(from: $from, to: $to) {
				totalCommitContributions
			}
		}
	}
`;

const RESTRICTED_CONTRIBUTIONS_QUERY = `
	query($login: String!, $from: DateTime!, $to: DateTime!) {
		user(login: $login) {
			contributionsCollection(from: $from, to: $to) {
				restrictedContributionsCount
			}
		}
	}
`;

const TOTAL_REVIEW_CONTRIBUTIONS_QUERY = `
	query($login: String!, $from: DateTime!, $to: DateTime!) {
		user(login: $login) {
			contributionsCollection(from: $from, to: $to) {
				totalPullRequestReviewContributions
			}
		}
	}
`;

/**
 * Fetches a single `contributionsCollection` scalar field for the window.
 * Each field is fetched with its own query — combining two or more of these
 * fields in one query exceeds GitHub's resource limits for this account.
 */
const fetchContributionsScalar = async (
  fetchImpl: typeof globalThis.fetch,
  token: string,
  window: DashboardStatWindow,
  query: string,
  pickField: (scalars: ContributionsScalars) => number | undefined,
): Promise<number> => {
  const data = await requestGraphql(
    fetchImpl,
    token,
    query,
    { login: GITHUB_LOGIN, from: window.from, to: window.to },
    ContributionsScalarsSchema,
  );

  return pickField(data.user.contributionsCollection) ?? 0;
};

const CommitContributionsByRepositorySchema = z.object({
  user: z.object({
    contributionsCollection: z.object({
      commitContributionsByRepository: z.array(
        z.object({
          repository: z.object({
            nameWithOwner: z.string(),
            url: z.string(),
            stargazerCount: z.number(),
            isPrivate: z.boolean(),
          }),
          contributions: z.object({ totalCount: z.number() }),
        }),
      ),
    }),
  }),
});

const COMMIT_CONTRIBUTIONS_BY_REPOSITORY_QUERY = `
	query($login: String!, $from: DateTime!, $to: DateTime!) {
		user(login: $login) {
			contributionsCollection(from: $from, to: $to) {
				commitContributionsByRepository(maxRepositories: 25) {
					repository {
						nameWithOwner
						url
						stargazerCount
						isPrivate
					}
					contributions {
						totalCount
					}
				}
			}
		}
	}
`;

/**
 * Subtracts `months` from `date` in UTC, clamping to the last day of the
 * target month when the original day-of-month doesn't exist there (e.g.
 * subtracting one month from Mar 31 would otherwise overflow "Feb 31"
 * forward into early March via `setUTCMonth`'s normal rollover behavior).
 */
const subtractUtcMonths = (date: Date, months: number): Date => {
  const shifted = new Date(date);
  const dayOfMonth = shifted.getUTCDate();

  shifted.setUTCMonth(shifted.getUTCMonth() - months);
  if (shifted.getUTCDate() !== dayOfMonth) shifted.setUTCDate(0);

  return shifted;
};

/**
 * Splits the window into twelve consecutive ~1-month windows, using the
 * window's own boundaries for the first `from` and the last `to` so the
 * stitched windows span it exactly. `commitContributionsByRepository` fails
 * outright at a 1-year window (even alone), so per-repository commits have
 * to be gathered a month at a time and aggregated.
 */
const buildMonthlyWindows = (window: DashboardStatWindow): DashboardStatWindow[] => {
  const to = new Date(window.to);
  const boundaries = [new Date(window.from)];

  for (let monthsBack = MONTHLY_WINDOW_COUNT - 1; monthsBack >= 1; monthsBack -= 1) {
    boundaries.push(subtractUtcMonths(to, monthsBack));
  }

  boundaries.push(to);

  const windows: DashboardStatWindow[] = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    windows.push({
      from: boundaries[index].toISOString(),
      to: boundaries[index + 1].toISOString(),
    });
  }

  return windows;
};

/**
 * Sums commits per repository across monthly pages, sorted by commits
 * descending. Private repositories are excluded — this dashboard is public,
 * and a token with private-repo access would otherwise leak private
 * repository names, URLs, and commit counts through it. The token's private
 * activity still counts toward `commits.privateContributionsLastYear`
 * (fetched separately), just not broken out by name here.
 */
const aggregateRepositoryCommits = (
  pages: z.infer<typeof CommitContributionsByRepositorySchema>[],
): GithubRepositoryCommits[] => {
  const totals = new Map<string, GithubRepositoryCommits>();

  for (const page of pages) {
    for (const entry of page.user.contributionsCollection.commitContributionsByRepository) {
      if (entry.repository.isPrivate) continue;

      const previous = totals.get(entry.repository.nameWithOwner);

      totals.set(entry.repository.nameWithOwner, {
        nameWithOwner: entry.repository.nameWithOwner,
        url: entry.repository.url,
        stargazerCount: entry.repository.stargazerCount,
        commits: (previous?.commits ?? 0) + entry.contributions.totalCount,
      });
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.commits - a.commits)
    .slice(0, TOP_REPOSITORY_COUNT);
};

/** Fetches per-repository commit counts for the window, stitched from monthly pages. */
const fetchRepositoryCommits = async (
  fetchImpl: typeof globalThis.fetch,
  token: string,
  window: DashboardStatWindow,
): Promise<GithubRepositoryCommits[]> => {
  const monthlyWindows = buildMonthlyWindows(window);
  const pages: z.infer<typeof CommitContributionsByRepositorySchema>[] = [];

  for (const monthlyWindow of monthlyWindows) {
    pages.push(
      await requestGraphql(
        fetchImpl,
        token,
        COMMIT_CONTRIBUTIONS_BY_REPOSITORY_QUERY,
        { login: GITHUB_LOGIN, from: monthlyWindow.from, to: monthlyWindow.to },
        CommitContributionsByRepositorySchema,
      ),
    );
  }

  return aggregateRepositoryCommits(pages);
};

const SearchCountsSchema = z.object({
  mergedLastYear: z.object({ issueCount: z.number() }),
  openNow: z.object({ issueCount: z.number() }),
  openedLastYear: z.object({ issueCount: z.number() }),
  closedLastYear: z.object({ issueCount: z.number() }),
});

const SEARCH_COUNTS_QUERY = `
	query($mergedQuery: String!, $openQuery: String!, $openedQuery: String!, $closedQuery: String!) {
		mergedLastYear: search(query: $mergedQuery, type: ISSUE, first: 1) {
			issueCount
		}
		openNow: search(query: $openQuery, type: ISSUE, first: 1) {
			issueCount
		}
		openedLastYear: search(query: $openedQuery, type: ISSUE, first: 1) {
			issueCount
		}
		closedLastYear: search(query: $closedQuery, type: ISSUE, first: 1) {
			issueCount
		}
	}
`;

const toDateOnly = (iso: string): string => iso.slice(0, 10);

/** Fetches merged/open pull request and opened/closed issue counts in one query. */
const fetchSearchCounts = async (
  fetchImpl: typeof globalThis.fetch,
  token: string,
  window: DashboardStatWindow,
): Promise<z.infer<typeof SearchCountsSchema>> => {
  const since = toDateOnly(window.from);

  return requestGraphql(
    fetchImpl,
    token,
    SEARCH_COUNTS_QUERY,
    {
      mergedQuery: `author:${GITHUB_LOGIN} is:pr is:merged merged:>=${since}`,
      openQuery: `author:${GITHUB_LOGIN} is:pr is:open`,
      openedQuery: `author:${GITHUB_LOGIN} is:issue created:>=${since}`,
      closedQuery: `author:${GITHUB_LOGIN} is:issue is:closed closed:>=${since}`,
    },
    SearchCountsSchema,
  );
};

const GithubProfileSchema = z.object({
  followers: z.number(),
  public_repos: z.number(),
});

/** Fetches follower and public repository counts from the REST profile endpoint. */
const fetchProfile = async (
  fetchImpl: typeof globalThis.fetch,
  token: string,
): Promise<{ followers: number; publicRepositories: number }> => {
  const response = await fetchImpl(`${GITHUB_REST_URL}/users/${GITHUB_LOGIN}`, {
    headers: buildHeaders(token),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });

  if (!response.ok) {
    throw new Error(`GitHub profile request failed with status ${response.status}`);
  }

  const parsed = GithubProfileSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('GitHub profile response did not match the expected shape.');
  }

  return { followers: parsed.data.followers, publicRepositories: parsed.data.public_repos };
};

const RepositoriesPageSchema = z.object({
  user: z.object({
    repositories: z.object({
      pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
      nodes: z.array(z.object({ stargazerCount: z.number() })),
    }),
  }),
});

const REPOSITORIES_QUERY = `
	query($login: String!, $cursor: String) {
		user(login: $login) {
			repositories(ownerAffiliations: OWNER, first: ${STARGAZER_PAGE_SIZE}, after: $cursor) {
				pageInfo {
					hasNextPage
					endCursor
				}
				nodes {
					stargazerCount
				}
			}
		}
	}
`;

/**
 * Sums stargazers across every owned repository, paginating up to
 * `MAX_STARGAZER_PAGES` pages. If the cap is hit before the last page, the
 * partial sum is returned rather than looping indefinitely.
 */
const fetchTotalStars = async (
  fetchImpl: typeof globalThis.fetch,
  token: string,
): Promise<number> => {
  let cursor: string | null = null;
  let total = 0;

  for (let page = 0; page < MAX_STARGAZER_PAGES; page += 1) {
    const data: z.infer<typeof RepositoriesPageSchema> = await requestGraphql(
      fetchImpl,
      token,
      REPOSITORIES_QUERY,
      { login: GITHUB_LOGIN, cursor },
      RepositoriesPageSchema,
    );

    total += data.user.repositories.nodes.reduce((sum, node) => sum + node.stargazerCount, 0);

    if (!data.user.repositories.pageInfo.hasNextPage) return total;

    cursor = data.user.repositories.pageInfo.endCursor;
  }

  return total;
};

/**
 * Fetches Steve's GitHub activity for the given window: commit, pull request,
 * issue, and review totals, the top repositories by commits, and
 * profile-level totals like followers, public repositories, and stars.
 */
export const fetchGithubStats = async (
  fetchImpl: typeof globalThis.fetch,
  window: DashboardStatWindow,
): Promise<GithubStats> => {
  const token = env.GITHUB_DASHBOARD_TOKEN || env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      'Set GITHUB_DASHBOARD_TOKEN (or GITHUB_TOKEN) to enable the GitHub section of the dashboard.',
    );
  }

  const [
    totalCommitContributions,
    privateContributionsLastYear,
    totalReviewContributions,
    byRepository,
    searchCounts,
    profile,
    totalStars,
  ] = await Promise.all([
    fetchContributionsScalar(
      fetchImpl,
      token,
      window,
      TOTAL_COMMIT_CONTRIBUTIONS_QUERY,
      (scalars) => scalars.totalCommitContributions,
    ),
    fetchContributionsScalar(
      fetchImpl,
      token,
      window,
      RESTRICTED_CONTRIBUTIONS_QUERY,
      (scalars) => scalars.restrictedContributionsCount,
    ),
    fetchContributionsScalar(
      fetchImpl,
      token,
      window,
      TOTAL_REVIEW_CONTRIBUTIONS_QUERY,
      (scalars) => scalars.totalPullRequestReviewContributions,
    ),
    fetchRepositoryCommits(fetchImpl, token, window),
    fetchSearchCounts(fetchImpl, token, window),
    fetchProfile(fetchImpl, token),
    fetchTotalStars(fetchImpl, token),
  ]);

  return {
    login: GITHUB_LOGIN,
    profileUrl: GITHUB_PROFILE_URL,
    followers: profile.followers,
    publicRepositories: profile.publicRepositories,
    totalStars,
    pullRequests: {
      openNow: searchCounts.openNow.issueCount,
      mergedLastYear: searchCounts.mergedLastYear.issueCount,
    },
    commits: {
      totalLastYear: totalCommitContributions,
      privateContributionsLastYear,
      byRepository,
    },
    issues: {
      openedLastYear: searchCounts.openedLastYear.issueCount,
      closedLastYear: searchCounts.closedLastYear.issueCount,
    },
    reviews: {
      totalLastYear: totalReviewContributions,
    },
  };
};
