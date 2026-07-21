import { describe, expect, it } from 'vitest';

import { isDashboardData } from './dashboard-data-schema';

const validData = {
  generatedAt: '2026-07-20T00:00:00.000Z',
  window: { from: '2025-07-20T00:00:00.000Z', to: '2026-07-20T00:00:00.000Z' },
  github: {
    status: 'ok',
    data: {
      login: 'stevekinney',
      profileUrl: 'https://github.com/stevekinney',
      followers: 10,
      publicRepositories: 20,
      totalStars: 30,
      pullRequests: { openNow: 1, mergedLastYear: 2 },
      commits: {
        totalLastYear: 3,
        privateContributionsLastYear: 4,
        byRepository: [
          {
            nameWithOwner: 'stevekinney/example',
            url: 'https://github.com/x',
            stargazerCount: 1,
            commits: 5,
          },
        ],
      },
      issues: { openedLastYear: 6, closedLastYear: 7 },
      reviews: { totalLastYear: 8 },
    },
  },
  npm: {
    status: 'ok',
    data: {
      packageCount: 1,
      totalDownloadsLastYear: 100,
      topPackages: [
        {
          name: 'phone-formatter',
          version: '0.0.2',
          url: 'https://npmjs.com/x',
          downloadsLastYear: 100,
        },
      ],
    },
  },
  courses: {
    status: 'ok',
    data: [
      {
        slug: 'testing',
        title: 'Introduction to Testing',
        description: 'A course.',
        path: '/courses/testing',
        lessonCount: 80,
        lastUpdatedAt: '2026-06-01T00:00:00.000Z',
        lastCommit: { message: 'Update', url: 'https://github.com/x/commit/abc', sha: 'abc' },
      },
    ],
  },
};

describe('isDashboardData', () => {
  it('accepts a fully populated, valid response', () => {
    expect(isDashboardData(validData)).toBe(true);
  });

  it('accepts an errored section with no data field', () => {
    const withError = { ...validData, github: { status: 'error', error: 'boom' } };

    expect(isDashboardData(withError)).toBe(true);
  });

  it('accepts a null lastCommit on a course update', () => {
    const withNullCommit = {
      ...validData,
      courses: {
        status: 'ok',
        data: [{ ...validData.courses.data[0], lastCommit: null }],
      },
    };

    expect(isDashboardData(withNullCommit)).toBe(true);
  });

  it('accepts a package with no description', () => {
    const withoutDescription = {
      ...validData,
      npm: {
        status: 'ok',
        data: {
          ...validData.npm.data,
          topPackages: [
            { name: 'phone-formatter', version: '0.0.2', url: 'x', downloadsLastYear: 1 },
          ],
        },
      },
    };

    expect(isDashboardData(withoutDescription)).toBe(true);
  });

  it('rejects a non-object payload', () => {
    expect(isDashboardData(null)).toBe(false);
    expect(isDashboardData('nope')).toBe(false);
    expect(isDashboardData(42)).toBe(false);
  });

  it('rejects a section missing both data and error', () => {
    const malformed = { ...validData, npm: { status: 'ok' } };

    expect(isDashboardData(malformed)).toBe(false);
  });

  it('rejects a section with an unknown status', () => {
    const malformed = { ...validData, courses: { status: 'pending', data: [] } };

    expect(isDashboardData(malformed)).toBe(false);
  });

  it('rejects when a required numeric field is a string', () => {
    const malformed = {
      ...validData,
      github: {
        status: 'ok',
        data: { ...validData.github.data, followers: '10' },
      },
    };

    expect(isDashboardData(malformed)).toBe(false);
  });

  it('rejects when commits.byRepository contains a malformed entry', () => {
    const malformed = {
      ...validData,
      github: {
        status: 'ok',
        data: {
          ...validData.github.data,
          commits: {
            ...validData.github.data.commits,
            byRepository: [{ nameWithOwner: 'x', url: 'y', stargazerCount: 1 }],
          },
        },
      },
    };

    expect(isDashboardData(malformed)).toBe(false);
  });
});
