import { type Plugin } from 'vite';

export const getBaseUrl = (): Plugin => {
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
