import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardStatWindow } from '$lib/dashboard-types';

const env = vi.hoisted(() => ({
  GITHUB_DASHBOARD_TOKEN: '',
  GITHUB_TOKEN: '',
}));

vi.mock('$env/dynamic/private', () => ({ env }));

import { fetchGithubStats } from './github';

const WINDOW: DashboardStatWindow = {
  from: '2025-07-20T00:00:00.000Z',
  to: '2026-07-20T00:00:00.000Z',
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const DEFAULT_REPO = {
  nameWithOwner: 'stevekinney/example',
  url: 'https://github.com/stevekinney/example',
  stargazerCount: 5,
  isPrivate: false,
};

type GraphqlCall = { query: string; variables: Record<string, unknown> };

const parseGraphqlBody = (body: unknown): GraphqlCall => JSON.parse(String(body));

type Handlers = {
  profile?: () => Response;
  totalCommitContributions?: () => Response;
  restrictedContributionsCount?: () => Response;
  totalPullRequestReviewContributions?: () => Response;
  commitContributionsByRepository?: (call: GraphqlCall) => Response;
  searchCounts?: () => Response;
  repositories?: (call: GraphqlCall) => Response;
};

/** Builds a fetch stub for every request `fetchGithubStats` makes, with overridable handlers. */
const buildFetchMock = (handlers: Handlers = {}) =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);

    if (url === 'https://api.github.com/users/stevekinney') {
      return (handlers.profile ?? (() => jsonResponse({ followers: 10, public_repos: 20 })))();
    }

    if (url !== 'https://api.github.com/graphql') {
      throw new Error(`Unhandled fetch: ${url}`);
    }

    const call = parseGraphqlBody(init?.body);

    if (call.query.includes('totalCommitContributions')) {
      return (
        handlers.totalCommitContributions ??
        (() =>
          jsonResponse({
            data: { user: { contributionsCollection: { totalCommitContributions: 100 } } },
          }))
      )();
    }

    if (call.query.includes('restrictedContributionsCount')) {
      return (
        handlers.restrictedContributionsCount ??
        (() =>
          jsonResponse({
            data: { user: { contributionsCollection: { restrictedContributionsCount: 7 } } },
          }))
      )();
    }

    if (call.query.includes('totalPullRequestReviewContributions')) {
      return (
        handlers.totalPullRequestReviewContributions ??
        (() =>
          jsonResponse({
            data: {
              user: { contributionsCollection: { totalPullRequestReviewContributions: 3 } },
            },
          }))
      )();
    }

    if (call.query.includes('commitContributionsByRepository')) {
      return (
        handlers.commitContributionsByRepository ??
        (() =>
          jsonResponse({
            data: {
              user: {
                contributionsCollection: {
                  commitContributionsByRepository: [
                    { repository: DEFAULT_REPO, contributions: { totalCount: 1 } },
                  ],
                },
              },
            },
          }))
      )(call);
    }

    if (call.query.includes('mergedLastYear:')) {
      return (
        handlers.searchCounts ??
        (() =>
          jsonResponse({
            data: {
              mergedLastYear: { issueCount: 1 },
              openNow: { issueCount: 2 },
              openedLastYear: { issueCount: 3 },
              closedLastYear: { issueCount: 4 },
            },
          }))
      )();
    }

    if (call.query.includes('repositories(ownerAffiliations')) {
      return (
        handlers.repositories ??
        (() =>
          jsonResponse({
            data: {
              user: {
                repositories: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [{ stargazerCount: 5 }, { stargazerCount: 5 }],
                },
              },
            },
          }))
      )(call);
    }

    throw new Error(`Unhandled GraphQL query: ${call.query}`);
  });

