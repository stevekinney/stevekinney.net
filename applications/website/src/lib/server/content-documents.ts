import { render } from 'svelte/server';

import type { Component } from 'svelte';

type MarkdownModule = {
  default: Component;
  metadata: Record<string, unknown>;
};

type MarkdownLoader = () => Promise<MarkdownModule>;

const writingMarkdownModules = import.meta.glob<MarkdownModule>('../../../../../writing/*.md');
const courseMarkdownModules = import.meta.glob<MarkdownModule>('../../../../../courses/*/*.md');

export class MarkdownModuleNotFoundError extends Error {
  constructor(sourcePath: string) {
    super(`Markdown module not found for '${sourcePath}'.`);
    this.name = 'MarkdownModuleNotFoundError';
  }
}

const getLoader = (sourcePath: string): MarkdownLoader | undefined => {
  const key = `../../../../../${sourcePath}`;
  if (sourcePath.startsWith('writing/')) {
    return writingMarkdownModules[key];
  }

  if (sourcePath.startsWith('courses/')) {
    return courseMarkdownModules[key];
  }

  return undefined;
};

const loadMarkdownModule = async (sourcePath: string): Promise<MarkdownModule> => {
  const loader = getLoader(sourcePath);
  if (!loader) {
    throw new MarkdownModuleNotFoundError(sourcePath);
  }

  return loader();
};

const renderMarkdownModule = async (
  sourcePath: string,
  props: Record<string, unknown> = {},
): Promise<string> => {
  const module = await loadMarkdownModule(sourcePath);
  const rendered = render(module.default, { props });
  return rendered.body;
};

export const renderWritingDocument = async (sourcePath: string): Promise<string> =>
  renderMarkdownModule(sourcePath, {
    class: 'prose dark:prose-invert max-w-none',
    as: 'section',
  });

export const renderCourseDocument = async (sourcePath: string): Promise<string> =>
  renderMarkdownModule(sourcePath);

export const renderLessonDocument = async (sourcePath: string): Promise<string> =>
  renderMarkdownModule(sourcePath, {
    class: 'prose dark:prose-invert max-w-none',
    as: 'article',
  });
