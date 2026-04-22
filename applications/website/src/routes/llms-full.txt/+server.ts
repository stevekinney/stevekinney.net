import { url } from '$lib/metadata';
import { getCourseIndex, getPostIndex } from '$lib/server/content';
import { loadRawCourseReadme, loadRawWritingContent } from '$lib/server/load-raw-content';

export const prerender = true;

export async function GET() {
  const posts = getPostIndex();
  const courses = getCourseIndex();

  const postBodies = await Promise.all(
    posts.map(async (post) => {
      try {
        const body = await loadRawWritingContent(post.slug);
        return { post, body };
      } catch {
        return { post, body: '' };
      }
    }),
  );

  const courseBodies = await Promise.all(
    courses.map(async (course) => {
      try {
        const body = await loadRawCourseReadme(course.slug);
        return { course, body };
      } catch {
        return { course, body: '' };
      }
    }),
  );

  const lines = [
    '# Steve Kinney',
    '',
    '> Software engineer, educator, and engineering leader based in Denver, Colorado.',
    '',
    'Steve Kinney builds AI systems, developer tools, and courses on software engineering, including agentic workflows, durable execution, TypeScript, React, and modern web development.',
    '',
    '## Blog Posts',
    '',
    ...postBodies.flatMap(({ post, body }) => [
      `### ${post.title}`,
      '',
      `URL: ${url}/writing/${post.slug}`,
      `Date: ${post.date}`,
      `Description: ${post.description}`,
      '',
      body,
      '',
      '---',
      '',
    ]),
    '## Course Walkthroughs',
    '',
    ...courseBodies.flatMap(({ course, body }) => [
      `### ${course.title}`,
      '',
      `URL: ${url}/courses/${course.slug}`,
      `Description: ${course.description}`,
      '',
      body,
      '',
      '---',
      '',
    ]),
  ];

  const responseBody = lines.join('\n');

  return new Response(responseBody, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
