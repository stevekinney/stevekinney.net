import { describe, expect, it } from 'vitest';

import { parseBlocks, parseInline, safeHref, toPlainText } from './markdown';
import type { Block, Inline } from './markdown';

const text = (value: string): Inline => ({ type: 'text', text: value });

/** Every link and string in a tree, so a test can check that nothing active got through. */
const collectLinks = (blocks: Block[]): string[] => {
  const links: string[] = [];
  const visitInline = (nodes: Inline[]): void => {
    for (const node of nodes) {
      if (node.type === 'link') links.push(node.href);
      if ('children' in node) visitInline(node.children);
    }
  };
  const visit = (nodes: Block[]): void => {
    for (const block of nodes) {
      if ('children' in block && block.type !== 'blockquote') visitInline(block.children);
      if (block.type === 'blockquote') visit(block.children);
      if (block.type === 'list') block.items.forEach(visit);
    }
  };
  visit(blocks);

  return links;
};

describe('parseInline', () => {
  it('reads emphasis, strong text, and inline code', () => {
    expect(parseInline('a *b* and **c** and `d`')).toEqual([
      text('a '),
      { type: 'emphasis', children: [text('b')] },
      text(' and '),
      { type: 'strong', children: [text('c')] },
      text(' and '),
      { type: 'code', text: 'd' },
    ]);
  });

  it('nests emphasis inside strong text and handles a run of three', () => {
    expect(parseInline('**bold *em***')).toEqual([
      { type: 'strong', children: [text('bold '), { type: 'emphasis', children: [text('em')] }] },
    ]);
    expect(parseInline('***both***')).toEqual([
      { type: 'strong', children: [{ type: 'emphasis', children: [text('both')] }] },
    ]);
  });

  it('leaves underscores inside words and stray asterisks alone', () => {
    expect(parseInline('snake_case_name and 2 * 3 * 4')).toEqual([
      text('snake_case_name and 2 * 3 * 4'),
    ]);
  });

  it('does not format inside code', () => {
    expect(parseInline('`a *b* c`')).toEqual([{ type: 'code', text: 'a *b* c' }]);
  });

  it('reads wikilinks with and without a label, and drops embeds and images', () => {
    expect(parseInline('See [[Agent Teams]] and [[Delegation Chain|chains]].')).toEqual([
      text('See '),
      { type: 'wikilink', target: 'Agent Teams', label: 'Agent Teams' },
      text(' and '),
      { type: 'wikilink', target: 'Delegation Chain', label: 'chains' },
      text('.'),
    ]);
    expect(
      parseInline('before ![[diagram.svg|720]] after ![alt](https://example.com/x.png).'),
    ).toEqual([text('before  after .')]);
  });

  it('turns a safe link into a link and keeps parentheses in an address', () => {
    expect(parseInline('[docs](https://example.com/a_(b) "Title")')).toEqual([
      { type: 'link', href: 'https://example.com/a_(b)', children: [text('docs')] },
    ]);
  });

  it('links bare addresses without taking the punctuation after them', () => {
    expect(parseInline('Visit https://example.com/page, then (https://example.org).')).toEqual([
      text('Visit '),
      {
        type: 'link',
        href: 'https://example.com/page',
        children: [text('https://example.com/page')],
      },
      text(', then ('),
      { type: 'link', href: 'https://example.org/', children: [text('https://example.org')] },
      text(').'),
    ]);
  });

  it('honors backslash escapes', () => {
    expect(parseInline('\\*not em\\* and \\[x\\]')).toEqual([text('*not em* and [x]')]);
  });

  it('breaks a line after two spaces and joins others with a space', () => {
    expect(parseInline('one  \ntwo\nthree')).toEqual([
      text('one'),
      { type: 'break' },
      text('two three'),
    ]);
  });
});

describe('safeHref', () => {
  it('allows only absolute http, https, and mailto addresses', () => {
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a');
    expect(safeHref('HTTP://example.com')).toBe('http://example.com/');
    expect(safeHref('mailto:a@example.com')).toBe('mailto:a@example.com');
  });

  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '//evil.example/x',
    '/relative/path',
    '#heading',
    'other-note.md',
    '',
  ])('rejects %j', (address) => {
    expect(safeHref(address)).toBeNull();
  });
});

describe('inert content', () => {
  it('renders a script tag as text, not as markup or a link', () => {
    const blocks = parseBlocks(
      'Before <script>alert("x")</script> after.\n\n<img src=x onerror=alert(1)>',
    );

    expect(blocks).toEqual([
      { type: 'paragraph', children: [text('Before <script>alert("x")</script> after.')] },
      { type: 'paragraph', children: [text('<img src=x onerror=alert(1)>')] },
    ]);
  });

  it('keeps only the label of a javascript: link, as plain text', () => {
    const blocks = parseBlocks('[click me](javascript:alert(1)) and [safe](https://example.com)');

    expect(collectLinks(blocks)).toEqual(['https://example.com/']);
    expect(toPlainText('[click me](javascript:alert(1))')).toBe('click me');
  });

  it('does not let a link label smuggle a second link past the check', () => {
    const blocks = parseBlocks('[[x](javascript:alert(1))](https://example.com)');

    expect(collectLinks(blocks).every((href) => href.startsWith('https:'))).toBe(true);
  });
});

describe('parseBlocks', () => {
  it('splits paragraphs on blank lines', () => {
    expect(parseBlocks('One\ncontinues.\n\nTwo.')).toEqual([
      { type: 'paragraph', children: [text('One continues.')] },
      { type: 'paragraph', children: [text('Two.')] },
    ]);
  });

  it('reads bullet and numbered lists, with nesting', () => {
    const [list] = parseBlocks('- one\n- two\n  - nested\n- three');

    expect(list).toMatchObject({ type: 'list', ordered: false });
    expect(list?.type === 'list' && list.items).toHaveLength(3);
    expect(list?.type === 'list' && list.items[1]?.[1]).toMatchObject({
      type: 'list',
      ordered: false,
    });

    expect(parseBlocks('3. a\n4. b')[0]).toMatchObject({ type: 'list', ordered: true, start: 3 });
  });

  it('reads a long list item that wraps onto the next line', () => {
    const [list] = parseBlocks('- first line\n  wrapped\n- second');

    expect(list?.type === 'list' && list.items[0]).toEqual([
      { type: 'paragraph', children: [text('first line wrapped')] },
    ]);
  });

  it('reads block quotes, fenced code, and headings', () => {
    expect(parseBlocks('> quoted\n> text')[0]).toEqual({
      type: 'blockquote',
      children: [{ type: 'paragraph', children: [text('quoted text')] }],
    });
    expect(parseBlocks('```ts\nconst a = 1;\n# not a heading\n```')[0]).toEqual({
      type: 'code',
      language: 'ts',
      text: 'const a = 1;\n# not a heading',
    });
    expect(parseBlocks('#### Sub')[0]).toEqual({
      type: 'heading',
      level: 4,
      children: [text('Sub')],
    });
  });

  it('drops a paragraph that held only an embed', () => {
    expect(parseBlocks('![[diagram.svg|720]]\n\nText')).toEqual([
      { type: 'paragraph', children: [text('Text')] },
    ]);
  });
});

describe('toPlainText', () => {
  it('removes formatting and joins blocks', () => {
    expect(toPlainText('**Bold** and [[Note|a note]].\n\n- one\n- `two`')).toBe(
      'Bold and a note. one two',
    );
  });
});
