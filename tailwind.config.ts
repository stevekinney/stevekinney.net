import type { Config } from 'tailwindcss';

import typography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';

export default {
	content: [
		'./compilers/**/*.js',
		'./src/**/*.svelte',
		'./src/**/*.html',
		'./src/**/*.ts',
		'./src/**/*.md',
		'./svelte.config.js',
	],
	theme: {
		extend: {
			colors: {
				primary: {
					'50': '#faf7fd',
					'100': '#f2ecfb',
					'200': '#e7ddf7',
					'300': '#d5c2f0',
					'400': '#bc9be5',
					'500': '#9967d5',
					'600': '#8a55c8',
					'700': '#7642ae',
					'800': '#643a8f',
					'900': '#523073',
					'950': '#361952',
				},
				'black-pearl': {
					'50': '#b3deff',
					'100': '#9ed7ff',
					'200': '#75cdff',
					'300': '#33bbff',
					'400': '#009de6',
					'500': '#007bc2',
					'600': '#005c9e',
					'700': '#004275',
					'800': '#003052',
					'900': '#02233c',
					'950': '#011628',
				},
			},
			container: {
				center: true,
				padding: {
					DEFAULT: '2rem',
				},
				screens: {
					DEFAULT: '400px',
					sm: '640px',
					md: '700px',
					lg: '1024px',
				},
			},
			fontFamily: {
				header: 'League Gothic, sans-serif',
			},
		},
	},
	plugins: [typography, containerQueries],
} satisfies Config;
