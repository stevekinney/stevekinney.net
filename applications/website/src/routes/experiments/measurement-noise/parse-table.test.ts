import { describe, expect, it } from 'vitest';

import {
  createCsvReader,
  createJsonLinesReader,
  detectDelimiter,
  parseCsv,
  parseJson,
  parsePasted,
  splitRecord,
} from './parse-table';

describe('parseCsv', () => {
  it('reads a header and rows, trimming cells and skipping blank lines', () => {
    expect(parseCsv('condition, minutes\r\nA, 40\n\nB,52\n')).toEqual({
      ok: true,
      table: {
        columns: ['condition', 'minutes'],
        rows: [
          ['A', '40'],
          ['B', '52'],
        ],
      },
    });
  });

  it('honors quotes, doubled quotes, and delimiters inside quotes', () => {
    expect(splitRecord('"a, b","say ""hi""",c', ',')).toEqual(['a, b', 'say "hi"', 'c']);
  });

  it('joins a quoted cell that spans lines, even when streamed line by line', () => {
    const reader = createCsvReader();
    for (const line of ['task,note', 't1,"first', 'second"', 't2,plain']) reader.push(line);

    expect(reader.finish()).toEqual({
      ok: true,
      table: {
        columns: ['task', 'note'],
        rows: [
          ['t1', 'first\nsecond'],
          ['t2', 'plain'],
        ],
      },
    });
  });

  it('treats a quote inside a cell as a character, so it doesn’t swallow the rows after it', () => {
    expect(parseCsv('condition,task,minutes\nA,5" monitor,40\nA,b,50\nB,c,30\n')).toEqual({
      ok: true,
      table: {
        columns: ['condition', 'task', 'minutes'],
        rows: [
          ['A', '5" monitor', '40'],
          ['A', 'b', '50'],
          ['B', 'c', '30'],
        ],
      },
    });
  });

  it('reads the lines of a quote that never closes one at a time, keeping the rows after it', () => {
    const parsed = parseCsv('condition,task,minutes\nA,"unclosed,40\nA,b,50\nB,c,30\n');

    expect(parsed).toMatchObject({
      table: {
        rows: [
          ['A', 'unclosed,40'],
          ['A', 'b', '50'],
          ['B', 'c', '30'],
        ],
      },
    });
  });

  it('stays linear on a large file with a stray quote near the top', () => {
    const lines = ['condition,task,minutes', 'A,"open,40'];
    for (let index = 0; index < 20_000; index += 1) lines.push(`A,t${index},${index + 1}`);

    const started = performance.now();
    const parsed = parseCsv(lines.join('\n'));

    expect(parsed.ok && parsed.table.rows.length).toBe(20_001);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('detects tabs and semicolons', () => {
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
    expect(detectDelimiter('a;b;c')).toBe(';');
    expect(detectDelimiter('a,b;c')).toBe(',');
    expect(parseCsv('condition;minutes\nA;4')).toMatchObject({ table: { rows: [['A', '4']] } });
  });

  it('strips a byte-order mark from the header', () => {
    expect(parseCsv('\uFEFFcondition,minutes\nA,1')).toMatchObject({
      table: { columns: ['condition', 'minutes'] },
    });
  });

  it('reports a missing header', () => {
    expect(parseCsv('\n\n')).toMatchObject({ ok: false });
  });
});

describe('parseJson', () => {
  it('reads an array of objects with a column for every key', () => {
    expect(
      parseJson('[{"condition":"A","minutes":40},{"condition":"B","minutes":52,"accepted":true}]'),
    ).toEqual({
      ok: true,
      table: {
        columns: ['condition', 'minutes', 'accepted'],
        rows: [
          ['A', '40', ''],
          ['B', '52', 'true'],
        ],
      },
    });
  });

  it('finds the rows under a key such as tasks', () => {
    expect(parseJson('{"tasks":[{"condition":"A"}]}')).toMatchObject({
      ok: true,
      table: { rows: [['A']] },
    });
  });

  it('turns entries that aren’t objects into blank rows the dataset reports', () => {
    expect(parseJson('[{"condition":"A"}, 4]')).toMatchObject({ table: { rows: [['A'], ['']] } });
  });

  it('rejects invalid JSON and JSON that isn’t a list', () => {
    expect(parseJson('{oops')).toEqual({ ok: false, error: 'That isn’t valid JSON.' });
    expect(parseJson('"text"')).toMatchObject({ ok: false });
  });
});

describe('JSON Lines', () => {
  it('reads one object per line', () => {
    const reader = createJsonLinesReader();
    reader.push('{"condition":"A","minutes":1}');
    reader.push('');
    reader.push('{"condition":"B","minutes":2}');

    expect(reader.finish()).toMatchObject({
      ok: true,
      table: {
        rows: [
          ['A', '1'],
          ['B', '2'],
        ],
      },
    });
  });
});

describe('parsePasted', () => {
  it('reads CSV, JSON, and JSON Lines', () => {
    expect(parsePasted('condition,minutes\nA,1')).toMatchObject({ ok: true });
    expect(parsePasted('[{"condition":"A","minutes":1}]')).toMatchObject({ ok: true });
    expect(
      parsePasted('{"condition":"A","minutes":1}\n{"condition":"B","minutes":2}'),
    ).toMatchObject({
      ok: true,
      table: {
        rows: [
          ['A', '1'],
          ['B', '2'],
        ],
      },
    });
  });

  it('asks for data when the box is empty', () => {
    expect(parsePasted('  ')).toEqual({ ok: false, error: 'Paste some rows to get started.' });
  });
});
