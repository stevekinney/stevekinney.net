/*
 * This code has been generated by src/lib/fonts/generate.ts.
 * Do not edit this file directly.
 */

export const fonts = {
	'league-gothic': {
		path: '@fontsource/league-gothic',
		family: 'League Gothic',
		weights: [400],
		subsets: ['latin', 'latin-ext', 'vietnamese'],
		defaultSubset: 'latin',
		styles: ['normal'],
	},
	roboto: {
		path: '@fontsource/roboto',
		family: 'Roboto',
		weights: [100, 300, 400, 500, 700, 900],
		subsets: ['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'latin', 'latin-ext', 'vietnamese'],
		defaultSubset: 'latin',
		styles: ['italic', 'normal'],
	},
	'fira-sans': {
		path: '@fontsource/fira-sans',
		family: 'Fira Sans',
		weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
		subsets: ['cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'latin', 'latin-ext', 'vietnamese'],
		defaultSubset: 'latin',
		styles: ['italic', 'normal'],
	},
} as const;

export type Fonts = typeof fonts;
