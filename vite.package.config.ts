import { defineConfig, type LogLevel } from 'vite';
import dts from 'vite-plugin-dts';

const logLevel = (process.env.PACKAGE_LOG_LEVEL || 'error') as LogLevel;

export default defineConfig({
	plugins: [
		dts({
			exclude: ['../**/*.test.ts'],
			rollupTypes: true,
			tsconfigPath: '../tsconfig.json',
		}),
	],
	build: {
		lib: {
			entry: 'src/index.ts',
			formats: ['es', 'cjs'],
			fileName: (format) => `index.${format}.js`,
		},
		outDir: 'dist',
	},
	logLevel,
});
