import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ GITHUB_DASHBOARD_TOKEN: '', GITHUB_TOKEN: '' }));
vi.mock('$env/dynamic/private', () => ({ env }));

const content = vi.hoisted(() => ({
  getCourseIndex: vi.fn(),
  getGeneratedContent: vi.fn(),
}));
vi.mock('$lib/server/content', () => content);

import { fetchCourseUpdates } from './courses';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const courseEntry = (overrides: Record<string, unknown> = {}) => {
  const slug = (overrides.slug as string | undefined) ?? 'course-a';

  return {
    title: 'Course Title',
    description: 'Course description',
    date: '2025-01-01',
    modified: '2025-02-01',
    slug,
    sourcePath: `courses/${slug}/README.md`,
    sourceHash: 'hash',
    path: `/courses/${slug}`,
    ...overrides,
  };
};

const commit = (overrides: Record<string, unknown> = {}) => ({
  sha: 'abc123',
  html_url: 'https://github.com/stevekinney/stevekinney.net/commit/abc123',
  commit: {
    message: 'Update lesson\n\nMore detail here.',
    committer: { date: '2026-03-01T00:00:00.000Z' },
  },
  ...overrides,
});

describe('fetchCourseUpdates', () => {
  beforeEach(() => {
    env.GITHUB_DASHBOARD_TOKEN = '';
    env.GITHUB_TOKEN = '';
    content.getGeneratedContent.mockReturnValue({ lessons: [] });
  });

  it('maps the latest commit to a course update, taking only the first message line', async () => {
    content.getCourseIndex.mockReturnValue([courseEntry()]);
    content.getGeneratedContent.mockReturnValue({
      lessons: [
        { slug: 'lesson-1', courseSlug: 'course-a' },
        { slug: 'lesson-2', courseSlug: 'course-a' },
        { slug: 'lesson-3', courseSlug: 'other-course' },
      ],
    });

    const fetchMock = vi.fn(async () => jsonResponse([commit()]));

    const [update] = await fetchCourseUpdates(fetchMock);

    expect(update).toEqual({
      slug: 'course-a',
      title: 'Course Title',
      description: 'Course description',
      path: '/courses/course-a',
      lessonCount: 2,
      lastUpdatedAt: '2026-03-01T00:00:00.000Z',
      lastCommit: {
        message: 'Update lesson',
        url: 'https://github.com/stevekinney/stevekinney.net/commit/abc123',
        sha: 'abc123',
      },
    });
  });

  it('requests the commits API with the URL-encoded course directory', async () => {
    content.getCourseIndex.mockReturnValue([
      courseEntry({ sourcePath: 'courses/foo bar/README.md' }),
    ]);
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse([commit()]),
    );

    await fetchCourseUpdates(fetchMock);

    const [url] = fetchMock.mock.calls[0] ?? [];
    const expectedUrl =
      'https://api.github.com/repos/stevekinney/stevekinney.net/commits' +
      '?path=courses%2Ffoo%20bar&per_page=1';
    expect(String(url)).toBe(expectedUrl);
  });

  it('adds an Authorization header only when a token is configured', async () => {
    content.getCourseIndex.mockReturnValue([courseEntry()]);
    const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse([commit()]),
    );

    await fetchCourseUpdates(fetchMock);
    const [, initWithoutToken] = fetchMock.mock.calls[0] ?? [];
    const headersWithoutToken = initWithoutToken?.headers as Record<string, string> | undefined;
    expect(headersWithoutToken?.Authorization).toBeUndefined();

    fetchMock.mockClear();
    env.GITHUB_DASHBOARD_TOKEN = 'test-token';

    await fetchCourseUpdates(fetchMock);
    const [, initWithToken] = fetchMock.mock.calls[0] ?? [];
    const headersWithToken = initWithToken?.headers as Record<string, string> | undefined;
    expect(headersWithToken?.Authorization).toBe('Bearer test-token');
  });

  it('falls back to frontmatter modified when a course has no commits', async () => {
    content.getCourseIndex.mockReturnValue([
      courseEntry({ slug: 'course-b', date: '2025-01-01', modified: '2025-06-01' }),
    ]);
    const fetchMock = vi.fn(async () => jsonResponse([]));

    const [update] = await fetchCourseUpdates(fetchMock);

    expect(update?.lastCommit).toBeNull();
    expect(update?.lastUpdatedAt).toBe('2025-06-01');
  });

  it('falls back to frontmatter date when modified is empty and the request failed', async () => {
    content.getCourseIndex.mockReturnValue([
      courseEntry({ slug: 'course-c', date: '2025-01-01', modified: '' }),
      courseEntry({ slug: 'course-d' }),
    ]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('course-c')) throw new Error('network down');
      return jsonResponse([commit()]);
    });

    const updates = await fetchCourseUpdates(fetchMock);
    const failed = updates.find((update) => update.slug === 'course-c');

    expect(failed?.lastCommit).toBeNull();
    expect(failed?.lastUpdatedAt).toBe('2025-01-01');
  });

  it('throws when every course request fails with a non-2xx response', async () => {
    content.getCourseIndex.mockReturnValue([courseEntry()]);
    const fetchMock = vi.fn(async () => jsonResponse({}, 502));

    await expect(fetchCourseUpdates(fetchMock)).rejects.toThrow(
      'Failed to load commit history for every course.',
    );
  });

  it('throws only when every course request fails', async () => {
    content.getCourseIndex.mockReturnValue([
      courseEntry({ slug: 'course-a' }),
      courseEntry({ slug: 'course-b' }),
    ]);
    const fetchMock = vi.fn(async () => {
      throw new Error('network down');
    });

    await expect(fetchCourseUpdates(fetchMock)).rejects.toThrow(
      'Failed to load commit history for every course.',
    );
  });

  it('does not throw when only some course requests fail', async () => {
    content.getCourseIndex.mockReturnValue([
      courseEntry({ slug: 'course-a', modified: '2025-05-01' }),
      courseEntry({ slug: 'course-b', modified: '2025-06-01' }),
    ]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('course-a')) throw new Error('network down');
      return jsonResponse([commit()]);
    });

    const updates = await fetchCourseUpdates(fetchMock);

    expect(updates).toHaveLength(2);
    expect(updates.find((update) => update.slug === 'course-a')?.lastCommit).toBeNull();
  });

  it('sorts courses by lastUpdatedAt descending', async () => {
    content.getCourseIndex.mockReturnValue([
      courseEntry({ slug: 'older', modified: '2024-01-01' }),
      courseEntry({ slug: 'newer', modified: '2026-01-01' }),
    ]);
    const fetchMock = vi.fn(async () => jsonResponse([]));

    const updates = await fetchCourseUpdates(fetchMock);

    expect(updates.map((update) => update.slug)).toEqual(['newer', 'older']);
  });
});
