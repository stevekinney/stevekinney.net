import { error } from '@sveltejs/kit';

import {
  getCourseEntry,
  getLessonRoute,
  getProjectEntry,
  getWritingEntry,
} from '$lib/server/content';
import {
  renderCourseExport,
  renderLessonExport,
  renderProjectExport,
  renderWritingExport,
} from '$lib/server/llms';

import type { RequestHandler } from '@sveltejs/kit';

export const prerender = false;

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const resolveWriting = async (slug: string): Promise<string | null> => {
  const post = getWritingEntry(slug);
  if (!post) return null;

  return renderWritingExport({ ...post, path: `/writing/${slug}` });
};

const resolveCourse = async (courseSlug: string): Promise<string | null> => {
  const course = getCourseEntry(courseSlug);
  if (!course) return null;

  return renderCourseExport({ ...course, path: `/courses/${courseSlug}`, slug: courseSlug });
};

const resolveCourseLesson = async (
  courseSlug: string,
  lessonSlug: string,
): Promise<string | null> => {
  const course = getCourseEntry(courseSlug);
  if (!course || !getLessonRoute(courseSlug, lessonSlug)) return null;
  return renderLessonExport(courseSlug, lessonSlug);
};

const resolveProject = async (projectSlug: string): Promise<string | null> => {
  const project = getProjectEntry(projectSlug);
  if (!project) return null;

  return renderProjectExport(project);
};

export const GET: RequestHandler = async ({ params }) => {
  const rawPath = safeDecode(params.path || '');
  const segments = rawPath.split('/').filter(Boolean);

  let content: string | null = null;

  if (segments[0] === 'writing' && segments.length === 2) {
    content = await resolveWriting(segments[1]);
  } else if (segments[0] === 'courses' && segments.length === 2) {
    content = await resolveCourse(segments[1]);
  } else if (segments[0] === 'courses' && segments.length === 3) {
    content = await resolveCourseLesson(segments[1], segments[2]);
  } else if (segments[0] === 'projects' && segments.length === 2) {
    content = await resolveProject(segments[1]);
  }

  if (!content) {
    throw error(404, 'Content not found');
  }

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
