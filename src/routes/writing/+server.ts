import { getPosts } from '$lib/posts';

export async function GET() {
  const posts = await getPosts();
  return new Response(JSON.stringify(posts));
}
