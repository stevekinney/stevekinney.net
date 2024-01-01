export const load = async () => {
	const { default: content, metadata } = await import('./README.md');
	console.log({ content, metadata });
	return {
		meta: metadata,
		content,
	};
};
