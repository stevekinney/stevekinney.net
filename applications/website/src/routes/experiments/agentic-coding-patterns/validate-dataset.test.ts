import { describe, expect, it } from 'vitest';

import patterns from './patterns.json';
import { parseDataset } from './validate-dataset';

describe('parseDataset', () => {
  it('accepts the committed dataset', () => {
    expect(parseDataset(patterns).entries.length).toBeGreaterThan(0);
  });

  it('names the field that is wrong', () => {
    const broken = structuredClone(patterns) as unknown as { entries: { summary: unknown }[] };
    const target = broken.entries[3];
    if (target) target.summary = 7;

    expect(() => parseDataset(broken)).toThrow('entries[3].summary should be a string');
    expect(() => parseDataset(null)).toThrow('the file should be an object');
    expect(() => parseDataset({ entries: {}, report: {} })).toThrow(
      'entries should be a list of objects',
    );
  });

  it('rejects a repeated id, because ids are the deep links', () => {
    const duplicated = structuredClone(patterns) as unknown as { entries: { id: string }[] };
    const [first, second] = duplicated.entries;
    if (first && second) second.id = first.id;

    expect(() => parseDataset(duplicated)).toThrow('should be unique');
  });
});
