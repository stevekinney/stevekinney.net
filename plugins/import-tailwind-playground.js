import MagicString from 'magic-string';
import { walk } from 'svelte-tree-walker';
import { parse } from 'svelte/compiler';

/**
 * Creates a preprocessor to handle <tailwind-example> components in markdown files.
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export const importTailwindPlayground = () => {
  return {
    name: 'tailwind-example',
    markup: ({ content, filename }) => {
      if (!filename?.endsWith('.md')) return;

      // Parse the content with the Svelte Compiler
      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      // Find all <tailwind-example> components and process them
      for (const node of walk(html)) {
        if ('name' in node && node.name === 'TailwindPlayground') {
          s.appendRight(
            instance.content.end,
            `\nimport TailwindPlayground from '$lib/components/tailwind-playground.svelte';\n`,
          );
          break;
        }
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
};
