export async function load() {
	const { metadata } = await import('./description.md');
	return {
		meta: metadata,
	};
}
