export async function load({ parent }) {
	const { posts } = await parent();
	return { posts };
}
