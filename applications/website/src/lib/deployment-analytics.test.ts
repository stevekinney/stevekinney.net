import { afterEach, expect, it, vi } from 'vitest';

vi.mock('$lib/server/content', () => ({ getPostIndex: () => [] }));
import { load } from '../routes/+layout.server';

afterEach(() => vi.unstubAllEnvs());

it('emits analytics only for builds deployed to Vercel', async () => {
  vi.stubEnv('VERCEL', undefined);
  expect((await load()).analyticsEnabled).toBe(false);
  vi.stubEnv('VERCEL', '1');
  expect((await load()).analyticsEnabled).toBe(true);
});
