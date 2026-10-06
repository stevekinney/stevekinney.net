import { describe, expect, it } from 'vitest';

import { gridToTable } from './entry-grid';

describe('gridToTable', () => {
  it('gives paired rows a shared task name, and leaves blank cells out', () => {
    expect(
      gridToTable({
        labelA: 'Before',
        labelB: 'After',
        paired: true,
        rows: [
          { a: '40', b: '35' },
          { a: '55', b: '' },
          { a: '', b: '' },
        ],
      }),
    ).toEqual({
      columns: ['condition', 'task', 'minutes'],
      rows: [
        ['Before', 'task-1', '40'],
        ['Before', 'task-2', '55'],
        ['After', 'task-1', '35'],
      ],
    });
  });

  it('drops the task column when the rows aren’t the same tasks, and falls back to A and B', () => {
    expect(
      gridToTable({ labelA: ' ', labelB: '', paired: false, rows: [{ a: '1', b: '2' }] }),
    ).toEqual({
      columns: ['condition', 'minutes'],
      rows: [
        ['A', '1'],
        ['B', '2'],
      ],
    });
  });
});
