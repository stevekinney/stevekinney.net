import { describe, expect, it } from 'vitest';

import { resolveOpenGraphMetadata } from './open-graph-metadata';

describe('resolveOpenGraphMetadata', () => {
  it('uses static metadata for top-level index routes', async () => {
    await expect(resolveOpenGraphMetadata('/')).resolves.toMatchObject({
      title: 'Steve Kinney',
    });
    await expect(resolveOpenGraphMetadata('/writing')).resolves.toMatchObject({
      title: 'Writing',
    });
    await expect(resolveOpenGraphMetadata('/courses')).resolves.toMatchObject({
      title: 'Courses',
    });
  });

  it('uses generated metadata for writing routes', async () => {
    await expect(resolveOpenGraphMetadata('/writing/setup-python')).resolves.toMatchObject({
      title: 'Setting Up a Python Environment on macOS',
      description: expect.stringContaining('A brief guide'),
    });
  });

  it('uses generated metadata for course landing routes', async () => {
    await expect(resolveOpenGraphMetadata('/courses/testing')).resolves.toMatchObject({
      title: 'Introduction to Testing',
      description: expect.stringContaining('testing'),
    });
  });

  it('uses generated metadata for course lesson routes', async () => {
    await expect(resolveOpenGraphMetadata('/courses/testing/the-basics')).resolves.toMatchObject({
      title: 'Starting with Simple Tests | Introduction to Testing',
      description: 'Learn how to test basic expressions and functions using Vitest.',
    });
  });

  it('normalizes trailing slashes and rejects malformed nested paths', async () => {
    await expect(resolveOpenGraphMetadata('/courses/testing/')).resolves.toMatchObject({
      title: 'Introduction to Testing',
    });
    await expect(resolveOpenGraphMetadata('/courses/testing/the-basics/extra')).resolves.toBeNull();
    await expect(resolveOpenGraphMetadata('/writing/does-not-exist')).resolves.toBeNull();
  });
});
