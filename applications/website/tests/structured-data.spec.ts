import { expect, test } from '@playwright/test';

type Scenario = {
  name: string;
  path: string;
  assertions: (schema: Record<string, unknown>) => void;
};

/** Parse the first application/ld+json script block on the page. */
async function getJsonLd(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
  const content = await page.locator('script[type="application/ld+json"]').first().textContent();
  if (!content) throw new Error('No application/ld+json found on page');
  return JSON.parse(content);
}

/** Flatten a top-level @graph array or return the single object in an array. */
function getSchemaItems(data: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(data['@graph'])) {
    return data['@graph'] as Record<string, unknown>[];
  }
  return [data];
}

test('home page JSON-LD has top-level @context', async ({ page }) => {
  await page.goto('/');
  const data = await getJsonLd(page);
  expect(data['@context']).toBe('https://schema.org');
});

test('home page JSON-LD contains WebSite schema', async ({ page }) => {
  await page.goto('/');
  const data = await getJsonLd(page);
  const items = getSchemaItems(data);
  const website = items.find((item) => item['@type'] === 'WebSite');
  expect(website, 'WebSite schema should be present on home page').toBeTruthy();
  expect(typeof website!.url).toBe('string');
  expect(website!.url as string).toContain('stevekinney.com');
});

test('writing post JSON-LD contains Article schema with required fields', async ({ page }) => {
  await page.goto('/writing/setup-python');
  const data = await getJsonLd(page);
  const items = getSchemaItems(data);
  const article = items.find((item) => item['@type'] === 'Article');
  expect(article, 'Article schema should be present on writing post').toBeTruthy();
  expect(typeof article!.headline).toBe('string');
  expect(article!.headline as string).toBeTruthy();
  expect(typeof article!.image).toBe('string');
  expect(article!.image as string).toContain('stevekinney.com');
  expect(typeof article!.datePublished).toBe('string');
  expect(article!.datePublished as string).toBeTruthy();
  const author = article!.author as Record<string, unknown>;
  expect(author).toBeTruthy();
  expect(typeof author.name).toBe('string');
});

test('course index page JSON-LD contains Course schema with hasCourseInstance', async ({
  page,
}) => {
  await page.goto('/courses/testing');
  const data = await getJsonLd(page);
  const items = getSchemaItems(data);
  const course = items.find((item) => item['@type'] === 'Course');
  expect(course, 'Course schema should be present on course index page').toBeTruthy();
  expect(typeof course!.name).toBe('string');
  expect(typeof course!.description).toBe('string');
  expect(Array.isArray(course!.hasCourseInstance)).toBe(true);
  const instances = course!.hasCourseInstance as Record<string, unknown>[];
  expect(instances.length).toBeGreaterThan(0);
  expect(instances[0].courseMode).toBeTruthy();
});

test('course index page JSON-LD contains BreadcrumbList schema', async ({ page }) => {
  await page.goto('/courses/testing');
  const data = await getJsonLd(page);
  const items = getSchemaItems(data);
  const breadcrumb = items.find((item) => item['@type'] === 'BreadcrumbList');
  expect(breadcrumb, 'BreadcrumbList schema should be present on course index page').toBeTruthy();
  const listItems = breadcrumb!.itemListElement as Record<string, unknown>[];
  expect(listItems.length).toBeGreaterThan(0);
  listItems.forEach((item, index) => {
    expect(item.position).toBe(index + 1);
    expect(item.item as string).toContain('stevekinney.com');
  });
});

test('course lesson JSON-LD contains Course and BreadcrumbList schemas', async ({ page }) => {
  await page.goto('/courses/testing/the-basics');
  const data = await getJsonLd(page);
  const items = getSchemaItems(data);
  const course = items.find((item) => item['@type'] === 'Course');
  const breadcrumb = items.find((item) => item['@type'] === 'BreadcrumbList');
  expect(course, 'Course schema should be present on lesson page').toBeTruthy();
  expect(breadcrumb, 'BreadcrumbList schema should be present on lesson page').toBeTruthy();
  const listItems = breadcrumb!.itemListElement as Record<string, unknown>[];
  expect(listItems.length).toBeGreaterThanOrEqual(2);
});

const scenarios: Scenario[] = [
  { name: 'home', path: '/', assertions: () => {} },
  { name: 'writing post', path: '/writing/setup-python', assertions: () => {} },
  { name: 'course index', path: '/courses/testing', assertions: () => {} },
  { name: 'course lesson', path: '/courses/testing/the-basics', assertions: () => {} },
];

for (const scenario of scenarios) {
  test(`${scenario.name} JSON-LD has no @context inside @graph items`, async ({ page }) => {
    await page.goto(scenario.path);
    const data = await getJsonLd(page);
    if (!Array.isArray(data['@graph'])) return; // single-object form is fine
    const items = data['@graph'] as Record<string, unknown>[];
    for (const item of items) {
      expect(
        item['@context'],
        `@graph item of type ${item['@type']} should not have its own @context`,
      ).toBeUndefined();
    }
  });
}
