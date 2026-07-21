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

import { GET } from './+server';

const mockGetDashboardData = vi.mocked(getDashboardData);

const okGithub: GithubStats = {
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
};

const okNpm: NpmStats = {
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
};

const okCourses: CourseUpdate[] = [
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

const okSection = <T>(data: T): DashboardSection<T> => ({ status: 'ok', data });
const erroredSection = <T>(error: string): DashboardSection<T> => ({ status: 'error', error });

const buildDashboardData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
  generatedAt: '2026-07-01T00:00:00.000Z',
  window: { from: '2025-07-01T00:00:00.000Z', to: '2026-07-01T00:00:00.000Z' },
  github: okSection(okGithub),
  npm: okSection(okNpm),
  courses: okSection(okCourses),
  ...overrides,
});

beforeEach(() => {
  mockGetDashboardData.mockReset();
});

describe('GET /dashboard/llms.txt', () => {
  it('returns 200 with success headers and every section rendered when all are healthy', async () => {
    const data = buildDashboardData();
    mockGetDashboardData.mockResolvedValue(data);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
    );
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(body).toContain('Last computed: 2026-07-01T00:00:00.000Z');
    expect(body).toContain('stevekinney/website');
    expect(body).toContain('@stevekinney/utilities');
    expect(body).toContain('React and TypeScript');
    expect(body).toContain('https://stevekinney.com/api/dashboard');
    expect(body).toContain('https://stevekinney.com/dashboard/rss');
  });

  it('renders unavailable markers for errored sections and still returns 503', async () => {
    const data = buildDashboardData({ github: erroredSection('GitHub API rate limited') });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(body).toContain('GitHub activity (temporarily unavailable)');
    expect(body).toContain('@stevekinney/utilities');
    expect(body).toContain('React and TypeScript');
  });

  it('renders an unavailable marker for courses and npm independently', async () => {
    const data = buildDashboardData({
      npm: erroredSection('npm registry timed out'),
      courses: erroredSection('git log failed'),
    });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain('npm downloads (temporarily unavailable)');
    expect(body).toContain('Course updates (temporarily unavailable)');
    expect(body).toContain('stevekinney/website');
  });

  it('renders a no-commits message when the courses section is ok but empty', async () => {
    const data = buildDashboardData({ courses: okSection([]) });
    mockGetDashboardData.mockResolvedValue(data);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('No recent course commits.');
  });
});
