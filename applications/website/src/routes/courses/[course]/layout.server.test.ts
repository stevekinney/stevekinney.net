import { describe, expect, it } from 'vitest';

import { load } from './+layout.server';

const loadCourseLayout = async (pathname: string, course: string): Promise<unknown> =>
  load({
    params: { course },
    url: new URL(`https://stevekinney.net${pathname}`),
  } as Parameters<typeof load>[0]);

describe('course layout redirects', () => {
  it('preserves the child route suffix when redirecting from a legacy markdown course path', async () => {
    await expect(
      loadCourseLayout('/courses/testing.md/the-basics', 'testing.md'),
    ).rejects.toMatchObject({
      status: 308,
      location: '/courses/testing/the-basics',
    });
  });

  it('does not append a child suffix when redirecting a legacy lesson slug to its course route', async () => {
    await expect(
      loadCourseLayout('/courses/the-basics.md/extra-segment', 'the-basics.md'),
    ).rejects.toMatchObject({
      status: 308,
      location: '/courses/testing/the-basics',
    });
  });
});
