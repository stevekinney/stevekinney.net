import type { Preview } from '@storybook/svelte';

import '../src/app.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},

	tags: ['autodocs', 'autodocs'],
};

export default preview;
