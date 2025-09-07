import MagicString from 'magic-string';
import { walk } from 'svelte-tree-walker';
import { parse } from 'svelte/compiler';

/**
 * Creates a preprocessor to handle <TailwindPlayground /> components in markdown files.
 * @returns {import('svelte/compiler').PreprocessorGroup}
 */
export const importTailwindPlayground = () => {
  return {
    name: 'tailwind-example',
    markup: ({ content, filename }) => {
      if (!filename?.endsWith('.md')) return;
      if (!content.includes('<TailwindPlayground')) return;

      // Parse the content with the Svelte Compiler
      const { instance, html } = parse(content, { filename });
      const s = new MagicString(content);

      let needsImport = false;
      // Find all <TailwindPlayground> components and ensure import exists
      for (const node of walk(html)) {
        if ('name' in node && node.name === 'TailwindPlayground') {
          needsImport = true;
          break;
        }
      }

      if (needsImport) {
        const importLine = `\nimport TailwindPlayground from '$lib/components/tailwind-playground.svelte';\n`;
        if (instance) {
          // Insert into existing <script> (instance) block
          s.appendRight(instance.content.end, importLine);
        } else {
          // Create a <script> block at the top with the import
          s.prepend(`<script>\n${importLine}</script>\n`);
        }
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
};