describe('fetchGithubStats', () => {
  beforeEach(() => {
    env.GITHUB_DASHBOARD_TOKEN = '';
    env.GITHUB_TOKEN = '';
  });

  it('throws when no token is configured', async () => {
    const fetchMock = vi.fn();

    await expect(fetchGithubStats(fetchMock, WINDOW)).rejects.toThrow(
      'Set GITHUB_DASHBOARD_TOKEN (or GITHUB_TOKEN) to enable the GitHub section of the dashboard.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to GITHUB_TOKEN when GITHUB_DASHBOARD_TOKEN is unset', async () => {
    env.GITHUB_TOKEN = 'fallback-token';
    const fetchMock = buildFetchMock();

    const stats = await fetchGithubStats(fetchMock, WINDOW);
    expect(stats.login).toBe('stevekinney');
  });

  it('returns the full stats shape on a happy path', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    const fetchMock = buildFetchMock();

    const stats = await fetchGithubStats(fetchMock, WINDOW);

    expect(stats.login).toBe('stevekinney');
    expect(stats.profileUrl).toBe('https://github.com/stevekinney');
    expect(stats.followers).toBe(10);
    expect(stats.publicRepositories).toBe(20);
    expect(stats.commits.totalLastYear).toBe(100);
    expect(stats.commits.privateContributionsLastYear).toBe(7);
    expect(stats.reviews.totalLastYear).toBe(3);
    expect(stats.totalStars).toBe(10);
  });

  it('throws including the status code on a non-2xx response', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    const fetchMock = buildFetchMock({ profile: () => jsonResponse({ message: 'nope' }, 503) });

    await expect(fetchGithubStats(fetchMock, WINDOW)).rejects.toThrow(/503/);
  });

  it('throws the first message when the GraphQL errors array is non-empty', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    const fetchMock = buildFetchMock({
      searchCounts: () => jsonResponse({ errors: [{ message: 'boom' }, { message: 'other' }] }),
    });

    await expect(fetchGithubStats(fetchMock, WINDOW)).rejects.toThrow('boom');
  });

  it('throws when a GraphQL response does not match the expected shape', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    const fetchMock = buildFetchMock({
      totalCommitContributions: () => jsonResponse({ data: { user: {} } }),
    });

    await expect(fetchGithubStats(fetchMock, WINDOW)).rejects.toThrow(
      /did not match the expected shape/,
    );
  });

  it('throws when the profile response does not match the expected shape', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    const fetchMock = buildFetchMock({ profile: () => jsonResponse({ nope: true }) });

    await expect(fetchGithubStats(fetchMock, WINDOW)).rejects.toThrow(
      'GitHub profile response did not match the expected shape.',
    );
  });

  it('maps each search alias to its corresponding pull request or issue stat', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    const fetchMock = buildFetchMock({
      searchCounts: () =>
        jsonResponse({
          data: {
            mergedLastYear: { issueCount: 11 },
            openNow: { issueCount: 22 },
            openedLastYear: { issueCount: 33 },
            closedLastYear: { issueCount: 44 },
          },
        }),
    });

    const stats = await fetchGithubStats(fetchMock, WINDOW);

    expect(stats.pullRequests).toEqual({ mergedLastYear: 11, openNow: 22 });
    expect(stats.issues).toEqual({ openedLastYear: 33, closedLastYear: 44 });
  });

  it('stitches twelve monthly windows, aggregating commits by repository', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';

    const repositories = Array.from({ length: 12 }, (_, index) => ({
      repository: {
        nameWithOwner: `stevekinney/repo-${index + 1}`,
        url: `https://github.com/stevekinney/repo-${index + 1}`,
        stargazerCount: index,
        isPrivate: false,
      },
      contributions: { totalCount: index + 1 },
    }));

    const fetchMock = buildFetchMock({
      commitContributionsByRepository: () =>
        jsonResponse({
          data: {
            user: { contributionsCollection: { commitContributionsByRepository: repositories } },
          },
        }),
    });

    const stats = await fetchGithubStats(fetchMock, WINDOW);
    const byRepository = stats.commits.byRepository;

    expect(byRepository).toHaveLength(10);
    expect(byRepository[0]).toEqual({
      nameWithOwner: 'stevekinney/repo-12',
      url: 'https://github.com/stevekinney/repo-12',
      stargazerCount: 11,
      commits: 144,
    });
    expect(byRepository.at(-1)).toEqual({
      nameWithOwner: 'stevekinney/repo-3',
      url: 'https://github.com/stevekinney/repo-3',
      stargazerCount: 2,
      commits: 36,
    });
    expect(byRepository.some((repo) => repo.nameWithOwner === 'stevekinney/repo-1')).toBe(false);
    expect(byRepository.some((repo) => repo.nameWithOwner === 'stevekinney/repo-2')).toBe(false);

    const commitCalls = fetchMock.mock.calls.filter(([url, init]) => {
      if (String(url) !== 'https://api.github.com/graphql') return false;
      return parseGraphqlBody(init?.body).query.includes('commitContributionsByRepository');
    });
    expect(commitCalls).toHaveLength(12);

    const firstWindow = parseGraphqlBody(commitCalls[0]?.[1]?.body).variables;
    const lastWindow = parseGraphqlBody(commitCalls[11]?.[1]?.body).variables;
    expect(firstWindow.from).toBe(WINDOW.from);
    expect(lastWindow.to).toBe(WINDOW.to);
  });

  it('stops requesting monthly commit windows after the first failure', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    let commitRequestCount = 0;

    const fetchMock = buildFetchMock({
      commitContributionsByRepository: () => {
        commitRequestCount += 1;
        return jsonResponse({ message: 'secondary rate limit' }, 403);
      },
    });

    await expect(fetchGithubStats(fetchMock, WINDOW)).rejects.toThrow(/403/);
    expect(commitRequestCount).toBe(1);
  });

  it('excludes private repositories from the public commits-by-repository breakdown', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';

    const repositories = [
      {
        repository: {
          nameWithOwner: 'stevekinney/public-repo',
          url: 'https://github.com/stevekinney/public-repo',
          stargazerCount: 3,
          isPrivate: false,
        },
        contributions: { totalCount: 5 },
      },
      {
        repository: {
          nameWithOwner: 'stevekinney/secret-repo',
          url: 'https://github.com/stevekinney/secret-repo',
          stargazerCount: 0,
          isPrivate: true,
        },
        contributions: { totalCount: 99 },
      },
    ];

    const fetchMock = buildFetchMock({
      commitContributionsByRepository: () =>
        jsonResponse({
          data: {
            user: { contributionsCollection: { commitContributionsByRepository: repositories } },
          },
        }),
    });

    const stats = await fetchGithubStats(fetchMock, WINDOW);

    expect(stats.commits.byRepository).toEqual([
      {
        nameWithOwner: 'stevekinney/public-repo',
        url: 'https://github.com/stevekinney/public-repo',
        stargazerCount: 3,
        commits: 60,
      },
    ]);
    expect(
      stats.commits.byRepository.some((repo) => repo.nameWithOwner === 'stevekinney/secret-repo'),
    ).toBe(false);
  });

  it('never issues concurrent GraphQL requests', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'token';

    let inFlight = 0;
    let maxInFlight = 0;

    const base = buildFetchMock();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) !== 'https://api.github.com/graphql') return base(input, init);

      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise((resolve) => setTimeout(resolve, 0));

      inFlight -= 1;

      return base(input, init);
    });

    await fetchGithubStats(fetchMock, WINDOW);

    const graphqlCalls = fetchMock.mock.calls.filter(
      ([input]) => String(input) === 'https://api.github.com/graphql',
    );
    expect(graphqlCalls.length).toBeGreaterThanOrEqual(17);
    expect(maxInFlight).toBe(1);
  });

  it('paginates stargazer totals across pages until hasNextPage is false', async () => {
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';
    let page = 0;

    const fetchMock = buildFetchMock({
      repositories: () => {
        page += 1;

        if (page === 1) {
          return jsonResponse({
            data: {
              user: {
                repositories: {
                  pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
                  nodes: [{ stargazerCount: 3 }, { stargazerCount: 4 }],
                },
              },
            },
          });
        }

        return jsonResponse({
          data: {
            user: {
              repositories: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [{ stargazerCount: 5 }],
              },
            },
          },
        });
      },
    });

    const stats = await fetchGithubStats(fetchMock, WINDOW);
    expect(stats.totalStars).toBe(12);
  });

  it('builds monotonically increasing monthly windows even when `to` falls on a day short months lack', async () => {
    // `to` is the 31st: naively subtracting months with `setUTCMonth` would
    // roll "February 31st" forward into early March, since Feb never has 31
    // days — this window spans a February, so it exercises that overflow.
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';

    const overflowWindow: DashboardStatWindow = {
      from: '2025-07-31T00:00:00.000Z',
      to: '2026-07-31T00:00:00.000Z',
    };

    const fetchMock = buildFetchMock();

    await fetchGithubStats(fetchMock, overflowWindow);

    const commitCalls = fetchMock.mock.calls.filter(([callUrl, init]) => {
      if (String(callUrl) !== 'https://api.github.com/graphql') return false;
      return parseGraphqlBody(init?.body).query.includes('commitContributionsByRepository');
    });

    const windows = commitCalls.map(([, init]) => parseGraphqlBody(init?.body).variables);

    expect(windows).toHaveLength(12);
    expect(windows[0].from).toBe(overflowWindow.from);
    expect(windows.at(-1)?.to).toBe(overflowWindow.to);

    for (let index = 0; index < windows.length; index += 1) {
      const from = new Date(windows[index].from as string).getTime();
      const to = new Date(windows[index].to as string).getTime();

      expect(from).toBeLessThan(to);
      if (index > 0) {
        expect(from).toBe(new Date(windows[index - 1].to as string).getTime());
      }
    }
  });
});
