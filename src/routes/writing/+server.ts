import { dev } from '$app/environment';
import { getPosts } from '$lib/posts.js';

export const GET = async () => {
	try {
		const posts = await getPosts();
		return new Response(JSON.stringify(posts), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch (error) {
		if (dev) {
			console.error(`Error fetching posts`, error);
		}

		return new Response(JSON.stringify({ error: 'Posts not found' }), {
			status: 404,
		});
	}
};
