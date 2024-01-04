export const load = async () => {
	const { default: content, metadata } = await import('./README.md');
	return {
		meta: metadata,
		content,
	};
};
