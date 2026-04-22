import { describe, expect, it } from 'vitest';

import { GET } from './+server';

describe('sitemap metadata generation', () => {
  it('includes generated content routes with content-derived lastmod values', async () => {
    const response = await GET();
    const xml = await response.text();

    expect(xml).toContain('https://stevekinney.com/writing/setup-python');
    expect(xml).toContain('https://stevekinney.com/courses/testing');
    expect(xml).toContain('https://stevekinney.com/courses/testing/the-basics');
    expect(xml).toContain('2026-03-17');
  });
});
