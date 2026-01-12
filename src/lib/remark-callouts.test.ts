import { describe, expect, it } from 'vitest';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Properties } from 'hast';
import type { Blockquote, Paragraph, Root } from 'mdast';
import { VFile } from 'vfile';
import remarkCallouts from '../../plugins/remark-callouts';

const getBlockquote = (tree: Root): Blockquote => {
  const node = tree.children.find((child) => child.type === 'blockquote');
  return node as Blockquote;
};

const getClassList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => entry.split(/\s+/).filter(Boolean));
  }
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  return [];
};

type HastData = {
  hName?: string;
  hProperties?: Properties & { className?: string | string[] };
};

const getData = (node: { data?: unknown }): HastData | undefined =>
  node.data as HastData | undefined;

const run = (markdown: string): Blockquote => {
  const tree = fromMarkdown(markdown) as Root;
  remarkCallouts()(tree, new VFile(), () => {});
  return getBlockquote(tree);
};

describe('remarkCallouts', () => {
  it('converts callout blockquotes to styled divs', () => {
    const blockquote = run('> [!NOTE] Title\n>\n> Body');
    const paragraph = blockquote.children[0] as Paragraph;
    const data = getData(blockquote);
    const paragraphData = getData(paragraph);

    expect(data?.hName).toBe('div');
    expect(data?.hProperties?.['data-callout']).toBe('note');
    expect(getClassList(data?.hProperties?.className)).toContain('space-y-2');
    expect(getClassList(data?.hProperties?.className)).toContain('bg-blue-50');
    expect(getClassList(paragraphData?.hProperties?.className)).toContain('font-bold');
    expect(paragraph.children[0].type).toBe('text');
    expect((paragraph.children[0] as { value: string }).value).toBe('Title');
  });

  it('uses the variant name as a fallback title', () => {
    const blockquote = run('> [!TIP]\n>\n> Body');
    const paragraph = blockquote.children[0] as Paragraph;

    expect((paragraph.children[0] as { value: string }).value).toBe('Tip');
    expect(getData(blockquote)?.hProperties?.['data-callout']).toBe('tip');
  });

  it('splits inline callouts into title and body paragraphs', () => {
    const blockquote = run('> [!NOTE] Title\n> Body');

    expect(blockquote.children[0].type).toBe('paragraph');
    expect(blockquote.children[1].type).toBe('paragraph');

    const title = blockquote.children[0] as Paragraph;
    const body = blockquote.children[1] as Paragraph;

    expect((title.children[0] as { value: string }).value).toBe('Title');
    expect((body.children[0] as { value: string }).value).toBe('Body');
  });

  it('handles linkReference markers emitted by mdsvex', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'linkReference',
                  identifier: '!note',
                  label: '!NOTE',
                  referenceType: 'shortcut',
                  children: [{ type: 'text', value: '!NOTE' }],
                },
                { type: 'text', value: ' Title' },
              ],
            },
          ],
        },
      ],
    };

    remarkCallouts()(tree, new VFile(), () => {});
    const blockquote = getBlockquote(tree);
    const paragraph = blockquote.children[0] as Paragraph;

    expect(getData(blockquote)?.hProperties?.['data-callout']).toBe('note');
    expect(paragraph.children[0].type).toBe('text');
    expect((paragraph.children[0] as { value: string }).value).toBe('Title');
  });

  it('normalizes alias variants for styling', () => {
    const blockquote = run('> [!IMPORTANT] Heads up');
    const data = getData(blockquote);
    expect(data?.hProperties?.['data-callout']).toBe('tip');
    expect(getClassList(data?.hProperties?.className)).toContain('bg-green-50');
  });

  it('leaves non-callout blockquotes unchanged', () => {
    const tree = fromMarkdown('> Just a quote') as Root;
    remarkCallouts()(tree, new VFile(), () => {});
    const blockquote = getBlockquote(tree);
    expect(blockquote.data).toBeUndefined();
  });

  it('marks callouts with - indicator as foldable (collapsed by default)', () => {
    const blockquote = run('> [!Example]- Exercise\n>\n> Body');
    const data = getData(blockquote);

    expect(data?.hProperties?.['data-callout']).toBe('example');
    expect(data?.hProperties?.['data-foldable']).toBe('');
    expect(data?.hProperties?.['data-default-open']).toBeUndefined();
  });

  it('marks callouts with + indicator as foldable (expanded by default)', () => {
    const blockquote = run('> [!TIP]+ Hint\n>\n> Body');
    const data = getData(blockquote);

    expect(data?.hProperties?.['data-callout']).toBe('tip');
    expect(data?.hProperties?.['data-foldable']).toBe('');
    expect(data?.hProperties?.['data-default-open']).toBe('');
  });

  it('does not mark regular callouts as foldable', () => {
    const blockquote = run('> [!NOTE] Title\n>\n> Body');
    const data = getData(blockquote);

    expect(data?.hProperties?.['data-callout']).toBe('note');
    expect(data?.hProperties?.['data-foldable']).toBeUndefined();
    expect(data?.hProperties?.['data-default-open']).toBeUndefined();
  });
});
