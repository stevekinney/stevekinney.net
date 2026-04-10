import type { Component } from 'svelte';

export type MarkdownModule = {
  default: Component;
  metadata: Record<string, unknown>;
};

type MarkdownLoader = () => Promise<MarkdownModule>;

export type CourseContentsRelatedLink = { title: string; href: string };
export type CourseContentsItem = {
  title: string;
  href: string;
  related?: CourseContentsRelatedLink[];
};
export type CourseContentsSection = { title?: string; item: CourseContentsItem[] };
export type CourseContentsData = { section: CourseContentsSection[] };

const writingMarkdownModules = import.meta.glob<MarkdownModule>('../../../../writing/*.md');
const courseMarkdownModules = import.meta.glob<MarkdownModule>('../../../../courses/*/*.md');
const courseContentsModules = import.meta.glob<CourseContentsData>(
  '../../../../courses/*/index.toml',
);

const markdownExtensionPattern = /\.md$/i;

export class MarkdownModuleNotFoundError extends Error {
  key: string;

  constructor(key: string) {
    super(`Markdown module not found for '${key}'.`);
    this.name = 'MarkdownModuleNotFoundError';
    this.key = key;
  }
}

const normalizeMarkdownSlug = (slug: string): string => slug.replace(markdownExtensionPattern, '');

const getCourseMarkdownKey = (courseSlug: string, fileName: string): string =>
  `../../../../courses/${normalizeMarkdownSlug(courseSlug)}/${fileName}`;

const loadFromMap = async (
  modules: Record<string, MarkdownLoader>,
  key: string,
): Promise<MarkdownModule> => {
  const loader = modules[key];
  if (!loader) {
    throw new MarkdownModuleNotFoundError(key);
  }
  return loader();
};

export const loadWritingMarkdown = async (slug: string): Promise<MarkdownModule> =>
  loadFromMap(writingMarkdownModules, `../../../../writing/${normalizeMarkdownSlug(slug)}.md`);

export const loadCourseReadmeMarkdown = async (courseSlug: string): Promise<MarkdownModule> =>
  loadFromMap(courseMarkdownModules, getCourseMarkdownKey(courseSlug, 'README.md'));

export const loadCourseContents = async (
  courseSlug: string,
): Promise<CourseContentsData | null> => {
  const key = `../../../../courses/${courseSlug}/index.toml`;
  const loader = courseContentsModules[key];
  if (!loader) return null;
  const module = (await loader()) as CourseContentsData | { default: CourseContentsData };
  return 'default' in module ? module.default : module;
};

export const loadCourseLessonMarkdown = async (
  courseSlug: string,
  lessonSlug: string,
): Promise<MarkdownModule> =>
  loadFromMap(
    courseMarkdownModules,
    getCourseMarkdownKey(courseSlug, `${normalizeMarkdownSlug(lessonSlug)}.md`),
  );

export const hasCourseReadmeMarkdown = (courseSlug: string): boolean =>
  getCourseMarkdownKey(courseSlug, 'README.md') in courseMarkdownModules;

const courseLessonRouteMap = Object.keys(courseMarkdownModules).reduce<Map<string, string | null>>(
  (map, modulePath) => {
    const match = modulePath.match(/^\.\.\/\.\.\/\.\.\/\.\.\/courses\/([^/]+)\/([^/]+)\.md$/);
    if (!match) return map;

    const [, courseSlug, fileSlug] = match;
    if (fileSlug === 'README') return map;

    const existingCourse = map.get(fileSlug);
    if (existingCourse && existingCourse !== courseSlug) {
      map.set(fileSlug, null);
    } else if (!map.has(fileSlug)) {
      map.set(fileSlug, courseSlug);
    }

    return map;
  },
  new Map<string, string | null>(),
);

export const findCourseForLessonSlug = (lessonSlug: string): string | null =>
  courseLessonRouteMap.get(normalizeMarkdownSlug(lessonSlug)) ?? null;

export const listWritingMarkdownModulePaths = (): string[] => Object.keys(writingMarkdownModules);

export const listCourseMarkdownModulePaths = (): string[] => Object.keys(courseMarkdownModules);
