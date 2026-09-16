import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WritingIndexEntry } from '@stevekinney/utilities/content-types';

const state = vi.hoisted(() => ({ posts: [] as WritingIndexEntry[] }));

vi.mock('$lib/server/content', () => ({
  getPostIndex: () => state.posts,
}));

import { GET } from './+server';

const buildPost = (overrides: Partial<WritingIndexEntry> = {}): WritingIndexEntry => ({
  title: 'A Post',
  description: 'A description.',
  date: '2024-01-01',
  modified: '2024-01-01T00:00:00.000Z',
  slug: 'a-post',
  sourcePath: 'writing/a-post.md',
  sourceHash: 'source-hash',
  path: '/writing/a-post',
  ...overrides,
});

const feedUpdated = (body: string): string =>
  body.split('<entry>')[0].match(/<updated>([^<]+)<\/updated>/)?.[1] ?? '';

describe('GET /writing/rss', () => {
  beforeEach(() => {
    state.posts = [];
  });

  it('uses the newest effective modified timestamp for the feed and HTTP metadata', async () => {
    state.posts = [
      buildPost({ modified: '2024-02-01T00:00:00.000Z' }),
      buildPost({
        slug: 'older-post',
        path: '/writing/older-post',
        modified: '2024-01-15T00:00:00.000Z',
      }),
    ];

    const response = await GET();
    const body = await response.text();

    expect(feedUpdated(body)).toBe('2024-02-01T00:00:00.000Z');
    expect(response.headers.get('Last-Modified')).toBe(new Date('2024-02-01').toUTCString());
    expect(response.headers.get('ETag')).toMatch(/^"[a-f0-9]{64}"$/);
  });

  it('changes the ETag when content changes without changing timestamps', async () => {
    state.posts = [buildPost()];
    const first = await GET();
    const firstEtag = first.headers.get('ETag');

    state.posts = [buildPost({ title: 'Updated title' })];
    const second = await GET();

    expect(second.headers.get('ETag')).not.toBe(firstEtag);
  });

  it('renders an empty feed with a deterministic epoch timestamp', async () => {
    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(feedUpdated(body)).toBe('1970-01-01T00:00:00.000Z');
    expect(response.headers.get('Last-Modified')).toBe('Thu, 01 Jan 1970 00:00:00 GMT');
    expect(body).not.toContain('<entry>');
  });
});
