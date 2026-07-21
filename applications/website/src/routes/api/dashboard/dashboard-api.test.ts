import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CourseUpdate,
  DashboardData,
  DashboardSection,
  GithubStats,
  NpmStats,
} from '$lib/dashboard-types';

vi.mock('$lib/server/dashboard', () => ({
  getDashboardData: vi.fn(),
  isDashboardComplete: (data: DashboardData): boolean =>
    data.github.status === 'ok' && data.npm.status === 'ok' && data.courses.status === 'ok',
}));

import { getDashboardData } from '$lib/server/dashboard';

import { GET as getCourses } from './courses/+server';
import { GET as getGithub } from './github/+server';
import { GET as getNpm } from './npm/+server';
import { GET as getDashboard } from './+server';

const mockGetDashboardData = vi.mocked(getDashboardData);

const okGithub: DashboardSection<GithubStats> = {
  status: 'ok',
  data: {
    login: 'stevekinney',
    profileUrl: 'https://github.com/stevekinney',
    followers: 100,
    publicRepositories: 42,
    totalStars: 500,
    pullRequests: { openNow: 3, mergedLastYear: 40 },
    commits: {
      totalLastYear: 900,
      privateContributionsLastYear: 200,
      byRepository: [
        {
          nameWithOwner: 'stevekinney/website',
          url: 'https://github.com/stevekinney/website',
          stargazerCount: 12,
          commits: 300,
        },
      ],
    },
    issues: { openedLastYear: 10, closedLastYear: 9 },
    reviews: { totalLastYear: 20 },
  },
};

const okNpm: DashboardSection<NpmStats> = {
  status: 'ok',
  data: {
    packageCount: 5,
    totalDownloadsLastYear: 10000,
    topPackages: [
      {
        name: '@stevekinney/utilities',
        version: '1.0.0',
        url: 'https://www.npmjs.com/package/@stevekinney/utilities',
        downloadsLastYear: 4000,
      },
    ],
  },
};

const okCourseUpdates: CourseUpdate[] = [
  {
    slug: 'react-typescript',
    title: 'React and TypeScript',
    description: 'Learn React with TypeScript.',
    path: '/courses/react-typescript',
    lessonCount: 20,
    lastUpdatedAt: '2026-06-01T00:00:00.000Z',
    lastCommit: {
      message: 'Fix typo in lesson three',
      url: 'https://github.com/stevekinney/course/commit/abc123',
      sha: 'abc123',
    },
  },
];

const okCourses: DashboardSection<CourseUpdate[]> = { status: 'ok', data: okCourseUpdates };

/** Builds a complete, all-sections-healthy dashboard snapshot for tests. */
const buildDashboardData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
  generatedAt: '2026-07-01T00:00:00.000Z',
  window: { from: '2025-07-01T00:00:00.000Z', to: '2026-07-01T00:00:00.000Z' },
  github: okGithub,
  npm: okNpm,
  courses: okCourses,
  ...overrides,
});

const erroredSection = <T>(message: string): DashboardSection<T> => ({
  status: 'error',
  error: message,
});

beforeEach(() => {
  mockGetDashboardData.mockReset();
});

describe('GET /api/dashboard', () => {
  it('returns 200 with success headers when every section is healthy', async () => {
    const data = buildDashboardData();
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getDashboard();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Retry-After')).toBeNull();
    expect(body).toEqual(data);
  });

  it('returns 503 with no-store headers when a section errored, keeping the full body', async () => {
    const data = buildDashboardData({ npm: erroredSection('npm registry timed out') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getDashboard();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(body.github.status).toBe('ok');
    expect(body.npm.status).toBe('error');
    expect(body.courses.status).toBe('ok');
  });
});

describe('GET /api/dashboard/github', () => {
  it('returns 200 keyed off the github section even when other sections errored', async () => {
    const data = buildDashboardData({ npm: erroredSection('npm registry timed out') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getGithub();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
    );
    expect(body).toEqual({ generatedAt: data.generatedAt, window: data.window, github: okGithub });
  });

  it('returns 503 when the github section itself errored', async () => {
    const data = buildDashboardData({ github: erroredSection('GitHub API rate limited') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getGithub();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(body.github.status).toBe('error');
  });
});

describe('GET /api/dashboard/npm', () => {
  it('returns 200 keyed off the npm section even when other sections errored', async () => {
    const data = buildDashboardData({ github: erroredSection('GitHub API rate limited') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getNpm();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ generatedAt: data.generatedAt, window: data.window, npm: okNpm });
  });

  it('returns 503 when the npm section itself errored', async () => {
    const data = buildDashboardData({ npm: erroredSection('npm registry timed out') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getNpm();

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('300');
  });
});

describe('GET /api/dashboard/courses', () => {
  it('returns 200 keyed off the courses section even when other sections errored', async () => {
    const data = buildDashboardData({ github: erroredSection('GitHub API rate limited') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getCourses();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      generatedAt: data.generatedAt,
      window: data.window,
      courses: okCourses,
    });
  });

  it('returns 503 when the courses section itself errored', async () => {
    const data = buildDashboardData({ courses: erroredSection('git log failed') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await getCourses();

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('300');
  });
});
