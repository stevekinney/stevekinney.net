import { error } from '@sveltejs/kit';

import { url } from '$lib/metadata';
import {
  getCourseEntry,
  getLessonRoute,
  getProjectEntry,
  getWritingEntry,
} from '$lib/server/content';
import {
  loadRawCourseLesson,
  loadRawCourseReadme,
  loadRawProjectContent,
  loadRawWritingContent,
} from '$lib/server/load-raw-content';

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

  try {
    const body = await loadRawWritingContent(slug);

    return [
      `# ${post.title}`,
      '',
      `URL: ${url}/writing/${slug}`,
      `Date: ${post.date}`,
      `Description: ${post.description}`,
      '',
      '---',
      '',
      body,
    ].join('\n');
  } catch {
    return null;
  }
};

const resolveCourse = async (courseSlug: string): Promise<string | null> => {
  const course = getCourseEntry(courseSlug);
  if (!course) return null;

  try {
    const body = await loadRawCourseReadme(courseSlug);

    return [
      `# ${course.title}`,
      '',
      `URL: ${url}/courses/${courseSlug}`,
      `Description: ${course.description}`,
      '',
      '---',
      '',
      body,
    ].join('\n');
  } catch {
    return null;
  }
};

const resolveCourseLesson = async (
  courseSlug: string,
  lessonSlug: string,
): Promise<string | null> => {
  const course = getCourseEntry(courseSlug);
  const lesson = getLessonRoute(courseSlug, lessonSlug);

  if (!course || !lesson) return null;

  try {
    const body = await loadRawCourseLesson(courseSlug, lessonSlug);

    const header = [
      `# ${lesson.title}`,
      '',
      `Course: ${course.title}`,
      `URL: ${url}/courses/${courseSlug}/${lessonSlug}`,
    ];

    if (lesson.description) {
      header.push(`Description: ${lesson.description}`);
    }

    return [...header, '', '---', '', body].join('\n');
  } catch {
    return null;
  }
};

const resolveProject = async (projectSlug: string): Promise<string | null> => {
  const project = getProjectEntry(projectSlug);
  if (!project) return null;

  try {
    const body = await loadRawProjectContent(projectSlug);
    const header = [
      `# ${project.name}`,
      '',
      `URL: ${url}/projects/${projectSlug}`,
      `GitHub: ${project.githubUrl}`,
      `Description: ${project.description}`,
    ];

    if (project.productionUrl) {
      header.push(`Production: ${project.productionUrl}`);
    }

    if (project.writingPath) {
      header.push(`Related writing: ${url}${project.writingPath}`);
    }

    if (project.youtubeUrl) {
      header.push(`YouTube: ${project.youtubeUrl}`);
    }

    return [...header, '', '---', '', body].join('\n');
  } catch {
    return null;
  }
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
