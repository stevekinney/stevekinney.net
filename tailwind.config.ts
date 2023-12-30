import type { Config } from 'tailwindcss';

import typography from '@tailwindcss/typography';

export default {
	content: ['./src/**/*.svelte', './src/**/*.html', './src/**/*.ts'],
	theme: {
		extend: {
			container: {
				center: true,
				padding: {
					DEFAULT: '0',
					sm: '2rem',
					lg: '4rem',
				},
				screens: {
					DEFAULT: '400px',
					sm: '640px',
					md: '768px',
					lg: '1024px',
				},
			},
			fontFamily: {
				header: 'League Gothic, sans-serif',
			},
		},
	},
	plugins: [typography],
} satisfies Config;
