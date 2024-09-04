import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { imagetools } from 'vite-imagetools';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { searchForWorkspaceRoot } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), enhancedImages(), imagetools()],
	esbuild: {
		jsxFactory: 'h',
		jsxFragment: 'Fragment',
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'compilers/**/*.{test,spec}.{js,ts}'],
	},
	server: {
		fs: {
			allow: [searchForWorkspaceRoot(process.cwd()), '/content/**'],
		},
	},
});
