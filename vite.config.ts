import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import { imagetools } from 'vite-imagetools';
import tailwindcss from '@tailwindcss/vite';

const getBaseUrl = (): Plugin => {
  const moduleId = 'virtual:base-url';
  const virtualModuleId = '\0' + moduleId;

  return {
    name: 'get-base-url',
    enforce: 'pre',
    resolveId(id) {
      if (id === moduleId) {
        return virtualModuleId;
      }
    },
    async load(id) {
      if (id === virtualModuleId) {
        if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
          return `export default 'https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}';`;
        }
        return `export default '';`;
      }
    },
  };
};

export default defineConfig({
  plugins: [sveltekit(), enhancedImages(), imagetools(), tailwindcss(), getBaseUrl()],

  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '/content/**'],
    },
  },
});
