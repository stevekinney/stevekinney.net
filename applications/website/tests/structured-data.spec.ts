import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import type { GeneratedContent } from '@stevekinney/utilities/content-types';

const generatedContent = JSON.parse(
  readFileSync(new URL('../.generated/content-data.json', import.meta.url), 'utf8'),
) as GeneratedContent;

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
  // The OG image URL carries the runtime origin (localhost in preview, the canonical
  // host in production), so assert the path it points at rather than a fixed hostname.
  // The origin is environment-dependent by design (see the gap2-3-1 canonical-origin plan).
  expect(new URL(article!.image as string).pathname).toBe('/writing/setup-python/open-graph.jpg');
  expect(typeof article!.datePublished).toBe('string');
  expect(article!.datePublished as string).toBeTruthy();
  expect(article!.datePublished).toBe('2024-08-06T00:00:00.000Z');
  expect(article!.inLanguage).toBe('en-US');
  const author = article!.author as Record<string, unknown>;
  expect(author).toBeTruthy();
  expect(typeof author.name).toBe('string');
  expect(author.name).toBe('Steve Kinney');
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
  expect(course!.name).toBe('Introduction to Testing');
  expect(course!.url).toBe('https://stevekinney.com/courses/testing');
  expect(course!['@id']).toBe('https://stevekinney.com/courses/testing#course');
  expect(course!.inLanguage).toBe('en-US');
  expect((course!.provider as Record<string, unknown>).name).toBe('Steve Kinney');
  expect(course!.datePublished).toBe('2024-09-28T00:00:00.000Z');
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

test('course lesson JSON-LD contains LearningResource and BreadcrumbList schemas', async ({
  page,
}) => {
  await page.goto('/courses/testing/the-basics');
  const data = await getJsonLd(page);
  const items = getSchemaItems(data);
  const lesson = items.find((item) => item['@type'] === 'LearningResource');
  const breadcrumb = items.find((item) => item['@type'] === 'BreadcrumbList');
  expect(lesson, 'LearningResource schema should be present on lesson page').toBeTruthy();
  expect(lesson!.name).toBe('Starting with Simple Tests');
  expect(lesson!.learningResourceType).toBe('Lesson');
  expect(lesson!.inLanguage).toBe('en-US');
  expect((lesson!.author as Record<string, unknown>).name).toBe('Steve Kinney');
  expect(lesson!.isPartOf).toEqual({
    '@type': 'Course',
    '@id': 'https://stevekinney.com/courses/testing#course',
    name: 'Introduction to Testing',
    url: 'https://stevekinney.com/courses/testing',
  });
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

for (const pagePath of [
  '/writing/setup-python',
  '/courses/testing',
  '/courses/testing/the-basics',
]) {
  test(`${pagePath} shares generated metadata across HTML, JSON-LD, and LLM output`, async ({
    page,
    request,
  }) => {
    const route = generatedContent.routes[pagePath];
    if (!route || route.contentType === 'project')
      throw new Error(`Missing content route ${pagePath}`);
    await page.goto(pagePath);
    const schemas = getSchemaItems(await getJsonLd(page));
    const schema = schemas.find((item) =>
      ['Article', 'Course', 'LearningResource'].includes(String(item['@type'])),
    );
    expect(schema).toBeTruthy();
    expect(schema!.description).toBe(route.description);
    expect(schema!.dateModified).toBe(route.modified);
    expect(schema!.headline ?? schema!.name).toBe(route.title);
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      await expect(page.locator(selector)).toHaveAttribute('content', route.description);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://stevekinney.com${pagePath}`,
    );
    const exported = await request.get(`${pagePath}/llms.txt`);
    expect(exported.ok()).toBe(true);
    const text = await exported.text();
    expect(text).toContain(`Description: ${route.description}`);
    expect(text).toContain(`Canonical: https://stevekinney.com${pagePath}`);
    if (route.modified) {
      expect(new Date(route.modified).toISOString()).toBe(route.modified);
      await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute(
        'content',
        route.modified,
      );
      expect(text).toContain(`Modified: ${route.modified}`);
    }
    if (route.contentType === 'lesson') {
      expect(schema!.datePublished).toBeUndefined();
      await expect(page.locator('meta[property="article:published_time"]')).toHaveCount(0);
      expect(text).not.toMatch(/^Date:/m);
    } else {
      expect(schema!.datePublished).toBe(new Date(route.date).toISOString());
      expect(text).toContain(`Date: ${route.date}`);
    }
  });
}
