import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { imagetools } from 'vite-imagetools';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { searchForWorkspaceRoot, type Plugin } from 'vite';

const projectRoot = (id: string = 'project-root'): Plugin => {
	const virtualModuleId = `virtual:${id}`;
	const resolvedVirtualModuleId = '\0' + virtualModuleId;

	return {
		name: 'project-root',
		resolveId(id) {
			if (id === virtualModuleId) {
				return resolvedVirtualModuleId;
			}
		},
		load(id) {
			if (id === resolvedVirtualModuleId) {
				const projectRoot = JSON.stringify(searchForWorkspaceRoot(process.cwd()));
				return `export default ${projectRoot};`;
			}
		},
	};
};

export default defineConfig({
	plugins: [sveltekit(), enhancedImages(), imagetools(), projectRoot()],
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
