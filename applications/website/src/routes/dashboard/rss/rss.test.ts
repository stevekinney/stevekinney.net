import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CourseUpdate, DashboardData, DashboardSection } from '$lib/dashboard-types';

vi.mock('$lib/server/dashboard', () => ({
  getDashboardData: vi.fn(),
  isDashboardComplete: (data: DashboardData): boolean =>
    data.github.status === 'ok' && data.npm.status === 'ok' && data.courses.status === 'ok',
}));

import { getDashboardData } from '$lib/server/dashboard';

import { GET } from './+server';

const mockGetDashboardData = vi.mocked(getDashboardData);

const okSection = <T>(data: T): DashboardSection<T> => ({ status: 'ok', data });
const erroredSection = <T>(error: string): DashboardSection<T> => ({ status: 'error', error });

const buildCourse = (overrides: Partial<CourseUpdate> = {}): CourseUpdate => ({
  slug: 'testing',
  title: 'Introduction to Testing',
  description: 'Learn how to test your code.',
  path: '/courses/testing',
  lessonCount: 10,
  lastUpdatedAt: '2026-01-01T00:00:00.000Z',
  lastCommit: {
    message: 'Update lesson three\n\nLonger explanation here.',
    url: 'https://github.com/stevekinney/courses/commit/abc123',
    sha: 'abc123',
  },
  ...overrides,
});

const buildDashboardData = (courses: DashboardSection<CourseUpdate[]>): DashboardData => ({
  generatedAt: '2026-07-01T00:00:00.000Z',
  window: { from: '2025-07-01T00:00:00.000Z', to: '2026-07-01T00:00:00.000Z' },
  github: okSection({
    login: 'stevekinney',
    profileUrl: 'https://github.com/stevekinney',
    followers: 1,
    publicRepositories: 1,
    totalStars: 1,
    pullRequests: { openNow: 0, mergedLastYear: 0 },
    commits: { totalLastYear: 0, privateContributionsLastYear: 0, byRepository: [] },
    issues: { openedLastYear: 0, closedLastYear: 0 },
    reviews: { totalLastYear: 0 },
  }),
  npm: okSection({ packageCount: 0, totalDownloadsLastYear: 0, topPackages: [] }),
  courses,
});

/** Pulls the feed-level `<updated>` value, i.e. the one before any entry. */
const feedLevelUpdated = (xml: string): string | undefined => {
  const beforeFirstEntry = xml.split('<entry>')[0];
  return beforeFirstEntry.match(/<updated>([^<]+)<\/updated>/)?.[1];
};

beforeEach(() => {
  mockGetDashboardData.mockReset();
});

describe('GET /dashboard/rss', () => {
  it('renders one entry per course with a commit, sorted by lastUpdatedAt descending', async () => {
    const older = buildCourse({
      slug: 'testing',
      title: 'Introduction to Testing',
      path: '/courses/testing',
      lastUpdatedAt: '2026-01-01T00:00:00.000Z',
      lastCommit: {
        message: 'Fix typo',
        url: 'https://github.com/stevekinney/courses/commit/older',
        sha: 'older-sha',
      },
    });
    const newer = buildCourse({
      slug: 'react-typescript',
      title: 'React and TypeScript',
      path: '/courses/react-typescript',
      lastUpdatedAt: '2026-06-01T00:00:00.000Z',
      lastCommit: {
        message: 'Add new lesson\n\nWith details.',
        url: 'https://github.com/stevekinney/courses/commit/newer',
        sha: 'newer-sha',
      },
    });
    const withoutCommit = buildCourse({
      slug: 'no-commit-yet',
      title: 'Untouched Course',
      path: '/courses/no-commit-yet',
      lastCommit: null,
    });

    mockGetDashboardData.mockResolvedValue(
      buildDashboardData(okSection([older, newer, withoutCommit])),
    );

    const response = await GET();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/atom+xml');
    expect(xml).toContain('React and TypeScript updated');
    expect(xml).toContain('Introduction to Testing updated');
    expect(xml).not.toContain('Untouched Course');
    expect(xml.indexOf('React and TypeScript updated')).toBeLessThan(
      xml.indexOf('Introduction to Testing updated'),
    );
    expect(xml).toContain('https://stevekinney.com/courses/react-typescript#commit-newer-sha');
    expect(xml).toContain('https://stevekinney.com/courses/testing#commit-older-sha');
    expect(xml).toContain('Add new lesson');
    expect(feedLevelUpdated(xml)).toBe('2026-06-01T00:00:00.000Z');
  });

  it('falls back to the commit description and generatedAt when appropriate', async () => {
    const course = buildCourse({
      lastUpdatedAt: '2026-03-01T00:00:00.000Z',
      lastCommit: { message: '', url: 'https://github.com/stevekinney/courses/commit/x', sha: 'x' },
    });

    mockGetDashboardData.mockResolvedValue(buildDashboardData(okSection([course])));

    const response = await GET();
    const xml = await response.text();

    expect(xml).toContain(course.description);
  });

  it('does not crash and falls back to generatedAt when no course has a commit yet', async () => {
    const course = buildCourse({ lastCommit: null });
    const data = buildDashboardData(okSection([course]));
    mockGetDashboardData.mockResolvedValue(data);

    const response = await GET();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).not.toContain('<entry>');
    expect(feedLevelUpdated(xml)).toBe(data.generatedAt);
  });

  it('returns a plain-text 503 when the courses section errored', async () => {
    mockGetDashboardData.mockResolvedValue(buildDashboardData(erroredSection('git log failed')));

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(body).not.toContain('<feed');
  });
});
