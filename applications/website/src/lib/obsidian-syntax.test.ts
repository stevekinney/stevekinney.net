import { describe, expect, it } from 'vitest';

import { normalizeObsidianMarkdown } from '@stevekinney/markdown/obsidian-normalization';
import { maskObsidianProtectedSource } from '../../../../packages/markdown/src/obsidian-protected-source';
import { parseObsidianSource } from '@stevekinney/markdown/obsidian-syntax';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';

const context = {
  sourcePath: 'writing/example.md',
  publicationIndex: { documents: [], attachments: [] },
};

const standardParser = unified().use(remarkParse).use(remarkGfm);

describe('Obsidian syntax', () => {
  it('keeps parsed-tree fast paths equivalent across protected and supported Markdown', () => {
    const fixtures = [
      'Plain Markdown with **emphasis** and a [link](https://example.com).',
      '`code [[wiki]] %% comment %%`\n\n<script>const x = "[[hidden]]";</script>',
      '%% comment across\n```ts\nconst value = 1;\n```\n%%',
      '[[missing]] ![[missing-embed]]',
      '==**highlight** [[nested]]==',
      '$x^2$\n\n$$\ny = x\n$$',
      'Paragraph ^block-id\n\n^standalone-id',
      '[^footnote]: Footnote text\n\nReference[^footnote]',
      '[Guide](guide.md#section)',
      'Text\r\n\r\nPlain paragraph',
    ];

    for (const source of fixtures) {
      const markdownTree = standardParser.parse(source);
      const withTree = normalizeObsidianMarkdown(source, { ...context, markdownTree });
      const withoutTree = normalizeObsidianMarkdown(source, context);

      expect(withTree).toEqual(withoutTree);
    }
  });
  it('masks frontmatter and executable Svelte while preserving offsets and line endings', () => {
    const source =
      '---\r\nvalue: [[Hidden]]\r\n---\r\n\n<script>%% hidden %%</script>\n{value + `{nested}`}\n[[Visible]]';
    const masked = maskObsidianProtectedSource(source);

    expect(masked).toHaveLength(source.length);
    expect(masked.match(/\r\n/g)).toHaveLength(source.match(/\r\n/g)?.length ?? 0);
    expect(masked).toContain('[[Visible]]');
    expect(masked).not.toContain('[[Hidden]]');
    expect(masked).not.toContain('%% hidden %%');
  });

  it('preserves astral UTF-16 offsets and protects quoted braces and nested templates', () => {
    const source = '😀 {value: "}" + `nested ${"}"}`} [[visible]]';
    const masked = maskObsidianProtectedSource(source);

    expect(masked).toHaveLength(source.length);
    expect(masked.slice(source.indexOf('[[visible]]'))).toBe('[[visible]]');
    expect(masked.slice(0, source.indexOf('[[visible]]'))).not.toContain('value');
  });

  it('only treats a matching fence as a code fence close', () => {
    const source = '````md\n{hidden}\n```\n{also hidden}\n````\n{visible}';
    const masked = maskObsidianProtectedSource(source);

    expect(masked).toContain('{also hidden}');
    expect(masked).toContain('{hidden}');
    expect(masked).not.toContain('{visible}');
  });
  it('removes comments spanning links while preserving the link inside the comment', () => {
    const source = 'before %% [secret](https://example.com) %% after';

    expect(normalizeObsidianMarkdown(source, context).markdown).toBe('before  after');
  });

  it('recognizes multiline comments and leaves escaped comment markers literal', () => {
    const source = [
      '\\%% literal',
      '%% **markup** [link](url)',
      'inside `code` comment',
      '%% after',
    ].join('\n');
    const nodes = parseObsidianSource(source).nodes;

    expect(nodes.filter((node) => node.type === 'comment')).toHaveLength(1);
    expect(normalizeObsidianMarkdown(source, context).markdown).toContain('% literal');
  });

  it('protects comments in inline code, fenced code, raw scripts, and frontmatter', () => {
    const source = `---\nnote: %% keep %%\n---\n\n\`%% keep %%\`\n\n\`\`\`md\n%% keep %%\n\`\`\`\n\n<script>const value = '%% keep %%';</script>\n\n%% remove %%`;

    const normalized = normalizeObsidianMarkdown(source, context);

    expect(normalized.markdown).toContain('note: %% keep %%');
    expect(normalized.markdown).toContain('`%% keep %%`');
    expect(normalized.markdown).toContain('%% keep %%');
    expect(normalized.markdown).not.toContain('%% remove %%');
  });

  it('reports an unclosed comment with its source line', () => {
    const normalized = normalizeObsidianMarkdown('first\nsecond %% secret', context);

    expect(normalized.diagnostics).toEqual([
      { file: context.sourcePath, line: 2, message: 'Unclosed Obsidian comment.' },
    ]);
  });

  it('retains exact source offsets for comments and block definitions', () => {
    const source = 'text\r\n^anchor\r\n';
    const nodes = parseObsidianSource(source).nodes;

    expect(nodes).toContainEqual({
      type: 'blockDefinition',
      value: 'anchor',
      position: { start: 6, end: 13 },
    });
  });

  it('removes block definitions and preserves nested inline markup in highlights', () => {
    const normalized = normalizeObsidianMarkdown('Paragraph ^id\n\n==**bold** [[note]]==', context);

    expect(normalized.markdown).toContain('Paragraph');
    expect(normalized.markdown).not.toContain('^id');
    expect(normalized.markdown).toContain('<mark>**bold** [[note]]</mark>');
  });

  it('does not parse block definitions inside code spans', () => {
    expect(parseObsidianSource('`^inside`\n\n^outside').nodes).toContainEqual(
      expect.objectContaining({ type: 'blockDefinition', value: 'outside' }),
    );
    expect(parseObsidianSource('`^inside`').nodes).toHaveLength(0);
  });

  it('reports and removes unclosed comment markers', () => {
    const source = '%% unopened but literal';

    expect(normalizeObsidianMarkdown(source, context).markdown).toBe('');
    expect(normalizeObsidianMarkdown(source, context).diagnostics).toHaveLength(1);
  });
});

