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

    const response = await page.request.get(ogUrl as string);
    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('image/jpeg');

    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(1000);
  });
}
