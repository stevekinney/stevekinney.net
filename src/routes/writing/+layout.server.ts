import getPosts from '$lib/get-posts';

export async function load() {
	const posts = await getPosts();
	return { posts };
}
