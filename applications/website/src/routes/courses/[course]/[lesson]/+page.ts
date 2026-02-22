import { loadCourseLessonMarkdown, MarkdownModuleNotFoundError } from '$lib/content-modules';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course, lesson: rawLesson } = params;
  const lesson = rawLesson.replace(/\.md$/i, '');

  if (rawLesson !== lesson) {
    throw redirect(308, `/courses/${course}/${lesson}`);
  }

  let parsedLesson: ReturnType<typeof CourseMarkdownSchema.parse>;
  try {
    parsedLesson = CourseMarkdownSchema.parse(await loadCourseLessonMarkdown(course, lesson));
  } catch (caught) {
    if (caught instanceof MarkdownModuleNotFoundError) {
      throw error(404, 'Lesson not found');
    }
    throw caught;
  }

  const { default: content, metadata } = parsedLesson;

  return {
    content,
    ...metadata,
  };
};
