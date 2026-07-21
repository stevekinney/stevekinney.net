import { expect, test } from '@playwright/test';

// The preview environment has no GitHub token configured, so these specs
// never assert on live data values — only on structure, headings, and the
// page settling out of its loading state.

test('/dashboard responds with 200', async ({ page }) => {
  const response = await page.goto('/dashboard');

  expect(response?.status()).toBe(200);
});

test('document title mentions Dashboard', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveTitle(/Dashboard/);
});

test('main navigation includes a link to the dashboard', async ({ page }) => {
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: 'Main Navigation' });

  await expect(nav.getByRole('link', { name: /dashboard/i })).toBeVisible();
});

test('social links do not overlap the main navigation near the desktop breakpoint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/dashboard');

  const newsletterBox = await page
    .getByRole('navigation', { name: 'Main Navigation' })
    .getByRole('link', { name: 'Newsletter' })
    .boundingBox();
  const githubBox = await page.getByRole('link', { name: 'Visit GitHub profile' }).boundingBox();

  expect(newsletterBox).not.toBeNull();
  expect(githubBox).not.toBeNull();

  const overlaps =
    newsletterBox !== null &&
    githubBox !== null &&
    newsletterBox.x < githubBox.x + githubBox.width &&
    newsletterBox.x + newsletterBox.width > githubBox.x &&
    newsletterBox.y < githubBox.y + githubBox.height &&
    newsletterBox.y + newsletterBox.height > githubBox.y;

  expect(overlaps).toBe(false);
});

test('all four dashboard section headings are visible', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(
    page.getByRole('heading', { level: 2, name: 'GitHub — The Last Year' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Commits by Repository' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'npm' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Recently Updated Courses' }),
  ).toBeVisible();
});

// A DashboardData fixture matching the page's response schema: one healthy
// section and one errored section, so both render paths are exercised. The
// live endpoint's first compute can take tens of seconds when GitHub is
// throttling, so this spec stubs the API — the client's skeleton-to-settled
// behavior is what's under test, and the unmocked spec below still covers the
// real endpoint.
const dashboardFixture = {
  generatedAt: '2026-07-20T00:00:00.000Z',
  window: { from: '2025-07-20T00:00:00.000Z', to: '2026-07-20T00:00:00.000Z' },
  github: { status: 'error', error: 'stubbed outage' },
  npm: {
    status: 'ok',
    data: {
      packageCount: 1,
      totalDownloadsLastYear: 1234,
      topPackages: [
        {
          name: 'phone-formatter',
          description: 'Parse and format telephone numbers.',
          version: '0.0.2',
          url: 'https://www.npmjs.com/package/phone-formatter',
          downloadsLastYear: 1234,
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
        description: 'A course about testing.',
        path: '/courses/testing',
        lessonCount: 80,
        lastUpdatedAt: '2026-06-01T00:00:00.000Z',
        lastCommit: {
          message: 'Update testing course',
          url: 'https://github.com/stevekinney/stevekinney.net/commit/abc123',
          sha: 'abc123',
        },
      },
    ],
  },
};

const dashboardWithGithubStats = {
  ...dashboardFixture,
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
            url: 'https://github.com/stevekinney/example',
            stargazerCount: 1,
            commits: 5,
          },
        ],
      },
      issues: { openedLastYear: 6, closedLastYear: 7 },
      reviews: { totalLastYear: 8 },
    },
  },
};

test('dashboard uses concise copy and the system font for stat values', async ({ page }) => {
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', json: dashboardWithGithubStats }),
  );

  await page.goto('/dashboard');

  await expect(page.getByText(/This page pulls back the curtain/)).toHaveCount(0);
  await expect(page.getByText('Issues I opened that are now closed')).toHaveCount(0);
  await expect(page.getByText('Recomputed at most once every 24 hours.')).toHaveCount(0);

  const commitsTile = page.getByText('Commits', { exact: true }).locator('..');
  const statValue = commitsTile.locator('p').nth(1);
  const fontFamily = await statValue.evaluate((element) => getComputedStyle(element).fontFamily);

  expect(fontFamily).toMatch(/^system-ui/);
});

test('dashboard sections settle into data or a quiet unavailable notice, never a permanent skeleton', async ({
  page,
}) => {
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', json: dashboardFixture }),
  );

  await page.goto('/dashboard');

  // Skeletons mark their container `aria-busy="true"` while loading; once the
  // client-side fetch settles (success or failure), none should remain.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  // The errored section shows its quiet notice while healthy sections render
  // their data — a 503 body must not blank the whole page.
  const githubSection = page.locator('section[aria-labelledby="dashboard-github-heading"]');
  await expect(githubSection).toContainText(/temporarily unavailable/);

  const npmSection = page.locator('section[aria-labelledby="dashboard-npm-heading"]');
  await expect(npmSection).toContainText('phone-formatter');
});

test('a failed load shows the retry button, and retrying recovers into data', async ({ page }) => {
  let failNextRequest = true;

  await page.route('**/api/dashboard', (route) => {
    if (failNextRequest) {
      failNextRequest = false;
      return route.abort();
    }

    return route.fulfill({ status: 200, contentType: 'application/json', json: dashboardFixture });
  });

  await page.goto('/dashboard');

  const retryButton = page.getByRole('button', { name: 'Try again' });
  await expect(retryButton).toBeVisible();

  await retryButton.click();

  const npmSection = page.locator('section[aria-labelledby="dashboard-npm-heading"]');
  await expect(npmSection).toContainText('phone-formatter');
});

test('/api/dashboard returns parseable JSON with a generatedAt field', async ({ page }) => {
  const response = await page.request.get('/api/dashboard');

  expect([200, 503]).toContain(response.status());

  const body = await response.json();

  expect(typeof body.generatedAt).toBe('string');
});

test('RSS alternate link is present in the document head', async ({ page }) => {
  await page.goto('/dashboard');

  const rssLink = page.locator(
    'link[rel="alternate"][type="application/atom+xml"][href="/dashboard/rss"]',
  );

  await expect(rssLink).toHaveCount(1);
});
