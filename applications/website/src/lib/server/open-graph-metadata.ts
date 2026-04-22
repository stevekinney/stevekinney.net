import metadata from '$lib/metadata';
import { normalizeOpenGraphPath } from '$lib/og/paths';
import { getCourseEntry, getRouteByPath, getWritingEntry } from '$lib/server/content';

import type { OpenGraphOptions } from './open-graph';

type StaticRoute = {
  title: string;
  description: string;
};

const WRITING_INDEX: StaticRoute = {
  title: 'Writing',
  description: "A collection of articles, essays, and other writing that I've done over the years.",
};

const COURSES_INDEX: StaticRoute = {
  title: 'Courses',
  description:
    "A collection of courses that I've taught over the years, including full course walkthroughs and recordings from Frontend Masters.",
};

const STATIC_ROUTES = new Map<string, StaticRoute>([
  ['/', { title: metadata.title, description: metadata.description }],
  ['/writing', WRITING_INDEX],
  ['/courses', COURSES_INDEX],
]);

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getStaticMetadata = (pathname: string): OpenGraphOptions | null => {
  const staticRoute = STATIC_ROUTES.get(pathname);
  if (!staticRoute) return null;
  return {
    title: staticRoute.title,
    description: staticRoute.description,
  };
};

const resolveWritingMetadata = (pathname: string): OpenGraphOptions | null => {
  if (!pathname.startsWith('/writing/')) return null;

  const slug = safeDecode(pathname.replace('/writing/', ''));
  if (!slug || slug.includes('/')) return null;

  const post = getWritingEntry(slug);
  if (!post) return null;

  return {
    title: post.title,
    description: post.description || metadata.description,
  };
};

const resolveCourseMetadata = async (pathname: string): Promise<OpenGraphOptions | null> => {
  if (!pathname.startsWith('/courses/')) return null;

  const remainder = safeDecode(pathname.replace('/courses/', ''));
  if (!remainder) return null;

  const [courseId, lessonId, ...rest] = remainder.split('/').filter(Boolean);
  if (!courseId || rest.length > 0) return null;

  const course = getCourseEntry(courseId);
  if (!course) return null;

  if (!lessonId) {
    return {
      title: course.title,
      description: course.description || metadata.description,
    };
  }

  const lesson = getRouteByPath(`/courses/${courseId}/${lessonId}`);
  if (!lesson || lesson.contentType !== 'lesson') {
    return null;
  }

  return {
    title: lesson.title ? `${lesson.title} | ${course.title}` : course.title,
    description: lesson.description || course.description || metadata.description,
  };
};

export const resolveOpenGraphMetadata = async (
  pathname: string,
): Promise<OpenGraphOptions | null> => {
  const normalized = normalizeOpenGraphPath(pathname);

  const staticMetadata = getStaticMetadata(normalized);
  if (staticMetadata) return staticMetadata;

  const writingMetadata = resolveWritingMetadata(normalized);
  if (writingMetadata) return writingMetadata;

  const courseMetadata = await resolveCourseMetadata(normalized);
  if (courseMetadata) return courseMetadata;

  return null;
};

export { normalizeOpenGraphPath };
