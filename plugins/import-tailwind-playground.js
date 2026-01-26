import MagicString from 'magic-string';
import { parse } from 'svelte/compiler';
import { walk } from 'svelte-tree-walker';

/**
 * @typedef {import('svelte/compiler').PreprocessorGroup} PreprocessorGroup
 */

/**
 * Creates a preprocessor to auto-import <TailwindPlayground /> components in markdown files.
 * @returns {PreprocessorGroup}
 */
export const importTailwindPlayground = () => {
  return {
    name: 'tailwind-playground-imports',
    /**
     * @param {{ content: string, filename?: string }} options
     */
    markup: (options) => {
      const { content, filename } = options;
      if (!filename?.endsWith('.md')) return;
      if (!content.includes('<TailwindPlayground')) return;

      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      let needsImport = false;
      for (const node of walk(html)) {
        if ('name' in node && node.name === 'TailwindPlayground') {
          needsImport = true;
          break;
        }
      }

      const hasImportAlready =
        content.includes("from '$lib/components/tailwind-playground.svelte'") ||
        content.includes('from "$lib/components/tailwind-playground.svelte"');

      if (needsImport && !hasImportAlready) {
        const importLine =
          "import TailwindPlayground from '$lib/components/tailwind-playground.svelte';";
        if (instance) {
          s.appendRight(instance.content.end, `\n${importLine}\n`);
        } else {
          s.prepend(`<script>\n${importLine}\n</script>\n`);
        }
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
};
