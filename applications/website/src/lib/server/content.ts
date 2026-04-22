import generatedContent from '../../../.generated/content-data.json';

import type {
  ContentRoute,
  CourseContentRoute,
  CourseIndexEntry,
  GeneratedContent,
  LessonContentRoute,
  LessonIndexEntry,
  WritingContentRoute,
  WritingIndexEntry,
} from '@stevekinney/utilities/content-types';

const content = generatedContent as GeneratedContent;

const normalizeRoutePath = (value: string): string => {
  if (!value) return '/';
  const normalized = value === '/' ? value : value.replace(/\/$/, '');
  return normalized || '/';
};

const writingIndexBySlug = new Map(content.writing.map((entry) => [entry.slug, entry]));
const courseIndexBySlug = new Map(content.courses.map((entry) => [entry.slug, entry]));
const lessonIndexByKey = new Map(
  content.lessons.map((entry) => [`${entry.courseSlug}/${entry.slug}`, entry]),
);

const lessonSlugCourseMap = content.lessons.reduce<Map<string, string | null>>((map, lesson) => {
  const existing = map.get(lesson.slug);
  if (existing && existing !== lesson.courseSlug) {
    map.set(lesson.slug, null);
  } else if (!map.has(lesson.slug)) {
    map.set(lesson.slug, lesson.courseSlug);
  }

  return map;
}, new Map<string, string | null>());

export const getGeneratedContent = (): GeneratedContent => content;

export const getPostIndex = (): WritingIndexEntry[] => content.siteIndex.posts;

export const getCourseIndex = (): CourseIndexEntry[] => content.siteIndex.courses;

export const getLessonIndex = (): LessonIndexEntry[] => content.lessons;

export const getRouteByPath = (pathname: string): ContentRoute | null =>
  content.routes[normalizeRoutePath(pathname)] ?? null;

export const getWritingEntry = (slug: string): WritingIndexEntry | null =>
  writingIndexBySlug.get(slug) ?? null;

export const getCourseEntry = (slug: string): CourseIndexEntry | null =>
  courseIndexBySlug.get(slug) ?? null;

export const getLessonEntry = (courseSlug: string, lessonSlug: string): LessonIndexEntry | null =>
  lessonIndexByKey.get(`${courseSlug}/${lessonSlug}`) ?? null;

export const getWritingRoute = (slug: string): WritingContentRoute | null => {
  const route = getRouteByPath(`/writing/${slug}`);
  return route?.contentType === 'writing' ? route : null;
};

export const getCourseRoute = (courseSlug: string): CourseContentRoute | null => {
  const route = getRouteByPath(`/courses/${courseSlug}`);
  return route?.contentType === 'course' ? route : null;
};

export const getLessonRoute = (
  courseSlug: string,
  lessonSlug: string,
): LessonContentRoute | null => {
  const route = getRouteByPath(`/courses/${courseSlug}/${lessonSlug}`);
  return route?.contentType === 'lesson' ? route : null;
};

const shouldIncludeLegacyMarkdownPrerenderEntries = (): boolean => !process.env.VERCEL;

const filterLegacyMarkdownEntries = <T extends Record<string, string>>(entries: T[]): T[] => {
  if (shouldIncludeLegacyMarkdownPrerenderEntries()) {
    return entries;
  }

  return entries.filter((entry) =>
    Object.values(entry).every((value) => !value.toLowerCase().endsWith('.md')),
  );
};

export const getPrerenderEntries = () => ({
  writing: filterLegacyMarkdownEntries(content.prerenderEntries.writing),
  courses: filterLegacyMarkdownEntries(content.prerenderEntries.courses),
  lessons: filterLegacyMarkdownEntries(content.prerenderEntries.lessons),
});

export const findCourseForLessonSlug = (lessonSlug: string): string | null =>
  lessonSlugCourseMap.get(lessonSlug) ?? null;
