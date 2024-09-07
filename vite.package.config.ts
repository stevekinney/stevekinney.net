import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	plugins: [
		dts({
			exclude: ['**/*.test.ts'],
			rollupTypes: true,
		}),
	],
	build: {
		lib: {
			entry: 'src/index.ts',
			fileName: 'index',
			formats: ['es', 'cjs'],
		},
	},
	logLevel: 'error',
});
