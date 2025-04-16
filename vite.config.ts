import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, searchForWorkspaceRoot, type Plugin } from 'vite';
import { imagetools } from 'vite-imagetools';

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
        return `const root = ${projectRoot}; export default root; export const fromProjectRoot = (...segments) => root + '/' + segments.flatMap(s => s.split('/')).join('/');`;
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
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '/content/**'],
    },
  },
});
