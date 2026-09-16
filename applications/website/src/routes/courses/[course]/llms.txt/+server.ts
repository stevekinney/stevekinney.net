import { error } from '@sveltejs/kit';

import { getCourseEntry, getGeneratedContent } from '$lib/server/content';
import { renderCourseExport } from '$lib/server/llms';

import type { EntryGenerator, RequestHandler } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
  getGeneratedContent().courses.map(({ slug }) => ({ course: slug }));

export const GET: RequestHandler = async ({ params }) => {
  const course = getCourseEntry(params.course);
  if (!course) throw error(404, 'Content not found');

  return new Response(await renderCourseExport(course), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
