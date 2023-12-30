export async function load() {
	const { default: description, metadata } = await import('./description.md');
	return {
		meta: metadata,
		description,
	};
}
