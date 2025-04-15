import { dev } from '$app/environment';

export const getPosts = async () => {
  let posts: Post[] = [];

  const paths = import.meta.glob('/content/writing/*.md');

  for (const path in paths) {
    const file = await paths[path]();
    const slug = path.split('/').at(-1)?.replace('.md', '');

    if (file && typeof file === 'object' && 'metadata' in file && slug) {
      const metadata = file.metadata as Omit<Post, 'slug'>;
      const post = { ...metadata, slug } satisfies Post;
      if (dev || post.published) {
        posts.push(post);
      }
    }
  }

  posts = posts.sort(
    (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime(),
  );

  return posts;
};

export const getPost = async (slug: string) => {
  const post = await import(`../../content/writing/${slug}.md`);
  const meta = post.metadata as Post;

  return {
    content: post.default,
    meta,
    slug,
  };
};
