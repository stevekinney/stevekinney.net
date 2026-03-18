import { describe, expect, it } from 'vitest';
import type { Code, Html, Root } from 'mdast';
import { VFile } from 'vfile';
import remarkTailwindPlayground from '@stevekinney/plugins/remark-tailwind-playground';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transform = (remarkTailwindPlayground as any)() as (tree: Root, file: VFile) => void;

/** Build a minimal AST with a single code block. */
const makeTree = (lang: string, meta: string | null, value: string): Root => ({
  type: 'root',
  children: [{ type: 'code', lang, meta, value } as Code],
});

/** Run the plugin on a tree with the given VFile. */
const run = (tree: Root, file?: VFile): Root => {
  transform(tree, file ?? new VFile({ path: 'test.md' }));
  return tree;
};

/** Find all HTML nodes in the tree's top-level children. */
const htmlNodes = (tree: Root): Html[] =>
  tree.children.filter((child): child is Html => child.type === 'html');

describe('remarkTailwindPlayground', () => {
  it('inserts a playground div before the code block', () => {
    const tree = run(makeTree('html', 'tailwind', '<div class="p-4">Hello</div>'));

    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].type).toBe('html');
    expect(tree.children[1].type).toBe('code');
  });

  it('emitted div contains data-tailwind-playground and required classes', () => {
    const tree = run(makeTree('html', 'tailwind', '<p>Test</p>'));
    const [playground] = htmlNodes(tree);

    expect(playground.value).toContain('data-tailwind-playground');
    expect(playground.value).toContain('tailwind-playground');
    expect(playground.value).toContain('not-prose');
    expect(playground.value).toContain('bg-slate-100');
    expect(playground.value).toContain('dark:bg-slate-800');
  });

  it('sanitizes dangerous HTML (script tags stripped, safe elements preserved)', () => {
    const tree = run(
      makeTree('html', 'tailwind', '<div class="p-4"><script>alert("xss")</script>OK</div>'),
    );
    const [playground] = htmlNodes(tree);

    expect(playground.value).not.toContain('<script');
    expect(playground.value).toContain('OK');
    expect(playground.value).toContain('<div class="p-4">');
  });

  it('ignores code blocks without tailwind meta', () => {
    const tree = run(makeTree('html', null, '<div>Ignored</div>'));

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('code');
  });

  it('ignores non-html language blocks even with tailwind meta', () => {
    const tree = run(makeTree('css', 'tailwind', '.foo { color: red; }'));

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('code');
  });

  it('skips non-.md files', () => {
    const tree = makeTree('html', 'tailwind', '<div>Hello</div>');
    const file = new VFile({ path: 'test.svelte' });
    run(tree, file);

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('code');
  });

  it('escapes Svelte template delimiters in playground HTML', () => {
    const tree = run(
      makeTree('html', 'tailwind', '<div>{expression}</div><code>`backtick`</code>'),
    );
    const [playground] = htmlNodes(tree);

    expect(playground.value).not.toContain('{expression}');
    expect(playground.value).toContain('&#123;expression&#125;');
    expect(playground.value).not.toMatch(/(?<!&\w*)`/);
    expect(playground.value).toContain('&#96;');
  });

  it('handles multiple playground blocks in one file', () => {
    const tree: Root = {
      type: 'root',
      children: [
        { type: 'code', lang: 'html', meta: 'tailwind', value: '<div>First</div>' } as Code,
        { type: 'code', lang: 'html', meta: 'tailwind', value: '<div>Second</div>' } as Code,
      ],
    };

    run(tree);

    expect(tree.children).toHaveLength(4);
    const playgrounds = htmlNodes(tree);
    expect(playgrounds).toHaveLength(2);
    expect(playgrounds[0].value).toContain('First');
    expect(playgrounds[1].value).toContain('Second');
  });
});
