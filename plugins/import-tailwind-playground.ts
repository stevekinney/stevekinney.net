import type { PreprocessorGroup } from 'svelte/compiler';
import MagicString from 'magic-string';
import { walk } from 'svelte-tree-walker';
import { parse } from 'svelte/compiler';

/**
 * Creates a preprocessor to handle <TailwindPlayground /> components in markdown files.
 */
export const importTailwindPlayground = (): PreprocessorGroup => {
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

      // Avoid duplicate import if already present
      const hasImportAlready = /from ['"]\$lib\/components\/tailwind-playground\.svelte['"];?/.test(
        content,
      );

      if (needsImport && !hasImportAlready) {
        const importLine = `\nimport TailwindPlayground from '$lib/components/tailwind-playground.svelte';\n`;
        if (instance) {
          // Insert into existing <script> (instance) block
          s.appendRight((instance.content as { end: number }).end, `\n${importLine}`);
        } else {
          // Create a <script> block at the top with the import
          s.prepend(`<script>\n${importLine}</script>\n`);
        }
      }

      return { code: s.toString(), map: s.generateMap({ hires: true }) };
    },
  };
};
