export async function load() {
	const { default: content, metadata } = await import('./README.md');
	const readmes = import.meta.glob<Markdown>('./**/+page.md', { eager: true });

	const tools = Object.entries(readmes)
		.filter(([key, value]) => {
			if (key === './README.md') return false;
			return value.metadata.title && value.metadata.description;
		})
		.map(([key, value]) => {
			return {
				href: '/tools/' + key.slice(0, key.length - 9),
				title: String(value.metadata.title),
				description: String(value.metadata.description),
			};
		});

	return { tools, content, meta: metadata };
}
