import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: 'src/index.js',
			formats: ['es'],
		},
	},
});
