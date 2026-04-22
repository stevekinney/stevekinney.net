import { url } from '$lib/metadata';
import { getCourseIndex, getPostIndex } from '$lib/server/content';

export const prerender = true;

export function GET() {
  const posts = getPostIndex();
  const courses = getCourseIndex();

  const lines = [
    '# Steve Kinney',
    '',
    '> Software engineer, educator, and engineering leader based in Denver, Colorado.',
    '',
    'Steve Kinney builds AI systems, developer tools, and courses on software engineering, including agentic workflows, durable execution, TypeScript, React, and modern web development.',
    '',
    '## Blog Posts',
    '',
    ...posts.map(
      (post) =>
        `- [${post.title}](${url}/writing/${post.slug}): ${post.description} ([llms.txt](${url}/writing/${post.slug}/llms.txt))`,
    ),
    '',
    '## Course Walkthroughs',
    '',
    ...courses.map(
      (course) =>
        `- [${course.title}](${url}/courses/${course.slug}): ${course.description} ([llms.txt](${url}/courses/${course.slug}/llms.txt))`,
    ),
    '',
    '## Links',
    '',
    `- [RSS Feed](${url}/writing/rss)`,
    `- [Sitemap](${url}/sitemap.xml)`,
    `- [Full Content](${url}/llms-full.txt)`,
  ];

  const body = lines.join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
