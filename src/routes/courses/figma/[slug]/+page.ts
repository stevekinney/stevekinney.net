import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

export async function load({ params, url }) {
  const { slug } = params;
  const { pathname } = url;

  try {
    const post = await import(`../../../../../content/courses/figma/${slug}.md`).catch(() => {
      error(404, 'Not found');
    });

    const meta = post.metadata as Post;

    return {
      content: post.default,
      meta,
      slug,
      pathname,
    };
  } catch (e) {
    if (dev) {
      console.error(e);
    }

    error(500, 'Internal server error');
  }
}
