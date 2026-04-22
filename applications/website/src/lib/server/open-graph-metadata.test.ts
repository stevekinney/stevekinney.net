import { describe, expect, it } from 'vitest';

import { resolveOpenGraphMetadata } from './open-graph-metadata';

describe('resolveOpenGraphMetadata', () => {
  it('uses generated metadata for writing routes', async () => {
    await expect(resolveOpenGraphMetadata('/writing/setup-python')).resolves.toMatchObject({
      title: 'Setting Up a Python Environment on macOS',
      description: expect.stringContaining('A brief guide'),
    });
  });

  it('uses generated metadata for course lesson routes', async () => {
    await expect(resolveOpenGraphMetadata('/courses/testing/the-basics')).resolves.toMatchObject({
      title: 'Starting with Simple Tests | Introduction to Testing',
      description: 'Learn how to test basic expressions and functions using Vitest.',
    });
  });
});
