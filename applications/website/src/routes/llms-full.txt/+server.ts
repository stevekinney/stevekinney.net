import { author, language, url } from '$lib/metadata';
import { getCourseIndex, getPostIndex, getProjectIndex } from '$lib/server/content';
import { renderCourseExport, renderProjectExport, renderWritingExport } from '$lib/server/llms';

export const prerender = true;

export async function GET() {
  const posts = getPostIndex();
  const courses = getCourseIndex();
  const projects = getProjectIndex();

  const postBodies = await Promise.all(posts.map((post) => renderWritingExport(post)));
  const courseBodies = await Promise.all(courses.map((course) => renderCourseExport(course)));
  const projectBodies = await Promise.all(projects.map((project) => renderProjectExport(project)));

  const lines = [
    '# Steve Kinney',
    '',
    `Canonical: ${url}/`,
    `Author: ${author}`,
    `Language: ${language}`,
    '',
    '> Software engineer, educator, and engineering leader based in Denver, Colorado.',
    '',
    'Steve Kinney builds AI systems, developer tools, and courses on software engineering, including agentic workflows, durable execution, TypeScript, React, and modern web development.',
    '',
    '## Blog Posts',
    '',
    ...postBodies.flatMap((body) => [body, '']),
    '## Course Walkthroughs',
    '',
    ...courseBodies.flatMap((body) => [body, '']),
    '## Projects',
    '',
    ...projectBodies.flatMap((body) => [body, '']),
  ];

  const responseBody = lines.join('\n');

  return new Response(responseBody, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
