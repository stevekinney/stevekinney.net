import { readFile } from 'fs/promises';
import { type Plugin } from 'vite';

export const openGraphPlugin = (): Plugin => {
  return {
    name: 'open-graph',
    resolveId(id) {
      if (id.startsWith('virtual:open-graph')) {
        return `\0${id}`;
      }
    },
    load(id) {
      if (id.startsWith('\0virtual:open-graph')) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#333"/>
  <text x="600" y="315" font-size="64" text-anchor="middle" fill="#fff" dy=".3em">Open Graph Image</text>
</svg>`;
        return `export default 'data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}'`;
      }
    },
  };
};
