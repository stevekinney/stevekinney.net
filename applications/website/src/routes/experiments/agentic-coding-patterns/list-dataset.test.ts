import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { toListDataset } from './list-dataset';
import patterns from './patterns.json';
import { parseDataset } from './validate-dataset';

const dataset = parseDataset(patterns);
const list = toListDataset(dataset);

describe('toListDataset', () => {
  it('keeps every entry, its metadata, summary, and links', () => {
    expect(list.entries).toHaveLength(dataset.entries.length);

    for (const [index, entry] of list.entries.entries()) {
      const full = dataset.entries[index];

      expect(entry).toMatchObject({
        id: full.id,
        name: full.name,
        type: full.type,
        category: full.category,
        maturity: full.maturity,
        confidence: full.confidence,
        aliases: full.aliases,
        summary: full.summary,
        related: full.related,
        missing: full.missing,
      });
    }
    expect(list.report).toEqual(dataset.report);
  });

  it('blanks the section bodies', () => {
    for (const entry of list.entries) {
      expect([entry.whenToUse, entry.whenNotToUse, entry.drawbacks]).toEqual(['', '', '']);
    }
  });

  it('is a small fraction of the full library', () => {
    expect(JSON.stringify(list).length).toBeLessThan(JSON.stringify(dataset).length / 2);
  });
});

describe('the browser copy of the library', () => {
  it('matches the library the page validates', () => {
    const copy = JSON.parse(
      readFileSync(
        new URL(
          '../../../../static/experiments/agentic-coding-patterns/patterns.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );

    expect(copy).toEqual(patterns);
  });
});
