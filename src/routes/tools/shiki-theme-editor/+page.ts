export const load = async () => {
	const { metadata } = await import('./+page.md');
	return {
		meta: metadata,
	};
};
