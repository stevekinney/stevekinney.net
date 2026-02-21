import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

const vitePlugins = Array.isArray(viteConfig.plugins)
  ? viteConfig.plugins
  : viteConfig.plugins
    ? [viteConfig.plugins]
    : [];

const stripAnsi = (value: string) => {
  let result = '';
  const esc = 27;

  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) === esc && value[i + 1] === '[') {
      i += 2;
      while (i < value.length && value[i] !== 'm') {
        i += 1;
      }
      continue;
    }

    result += value[i];
  }

  return result;
};

const suppressSvelteKitBaseWarning = () => {
  let originalError: typeof console.error | null = null;

  return {
    name: 'suppress-sveltekit-base-warning',
    enforce: 'pre',
    config() {
      originalError = console.error;
      console.error = (...args: unknown[]) => {
        const first = args[0];
        if (typeof first === 'string') {
          const plain = stripAnsi(first);
          if (plain.includes('Vite config options will be overridden by SvelteKit')) {
            const options = plain
              .split('\n  - ')
              .slice(1)
              .map((value) => value.trim())
              .filter(Boolean);
            if (options.length === 1 && options[0] === 'base') {
              return;
            }
          }
        }
        originalError?.(...args);
      };
    },
    configResolved() {
      if (originalError) {
        console.error = originalError;
        originalError = null;
      }
    },
  };
};

export default defineConfig({
  ...viteConfig,
  plugins: [suppressSvelteKitBaseWarning(), ...vitePlugins],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}', 'compilers/**/*.{test,spec}.{js,ts}'],
  },
});
