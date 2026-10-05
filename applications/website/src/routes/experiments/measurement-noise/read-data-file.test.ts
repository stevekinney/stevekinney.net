import { describe, expect, it } from 'vitest';

import { formatOf, readDataFile } from './read-data-file';

const fileOf = (name: string, text: string): File => new File([text], name);

describe('readDataFile', () => {
  it('picks the format from the extension', () => {
    expect(formatOf('timings.CSV')).toBe('csv');
    expect(formatOf('timings.json')).toBe('json');
    expect(formatOf('timings.ndjson')).toBe('jsonl');
    expect(formatOf('timings')).toBe('csv');
  });

  it('streams a CSV file into a table', async () => {
    await expect(readDataFile(fileOf('t.csv', 'condition,minutes\nA,4\nB,5\n'))).resolves.toEqual({
      ok: true,
      table: {
        columns: ['condition', 'minutes'],
        rows: [
          ['A', '4'],
          ['B', '5'],
        ],
      },
    });
  });

  it('reads JSON and JSON Lines', async () => {
    await expect(
      readDataFile(fileOf('t.json', '[{"condition":"A","minutes":4}]')),
    ).resolves.toMatchObject({
      ok: true,
      table: { rows: [['A', '4']] },
    });
    await expect(
      readDataFile(
        fileOf('t.jsonl', '{"condition":"A","minutes":4}\n{"condition":"B","minutes":5}\n'),
      ),
    ).resolves.toMatchObject({
      ok: true,
      table: {
        rows: [
          ['A', '4'],
          ['B', '5'],
        ],
      },
    });
  });

  it('reports progress on a large file', async () => {
    const rows = Array.from({ length: 12_000 }, (_, index) => `A,${index + 1}`).join('\n');
    const counts: number[] = [];
    const result = await readDataFile(fileOf('big.csv', `condition,minutes\n${rows}\n`), (count) =>
      counts.push(count),
    );

    expect(result.ok && result.table.rows.length).toBe(12_000);
    expect(counts).toEqual([5_000, 10_000]);
  });
});
