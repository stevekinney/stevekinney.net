import { mergeConfig } from 'vitest/config';
import config from './vite.config.ts';

export default mergeConfig(config, {
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}', 'compilers/**/*.{test,spec}.{js,ts}'],
  },
});
