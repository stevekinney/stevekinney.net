import type { Component } from 'svelte';

export type MarkdownModule = {
  default: Component;
  metadata: Record<string, unknown>;
};

type MarkdownLoader = () => Promise<MarkdownModule>;

const writingMarkdownModules = import.meta.glob<MarkdownModule>('../../../../content/writing/*.md');
const courseMarkdownModules = import.meta.glob<MarkdownModule>('../../../../courses/*/*.md');

const loadFromMap = async (
  modules: Record<string, MarkdownLoader>,
  key: string,
): Promise<MarkdownModule> => {
  const loader = modules[key];
  if (!loader) {
    throw new Error(`Markdown module not found for '${key}'.`);
  }
  return loader();
};

export const loadWritingMarkdown = async (slug: string): Promise<MarkdownModule> =>
  loadFromMap(writingMarkdownModules, `../../../../content/writing/${slug}.md`);

export const loadCourseReadmeMarkdown = async (courseSlug: string): Promise<MarkdownModule> =>
  loadFromMap(courseMarkdownModules, `../../../../courses/${courseSlug}/README.md`);

export const loadCourseContentsMarkdown = async (
  courseSlug: string,
): Promise<MarkdownModule | null> => {
  const key = `../../../../courses/${courseSlug}/_index.md`;
  const loader = courseMarkdownModules[key];
  return loader ? loader() : null;
};

export const loadCourseLessonMarkdown = async (
  courseSlug: string,
  lessonSlug: string,
): Promise<MarkdownModule> =>
  loadFromMap(courseMarkdownModules, `../../../../courses/${courseSlug}/${lessonSlug}.md`);

export const listWritingMarkdownModulePaths = (): string[] => Object.keys(writingMarkdownModules);

export const listCourseMarkdownModulePaths = (): string[] =>
  Object.keys(courseMarkdownModules).filter((filePath) => !filePath.endsWith('/_index.md'));
