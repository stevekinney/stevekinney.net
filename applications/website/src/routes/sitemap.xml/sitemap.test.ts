import { describe, expect, it } from 'vitest';

import { getRouteByPath } from '$lib/server/content';

import { GET } from './+server';

describe('sitemap metadata generation', () => {
  it('includes generated and static routes without duplicating dynamic paths', async () => {
    const response = await GET();
    const xml = await response.text();
    const testingLesson = getRouteByPath('/courses/testing/the-basics');

    expect(xml).toContain('https://stevekinney.com/writing/setup-python');
    expect(xml).toContain('https://stevekinney.com/courses/testing');
    expect(xml).toContain('https://stevekinney.com/courses/testing/the-basics');
    expect(xml).toContain('<loc>https://stevekinney.com/</loc>');
    expect(xml).not.toContain('[course]');
    expect(xml.match(/https:\/\/stevekinney\.com\/courses\/testing<\/loc>/g)).toHaveLength(1);
    expect(
      xml.match(/https:\/\/stevekinney\.com\/courses\/testing\/the-basics<\/loc>/g),
    ).toHaveLength(1);

    expect(testingLesson).not.toBeNull();
    expect(xml).toContain(
      `<lastmod>${new Date(testingLesson?.modified ?? testingLesson?.date ?? '').toISOString()}</lastmod>`,
    );

    expect(response.headers.get('Content-Type')).toContain('application/xml');
    expect(response.headers.get('ETag')).toMatch(/^W\/"\d+"$/);
    expect(Date.parse(response.headers.get('Last-Modified') ?? '')).not.toBeNaN();
  });
});
