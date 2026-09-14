import { expect, test } from '@playwright/test';

type Scenario = {
  name: string;
  path: string;
};

const scenarios: Scenario[] = [
  { name: 'home', path: '/' },
  { name: 'writing index', path: '/writing' },
  { name: 'writing post', path: '/writing/setup-python' },
  { name: 'course lesson', path: '/courses/testing/the-basics' },
];

for (const scenario of scenarios) {
  test(`open graph image resolves for ${scenario.name}`, async ({ page }) => {
    await page.goto(scenario.path);

    const ogImage = page.locator('meta[property="og:image"]');
    const ogUrl = await ogImage.getAttribute('content');

    expect(ogUrl, 'og:image content should be present').toBeTruthy();
    expect(ogUrl).toContain('/open-graph.jpg?v=');
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
      'content',
      'image/png',
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      'content',
      '630',
    );

    // Fetch using path only so we always hit the preview server, regardless of
    // the origin baked into prerendered HTML (which may point at port 4444).
    const { pathname, search } = new URL(ogUrl as string);
    const response = await page.request.get(`${pathname}${search}`);
    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('image/png');

    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(1000);
    expect([...body.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });
}
