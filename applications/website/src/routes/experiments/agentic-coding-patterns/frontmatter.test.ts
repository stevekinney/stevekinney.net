import { describe, expect, it } from 'vitest';

import { parseFrontmatter, splitFlowList } from './frontmatter';

describe('parseFrontmatter', () => {
  it('reads scalars, ignoring trailing comments and keys it does not use', () => {
    const { hasFrontmatter, data, body } = parseFrontmatter(
      [
        '---',
        'type: pattern            # or methodology',
        'category: multi-agent',
        'evidence_updated: 2026-09-19',
        '---',
        '',
        '# Title',
      ].join('\n'),
    );

    expect(hasFrontmatter).toBe(true);
    expect(data).toMatchObject({ type: 'pattern', category: 'multi-agent' });
    expect(body.trim()).toBe('# Title');
  });

  it('reads inline lists, including quoted items that contain commas', () => {
    const { data } = parseFrontmatter(
      "---\naliases: [gstack, \"Garry Tan's setup, tuned\", 'The Loop']\n---\n",
    );

    expect(data.aliases).toEqual(['gstack', "Garry Tan's setup, tuned", 'The Loop']);
  });

  it('reads block lists and a single string', () => {
    expect(parseFrontmatter('---\naliases:\n  - One\n  - "Two"\n---\n').data.aliases).toEqual([
      'One',
      'Two',
    ]);
    expect(parseFrontmatter('---\naliases: Just One\n---\n').data.aliases).toBe('Just One');
  });

  it('reads an inline list that wraps onto a second line', () => {
    expect(parseFrontmatter('---\naliases: [One,\n  Two]\n---\n').data.aliases).toEqual([
      'One',
      'Two',
    ]);
  });

  it('handles Windows line endings and a byte order mark', () => {
    const { hasFrontmatter, data } = parseFrontmatter('\uFEFF---\r\ntype: pattern\r\n---\r\nBody');

    expect(hasFrontmatter).toBe(true);
    expect(data.type).toBe('pattern');
  });

  it('reports a note with no frontmatter, or an unclosed block, as having none', () => {
    expect(parseFrontmatter('# Just a note').hasFrontmatter).toBe(false);
    expect(parseFrontmatter('---\ntype: pattern\n').hasFrontmatter).toBe(false);
  });
});

describe('comments after quoted values', () => {
  it('strips a comment after the closing quote and keeps a # inside the quotes', () => {
    const { data } = parseFrontmatter(
      ['---', 'type: "pattern" # explorer entry', "category: 'a # b' # note", '---', ''].join('\n'),
    );

    expect(data).toMatchObject({ type: 'pattern', category: 'a # b' });
  });
});

describe('splitFlowList', () => {
  it('keeps an apostrophe inside a double-quoted item', () => {
    expect(splitFlowList('"It\'s", other')).toEqual(["It's", 'other']);
  });
});
