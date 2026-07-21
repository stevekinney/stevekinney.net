import { url } from '$lib/metadata';
import { getCourseIndex, getPostIndex, getProjectIndex } from '$lib/server/content';

export const prerender = true;

export function GET() {
  const posts = getPostIndex();
  const courses = getCourseIndex();
  const projects = getProjectIndex();

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
    '## Projects',
    '',
    ...projects.map(
      (project) =>
        `- [${project.name}](${url}/projects/${project.slug}): ${project.description} ([llms.txt](${url}/projects/${project.slug}/llms.txt))`,
    ),
    '',
    '## Links',
    '',
    `- [Dashboard](${url}/dashboard): A live snapshot of GitHub activity, npm downloads, and course updates, with a JSON API at ${url}/api/dashboard and an Atom feed at ${url}/dashboard/rss ([llms.txt](${url}/dashboard/llms.txt))`,
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
