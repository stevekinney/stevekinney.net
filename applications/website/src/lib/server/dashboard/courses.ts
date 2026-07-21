import { env } from '$env/dynamic/private';
import { z } from 'zod';

import type { CourseUpdate } from '$lib/dashboard-types';
import { getCourseIndex, getGeneratedContent } from '$lib/server/content';

const GITHUB_COMMITS_URL = 'https://api.github.com/repos/stevekinney/stevekinney.net/commits';
const REQUEST_TIMEOUT_MILLISECONDS = 10_000;

const GithubCommitSchema = z.object({
  sha: z.string(),
  html_url: z.string(),
  commit: z.object({
    message: z.string(),
    committer: z.object({ date: z.string() }),
  }),
});

const GithubCommitsResponseSchema = z.array(GithubCommitSchema);

type CourseCommit = {
  sha: string;
  url: string;
  message: string;
  lastUpdatedAt: string;
};

/** Strips the trailing filename from a source path, e.g. `courses/x/README.md` → `courses/x`. */
const toRepositoryDirectory = (sourcePath: string): string => {
  const segments = sourcePath.split('/');
  segments.pop();

  return segments.join('/');
};

/**
 * Fetches the most recent commit touching a course's directory. Works
 * unauthenticated — the token is only added when one is configured, and its
 * absence is not treated as a failure here (unlike the GitHub dashboard
 * section, which requires one).
 */
const fetchLatestCourseCommit = async (
  fetchImpl: typeof globalThis.fetch,
  token: string | undefined,
  directory: string,
): Promise<CourseCommit | null> => {
  const url = `${GITHUB_COMMITS_URL}?path=${encodeURIComponent(directory)}&per_page=1`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'stevekinney.net-dashboard',
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchImpl(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });

  if (!response.ok) {
    const status = response.status;
    throw new Error(`GitHub commits request for ${directory} failed with status ${status}`);
  }

  const parsed = GithubCommitsResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(`GitHub commits response for ${directory} did not match the expected shape.`);
  }

  const [latest] = parsed.data;
  if (!latest) return null;

  return {
    sha: latest.sha,
    url: latest.html_url,
    message: latest.commit.message.split('\n')[0],
    lastUpdatedAt: latest.commit.committer.date,
  };
};

/**
 * Fetches every course, annotated with its latest commit and lesson count.
 * A course with no commits (or a failed request for it) falls back to the
 * entry's frontmatter `modified` (or `date`) for `lastUpdatedAt` and reports
 * `lastCommit: null`. Throws only when every course's request failed — that
 * signals an outage worth reporting rather than silently showing stale
 * frontmatter for the whole section.
 */
export const fetchCourseUpdates = async (
  fetchImpl: typeof globalThis.fetch,
): Promise<CourseUpdate[]> => {
  const token = env.GITHUB_DASHBOARD_TOKEN || env.GITHUB_TOKEN;
  const entries = getCourseIndex();
  const lessons = getGeneratedContent().lessons;

  const settled = await Promise.allSettled(
    entries.map((entry) =>
      fetchLatestCourseCommit(fetchImpl, token, toRepositoryDirectory(entry.sourcePath)),
    ),
  );

  if (entries.length > 0 && settled.every((result) => result.status === 'rejected')) {
    throw new Error('Failed to load commit history for every course.');
  }

  const lessonCountsBySlug = new Map<string, number>();
  for (const lesson of lessons) {
    lessonCountsBySlug.set(lesson.courseSlug, (lessonCountsBySlug.get(lesson.courseSlug) ?? 0) + 1);
  }

  const courseUpdates = entries.map((entry, index) => {
    const result = settled[index];
    const commit = result?.status === 'fulfilled' ? result.value : null;
    const lessonCount = lessonCountsBySlug.get(entry.slug) ?? 0;

    return {
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      path: entry.path,
      lessonCount,
      lastUpdatedAt: commit?.lastUpdatedAt ?? (entry.modified || entry.date),
      lastCommit: commit ? { message: commit.message, url: commit.url, sha: commit.sha } : null,
    };
  });

  return courseUpdates.sort(
    (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime(),
  );
};
