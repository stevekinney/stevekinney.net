import { author, title as siteTitle, url } from '$lib/metadata';
import { getDashboardData } from '$lib/server/dashboard';
import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';
import prettier from 'prettier';

import type { CourseUpdate } from '$lib/dashboard-types';
import type { Element } from 'hast';
import type { Config } from '@sveltejs/adapter-vercel';

export const prerender = false;

// Deliberately NOT Vercel ISR: prerender functions strip non-200 response
// bodies (adapter-vercel cannot set exposeErrBody), and this route's 503
// path carries an explanatory body. The s-maxage + stale-while-revalidate
// headers on success responses provide the 24-hour edge cache instead.
//
// maxDuration is raised because a cold compute fans out to GitHub GraphQL
// (serialized to avoid its secondary rate limit — see github.ts), GitHub
// REST, and the npm registry; measured live, that combination exceeded
// Vercel's 15-second default and 504'd before ever producing a response.
export const config: Config = { maxDuration: 60 };

const FEED_TITLE = 'Steve Kinney — Dashboard: Course Updates';

const FAILURE_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store',
  'Retry-After': '300',
};

/** First non-empty line of a commit message, used as the entry summary. */
const firstLine = (message: string): string => message.trim().split('\n')[0]?.trim() ?? '';

/** Builds a single Atom entry for a course's latest commit. */
const buildEntry = (course: CourseUpdate): Element => {
  const commit = course.lastCommit;
  const link = `${url}${course.path}`;
  const published = new Date(course.lastUpdatedAt).toISOString();
  const summary = (commit && firstLine(commit.message)) || course.description;

  return h('entry', [
    h('title', `${course.title} updated`),
    h('summary', summary),
    h('link', { type: 'text/html', href: link }),
    h('id', `${link}#commit-${commit?.sha}`),
    h('published', published),
    h('updated', published),
    h('author', [h('name', author), h('uri', url)]),
  ]);
};

/**
 * Serves an Atom feed of the most recent commit to each course.
 *
 * Responds with a plain-text 503 when the courses section failed to
 * resolve; GitHub and npm section status have no bearing on this feed.
 */
export const GET = async (): Promise<Response> => {
  const data = await getDashboardData();

  if (data.courses.status === 'error') {
    return new Response('Course updates are temporarily unavailable.', {
      status: 503,
      headers: FAILURE_HEADERS,
    });
  }

  const courses = [...data.courses.data]
    .filter((course) => course.lastCommit !== null)
    .sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

  const updated = new Date(courses[0]?.lastUpdatedAt ?? data.generatedAt);

  const feed = h('feed', { xmlns: 'http://www.w3.org/2005/Atom' }, [
    h('title', FEED_TITLE),
    h('subtitle', 'Recent commits across the courses in this repository.'),
    h('author', [h('name', author)]),
    h('id', `${url}/dashboard/rss`),
    h('link', { type: 'text/html', href: `${url}/dashboard` }),
    h('updated', updated.toISOString()),
    h('rights', `Copyright © ${new Date().getFullYear()}, ${siteTitle}`),
    ...courses.map(buildEntry),
  ]);

  const xml = await prettier.format(`<?xml version="1.0" encoding="utf-8"?>\n${toHtml(feed)}`, {
    parser: 'html',
    printWidth: 100,
    tabWidth: 2,
    htmlWhitespaceSensitivity: 'ignore',
  });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'Last-Modified': updated.toUTCString(),
      'X-Robots-Tag': 'all',
      'Content-Length': Buffer.byteLength(xml).toString(),
      ETag: `W/"${updated.getTime()}"`,
    },
  });
};
