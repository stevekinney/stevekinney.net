type Section = {
	title: string;
	slug: string;
};

const index: Readonly<Section[]> = [
	{ title: 'Getting Started', slug: 'getting-started' },
	{ title: 'Aligning Objects', slug: 'aligning-objects' },
	{ title: 'Working with Layers', slug: 'layers' },
	{ title: 'Organizing Layouts with Frames', slug: 'organizing-with-frames' },
] as const;

export default index;
