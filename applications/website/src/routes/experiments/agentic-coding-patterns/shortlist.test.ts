import { describe, expect, it } from 'vitest';

import {
  isStarred,
  readShortlist,
  setNote,
  shortlistStorageKey,
  shortlistToCsv,
  shortlistToMarkdown,
  toggleStar,
  writeShortlist,
} from './shortlist';
import type { PatternEntry } from './pattern-types';

const entry = (name: string, overrides: Partial<PatternEntry> = {}): PatternEntry => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  type: 'pattern',
  category: 'multi-agent',
  maturity: 'emerging',
  confidence: 'Emerging',
  aliases: [],
  summary: '',
  whenToUse: '',
  whenNotToUse: '',
  drawbacks: '',
  related: [],
  sourcePath: `${name}.md`,
  missing: [],
  ...overrides,
});

const rows = [
  { entry: entry('Agent Teams'), note: 'Try with a review task.' },
  {
    entry: entry('Circuit Breaker', { category: 'control-loop', maturity: 'established' }),
    note: '',
  },
];

describe('shortlist edits', () => {
  it('adds, notes, and removes entries', () => {
    const added = toggleStar([], 'a');

    expect(added).toEqual([{ id: 'a', note: '' }]);
    expect(isStarred(added, 'a')).toBe(true);
    expect(setNote(added, 'a', 'hello')).toEqual([{ id: 'a', note: 'hello' }]);
    expect(toggleStar(added, 'a')).toEqual([]);
  });
});

describe('shortlist storage', () => {
  it('round-trips through storage', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };

    writeShortlist([{ id: 'a', note: 'n' }], storage);

    expect(values.has(shortlistStorageKey)).toBe(true);
    expect(readShortlist(storage)).toEqual([{ id: 'a', note: 'n' }]);
  });

  it('gives an empty shortlist when storage is missing, throws, or holds junk', () => {
    expect(readShortlist(null)).toEqual([]);
    expect(
      readShortlist({
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => undefined,
      }),
    ).toEqual([]);
    expect(readShortlist({ getItem: () => '{not json', setItem: () => undefined })).toEqual([]);
    expect(
      readShortlist({
        getItem: () => JSON.stringify([{ id: 'a', note: 'x' }, 7, { id: 3 }, null]),
        setItem: () => undefined,
      }),
    ).toEqual([{ id: 'a', note: 'x' }]);
  });

  it('does not throw when writing fails', () => {
    expect(() =>
      writeShortlist([{ id: 'a', note: '' }], {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota');
        },
      }),
    ).not.toThrow();
    expect(() => writeShortlist([], null)).not.toThrow();
  });
});

describe('shortlistToMarkdown', () => {
  it('writes a Contents heading and one wikilink bullet for each entry, with its note', () => {
    expect(shortlistToMarkdown(rows)).toBe(
      [
        '# Pattern shortlist',
        '',
        '## Contents',
        '',
        '- [[Agent Teams]]—Try with a review task.',
        '- [[Circuit Breaker]]',
        '',
      ].join('\n'),
    );
  });

  it('keeps a multi-line note on one line, so it stays a single bullet', () => {
    expect(shortlistToMarkdown([{ entry: entry('A'), note: 'one\n\n- two' }])).toContain(
      '- [[A]]—one - two',
    );
  });
});

describe('shortlistToCsv', () => {
  it('writes the header and a row for each entry', () => {
    expect(shortlistToCsv(rows)).toBe(
      [
        'name,category,maturity,confidence,note',
        'Agent Teams,multi-agent,emerging,Emerging,Try with a review task.',
        'Circuit Breaker,control-loop,established,Emerging,',
        '',
      ].join('\r\n'),
    );
  });

  it('quotes commas and quotes, and defuses a cell a spreadsheet would run as a formula', () => {
    const csv = shortlistToCsv([
      { entry: entry('A'), note: 'say "hi", then =SUM(A1)' },
      { entry: entry('B'), note: '=1+1' },
    ]);

    expect(csv).toContain('"say ""hi"", then =SUM(A1)"');
    expect(csv).toContain("'=1+1");
  });
});
