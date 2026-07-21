import { describe, expect, it } from 'vitest';

import { createLlmsAlternatePath } from './llms-path';

describe('createLlmsAlternatePath', () => {
  it('returns the root llms route for the home page', () => {
    expect(createLlmsAlternatePath('/')).toBe('/llms.txt');
  });

  it('returns a per-page llms route for the dashboard', () => {
    expect(createLlmsAlternatePath('/dashboard')).toBe('/dashboard/llms.txt');
  });

  it('returns a per-post llms route for writing detail pages', () => {
    expect(createLlmsAlternatePath('/writing/agent-loops')).toBe('/writing/agent-loops/llms.txt');
  });

  it('returns a per-course llms route for course overview pages', () => {
    expect(createLlmsAlternatePath('/courses/self-testing-ai-agents')).toBe(
      '/courses/self-testing-ai-agents/llms.txt',
    );
  });

  it('returns a per-project llms route for project detail pages', () => {
    expect(createLlmsAlternatePath('/projects/weft')).toBe('/projects/weft/llms.txt');
  });

  it('returns a per-lesson llms route for course lesson pages', () => {
    expect(
      createLlmsAlternatePath('/courses/self-testing-ai-agents/lab-wrap-a-custom-verification-mcp'),
    ).toBe('/courses/self-testing-ai-agents/lab-wrap-a-custom-verification-mcp/llms.txt');
  });

  it('does not emit llms alternates for collection pages', () => {
    expect(createLlmsAlternatePath('/writing')).toBeNull();
    expect(createLlmsAlternatePath('/writing/page/2')).toBeNull();
    expect(createLlmsAlternatePath('/courses')).toBeNull();
    expect(createLlmsAlternatePath('/projects')).toBeNull();
  });

  it('does not emit llms alternates for reserved writing routes', () => {
    expect(createLlmsAlternatePath('/writing/rss')).toBeNull();
    expect(createLlmsAlternatePath('/writing/open-graph.jpg')).toBeNull();
    expect(createLlmsAlternatePath('/projects/open-graph.jpg')).toBeNull();
  });

  it('does not emit llms alternates for the dashboard feed and its own mirror', () => {
    expect(createLlmsAlternatePath('/dashboard/rss')).toBeNull();
    expect(createLlmsAlternatePath('/dashboard/llms.txt')).toBeNull();
    expect(createLlmsAlternatePath('/dashboard/open-graph.jpg')).toBeNull();
  });
});