it('removes private comments across blank lines, headings, and fenced blocks', () => {
  const source = 'Public %% secret\n\n# Private\n```js\nsecret\n```\n%% end';
  const result = normalizeObsidianMarkdown(source, context);
  expect(result.diagnostics).toEqual([]);
  expect(result.markdown).toBe('Public  end');
});

it('retains math braces and source offsets after astral Unicode', () => {
  const source = '😀 {"%% private expression %%"} $\\frac{1}{2}$ %% hidden %%';
  const result = normalizeObsidianMarkdown(source, context);
  expect(result.markdown).toContain('{"%% private expression %%"}');
  expect(result.markdown).not.toContain('hidden');
  const math = parseObsidianSource(source).nodes.find((node) => node.type === 'inlineMath');
  expect(math?.value).toBe('\\frac{1}{2}');
  expect(source.slice(math!.position.start, math!.position.end)).toBe('$\\frac{1}{2}$');
});

it('recognizes block markers only at the end of a line', () => {
  expect(parseObsidianSource('word^not-a-marker\n\ntext ^id extra').nodes).toEqual([]);
  expect(parseObsidianSource('text ^valid\r\nnext').nodes).toContainEqual(
    expect.objectContaining({ type: 'blockDefinition', value: 'valid' }),
  );
});

it('keeps currency prices as prose while retaining inline and display math', () => {
  const source = 'Prices are $5 and $10. Inline $x^2$ and display:\n\n$$\ny = x\n$$';
  const parsed = parseObsidianSource(source);

  expect(parsed.nodes.filter((node) => node.type === 'inlineMath')).toEqual([
    expect.objectContaining({ type: 'inlineMath', value: 'x^2' }),
  ]);
  expect(parsed.nodes.filter((node) => node.type === 'math')).toEqual([
    expect.objectContaining({ type: 'math', value: 'y = x' }),
  ]);
  expect(normalizeObsidianMarkdown(source, context).markdown).toContain('Prices are $5 and $10.');
});

it('keeps currency ranges and prose prices before an equation literal', () => {
  const source = 'Budget: $5-$10. The answer is $5, then use $x + 1$.';
  const parsed = parseObsidianSource(source);

  expect(parsed.nodes.filter((node) => node.type === 'inlineMath')).toEqual([
    expect.objectContaining({ type: 'inlineMath', value: 'x + 1' }),
  ]);
  expect(normalizeObsidianMarkdown(source, context).markdown).toContain('Budget: $5-$10.');
});
