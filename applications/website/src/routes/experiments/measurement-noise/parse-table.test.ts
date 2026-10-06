import { describe, expect, it } from 'vitest';

import {
  createCsvReader,
  createJsonLinesReader,
  detectDelimiter,
  MAX_PENDING_CHARACTERS,
  MAX_PENDING_LINES,
  MAX_ROWS,
  parseCsv,
  parseJson,
  parsePasted,
  ROW_LIMIT_NOTE,
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
    // The quote's line and the lines after it fill the pending record exactly to its limit.
    const lines = ['condition,task,minutes', 'A,"open,40'];
    for (let index = 1; index < MAX_PENDING_LINES; index += 1) {
      lines.push(`A,t${index},${index + 1}`);
    }

    const started = performance.now();
    const parsed = parseCsv(lines.join('\n'));

    expect(parsed.ok && parsed.table.rows.length).toBe(MAX_PENDING_LINES);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('stops with an error once an unclosed quote runs past 10,000 lines', () => {
    expect(MAX_PENDING_LINES).toBe(10_000);

    const reader = createCsvReader();
    const lines = ['condition,task,minutes', 'A,b,1', 'A,"open,40'];
    for (let index = 0; index < MAX_PENDING_LINES * 3; index += 1) lines.push(`A,t${index},1`);
    const wanted = lines.map((line) => reader.push(line));

    // The 10,001st line of the open quote stops the reader, and every push after it.
    const stop = 2 + MAX_PENDING_LINES;
    expect(wanted.slice(0, stop).every(Boolean)).toBe(true);
    expect(wanted.slice(stop).some(Boolean)).toBe(false);
    expect(reader.finish()).toEqual({
      ok: false,
      error:
        'A quoted field never closes. The quote that opens on line 3 is still open 10,000 lines later, so the file can’t be read. Check that line for a stray quote mark.',
    });
  });

  it('stops with an error once an unclosed quote holds more than a million characters', () => {
    expect(MAX_PENDING_CHARACTERS).toBe(1_000_000);

    const long = 'x'.repeat(300_000);
    const parsed = parseCsv(['"condition', long, long, long, long, 'A,b'].join('\n'));

    expect(parsed).toMatchObject({ ok: false });
    expect(!parsed.ok && parsed.error).toMatch(
      /^A quoted field never closes\. The quote that opens on line 1 is still open/,
    );
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

  it('prefers the rows key over an earlier array, such as a list of column names', () => {
    expect(parseJson('{"columns":["a","b"],"Rows":[{"a":"A","b":"1"},{"a":"B","b":"2"}]}')).toEqual(
      {
        ok: true,
        table: {
          columns: ['a', 'b'],
          rows: [
            ['A', '1'],
            ['B', '2'],
          ],
        },
      },
    );
  });

  it('otherwise takes the first array of objects, under any key', () => {
    expect(
      parseJson('{"labels":["x"],"runs":[{"condition":"A"}],"other":[{"condition":"B"}]}'),
    ).toEqual({ ok: true, table: { columns: ['condition'], rows: [['A']] } });
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

describe('the row limit', () => {
  const csvLines = (count: number): string[] => [
    'condition,minutes',
    ...Array.from({ length: count }, (_, index) => `A,${index + 1}`),
  ];

  it('is 100,000 rows, and says so when it cuts a file short', () => {
    expect(MAX_ROWS).toBe(100_000);
    expect(ROW_LIMIT_NOTE).toBe('Read the first 100,000 rows only.');
  });

  it('keeps every row of a CSV file at exactly the limit', () => {
    const result = parseCsv(csvLines(MAX_ROWS).join('\n'));

    expect(result.ok && result.table.rows.length).toBe(MAX_ROWS);
    expect(result).not.toHaveProperty('truncated');
  });

  it('stops a CSV reader at the limit and reports it', () => {
    const reader = createCsvReader();
    const wanted = csvLines(MAX_ROWS + 2).map((line) => reader.push(line));
    const result = reader.finish();

    // Blank lines and the header don't count toward the limit.
    expect(wanted.slice(0, MAX_ROWS + 1).every(Boolean)).toBe(true);
    expect(wanted.slice(MAX_ROWS + 1)).toEqual([false, false]);
    expect(result.ok && result.table.rows.length).toBe(MAX_ROWS);
    expect(result.ok && result.table.rows.at(-1)).toEqual(['A', String(MAX_ROWS)]);
    expect(result).toMatchObject({ ok: true, truncated: true });
  });

  it('stops a JSON Lines reader at the limit and reports it', () => {
    const reader = createJsonLinesReader();
    const wanted = Array.from({ length: MAX_ROWS + 1 }, (_, index) =>
      reader.push(`{"condition":"A","minutes":${index + 1}}`),
    );
    const result = reader.finish();

    expect(wanted.at(-2)).toBe(true);
    expect(wanted.at(-1)).toBe(false);
    expect(result.ok && result.table.rows.length).toBe(MAX_ROWS);
    expect(result).toMatchObject({ ok: true, truncated: true });
  });

  it('keeps the first rows of a JSON array past the limit, and pasted text says so too', () => {
    const items = Array.from({ length: MAX_ROWS + 1 }, (_, index) => ({ minutes: index + 1 }));
    const json = parseJson(JSON.stringify({ rows: items }));

    expect(json.ok && json.table.rows.length).toBe(MAX_ROWS);
    expect(json).toMatchObject({ ok: true, truncated: true });
    expect(parsePasted(csvLines(MAX_ROWS + 1).join('\n'))).toMatchObject({ truncated: true });
    expect(parseJson(JSON.stringify(items.slice(0, MAX_ROWS)))).not.toHaveProperty('truncated');
  });
});
