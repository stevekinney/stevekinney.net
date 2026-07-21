import { url } from '$lib/metadata';
import { getDashboardData, isDashboardComplete } from '$lib/server/dashboard';

import type {
  CourseUpdate,
  DashboardData,
  DashboardSection,
  GithubStats,
  NpmStats,
} from '$lib/dashboard-types';
import type { Config } from '@sveltejs/adapter-vercel';

export const prerender = false;

// Deliberately NOT Vercel ISR: prerender functions strip non-200 response
// bodies (adapter-vercel cannot set exposeErrBody), and this route serves
// its partial snapshot with a 503. The s-maxage + stale-while-revalidate
// headers on success responses provide the 24-hour edge cache instead.
//
// maxDuration is raised because a cold compute fans out to GitHub GraphQL
// (serialized to avoid its secondary rate limit — see github.ts), GitHub
// REST, and the npm registry; measured live, that combination exceeded
// Vercel's 15-second default and 504'd before ever producing a response.
export const config: Config = { maxDuration: 60 };

const TOP_REPOSITORY_COUNT = 5;

const SUCCESS_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
  'Access-Control-Allow-Origin': '*',
};

const FAILURE_HEADERS = {
  'Cache-Control': 'no-store',
  'Retry-After': '300',
};

/** Renders the GitHub section, or an unavailable marker when it errored. */
const renderGithubSection = (section: DashboardSection<GithubStats>): string[] => {
  if (section.status === 'error') {
    return ['## GitHub', '', '- GitHub activity (temporarily unavailable)', ''];
  }

  const { data } = section;
  const topRepositories = data.commits.byRepository.slice(0, TOP_REPOSITORY_COUNT);

  return [
    '## GitHub',
    '',
    `- [${data.login}](${data.profileUrl}): ${data.followers} followers, ` +
      `${data.publicRepositories} public repositories, ${data.totalStars} total stars.`,
    `- Commits in the last year: ${data.commits.totalLastYear} ` +
      `(${data.commits.privateContributionsLastYear} in private repositories).`,
    `- Pull requests: ${data.pullRequests.openNow} open now, ` +
      `${data.pullRequests.mergedLastYear} merged in the last year.`,
    `- Issues: ${data.issues.openedLastYear} opened, ${data.issues.closedLastYear} closed ` +
      'in the last year.',
    `- Reviews: ${data.reviews.totalLastYear} in the last year.`,
    ...(topRepositories.length > 0
      ? [
          '- Top repositories by commits:',
          ...topRepositories.map(
            (repository) =>
              `  - [${repository.nameWithOwner}](${repository.url}): ${repository.commits} commits, ` +
              `${repository.stargazerCount} stars`,
          ),
        ]
      : []),
    '',
  ];
};

/** Renders the npm section, or an unavailable marker when it errored. */
const renderNpmSection = (section: DashboardSection<NpmStats>): string[] => {
  if (section.status === 'error') {
    return ['## npm', '', '- npm downloads (temporarily unavailable)', ''];
  }

  const { data } = section;

  return [
    '## npm',
    '',
    `- ${data.packageCount} packages, ${data.totalDownloadsLastYear} downloads in the last year.`,
    ...(data.topPackages.length > 0
      ? [
          '- Top packages by downloads:',
          ...data.topPackages.map(
            (pkg) => `  - [${pkg.name}](${pkg.url}): ${pkg.downloadsLastYear} downloads`,
          ),
        ]
      : []),
    '',
  ];
};

/** Renders the course-updates section, or an unavailable marker when it errored. */
const renderCoursesSection = (section: DashboardSection<CourseUpdate[]>): string[] => {
  if (section.status === 'error') {
    return ['## Course Updates', '', '- Course updates (temporarily unavailable)', ''];
  }

  if (section.data.length === 0) {
    return ['## Course Updates', '', '- No recent course commits.', ''];
  }

  return [
    '## Course Updates',
    '',
    ...section.data.map(
      (course) => `- [${course.title}](${url}${course.path}): updated ${course.lastUpdatedAt}`,
    ),
    '',
  ];
};

/** Renders the full markdown-style body for LLM consumers. */
const buildBody = (data: DashboardData): string => {
  const lines = [
    '# Steve Kinney — Dashboard',
    '',
    '> A snapshot of GitHub activity, npm downloads, and course updates.',
    '',
    `Last computed: ${data.generatedAt}`,
    '',
    ...renderGithubSection(data.github),
    ...renderNpmSection(data.npm),
    ...renderCoursesSection(data.courses),
    '## Links',
    '',
    `- [JSON API](${url}/api/dashboard)`,
    `- [Atom Feed](${url}/dashboard/rss)`,
  ];

  return lines.join('\n');
};

/**
 * Serves a markdown-style rendering of the dashboard snapshot for LLM
 * consumers. Responds with 503 when any section failed to resolve, but the
 * body is the same either way — errored sections render as
 * "(temporarily unavailable)" bullets rather than being omitted.
 */
export const GET = async (): Promise<Response> => {
  const data = await getDashboardData();
  const complete = isDashboardComplete(data);
  const body = buildBody(data);

  return new Response(body, {
    status: complete ? 200 : 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...(complete ? SUCCESS_HEADERS : FAILURE_HEADERS),
    },
  });
};
