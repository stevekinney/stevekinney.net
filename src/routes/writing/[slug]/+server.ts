import { dev } from '$app/environment';
import { getPost } from '$lib/posts.js';

export const GET = async ({ params }) => {
	const { slug } = params;

	try {
		const posts = await getPost(slug);
		return new Response(JSON.stringify(posts), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch (error) {
		if (dev) {
			console.error(`Error fetching post: ${slug}`, error);
		}

		return new Response(JSON.stringify({ error: 'Post not found' }), {
			status: 404,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
};
