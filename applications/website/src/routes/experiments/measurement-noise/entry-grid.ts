import type { RawTable } from './parse-table';

/** The typed-in grid: one row per task, with A's minutes beside B's. */
export type GridState = {
  labelA: string;
  labelB: string;
  /** Whether each row is the same task under both conditions. */
  paired: boolean;
  rows: { a: string; b: string }[];
};

export const MAX_GRID_ROWS = 200;

export const emptyGrid = (): GridState => ({
  labelA: 'A',
  labelB: 'B',
  paired: true,
  rows: [
    { a: '', b: '' },
    { a: '', b: '' },
    { a: '', b: '' },
  ],
});

/**
 * Turns the grid into the same table an upload produces. Paired rows share a
 * task name, so the analysis pairs them. Unpaired, there's no task column at
 * all. A blank cell is a task that only ran one way.
 */
export const gridToTable = (grid: GridState): RawTable => {
  const labels = [grid.labelA.trim() || 'A', grid.labelB.trim() || 'B'];
  const rows: string[][] = [];

  for (const [side, label] of labels.entries()) {
    grid.rows.forEach((row, index) => {
      const minutes = (side === 0 ? row.a : row.b).trim();
      if (minutes === '') return;

      rows.push(grid.paired ? [label, `task-${index + 1}`, minutes] : [label, minutes]);
    });
  }

  return {
    columns: grid.paired ? ['condition', 'task', 'minutes'] : ['condition', 'minutes'],
    rows,
  };
};
