import type { Endpoint } from './analysis';

export type PresetId = 'five-unpaired' | 'five-paired' | 'faster-more-rework' | 'vanity';

export type Preset = {
  id: PresetId;
  name: string;
  /** What the preset shows, under the buttons. */
  notice: string;
  csv: string;
  /** The endpoint the preset opens on. */
  endpoint: Endpoint;
};

const lines = (...rows: string[]): string => `${rows.join('\n')}\n`;

const fiveUnpaired = lines(
  'condition,minutes',
  'A,40',
  'A,55',
  'A,30',
  'A,70',
  'A,45',
  'B,52',
  'B,30',
  'B,41',
  'B,38',
  'B,43',
);

const fivePaired = lines(
  'condition,task,minutes',
  'A,task-1,40',
  'A,task-2,55',
  'A,task-3,30',
  'A,task-4,70',
  'A,task-5,45',
  'B,task-1,35',
  'B,task-2,46',
  'B,task-3,26',
  'B,task-4,60',
  'B,task-5,38',
);

// Sixteen tasks a side. B's mean time is 40 against A's 50, 20% faster; its
// rework rate doubles from 3 in 16 to 6 in 16; and with fewer results accepted
// and a higher bill, its cost per accepted result rises from $1.28 to $1.87.
const reworkA = {
  minutes: [42, 55, 48, 61, 39, 52, 47, 58, 44, 50, 53, 46, 57, 49, 51, 48],
  rework: [3, 7, 12],
  rejected: [12],
  review: [8, 9, 7, 10, 6, 8, 9, 11, 7, 8, 9, 7, 10, 8, 8, 9],
  cost: 1.2,
};
const reworkB = {
  minutes: [34, 43, 38, 47, 31, 41, 37, 45, 35, 40, 42, 36, 44, 39, 40, 48],
  rework: [1, 4, 6, 9, 11, 14],
  rejected: [4, 9, 11, 14],
  review: [12, 14, 11, 15, 10, 13, 12, 16, 11, 12, 14, 11, 15, 12, 13, 13],
  cost: 1.4,
};

const reworkRows = (label: string, side: typeof reworkA): string[] =>
  side.minutes.map(
    (minutes, index) =>
      `${label},${minutes},${!side.rejected.includes(index)},${side.rework.includes(index)},${side.review[index]},${side.cost.toFixed(2)}`,
  );

const fasterMoreRework = lines(
  'condition,minutes,accepted,rework,review_minutes,cost',
  ...reworkRows('A', reworkA),
  ...reworkRows('B', reworkB),
);

const vanity = lines(
  'condition,lines_of_code,acceptance_rate',
  'A,120,0.62',
  'A,95,0.58',
  'A,210,0.66',
  'A,140,0.61',
  'B,340,0.81',
  'B,290,0.86',
  'B,410,0.79',
  'B,365,0.84',
);

export const presets: Preset[] = [
  {
    id: 'five-unpaired',
    name: 'Five tasks, unpaired',
    notice:
      'Five different tasks each way, and B’s mean is exactly 15% lower. It looks like a win. With tasks this varied and this few, it’s noise.',
    csv: fiveUnpaired,
    endpoint: 'time',
  },
  {
    id: 'five-paired',
    name: 'The same five tasks, paired',
    notice:
      'The same five tasks, run both ways, and B is quicker on every one. Five tasks is plenty here, because each task is its own control.',
    csv: fivePaired,
    endpoint: 'time',
  },
  {
    id: 'faster-more-rework',
    name: 'Faster but more rework',
    notice:
      'B is 20% faster per task, but it needs twice the rework and each accepted result costs more. Switch the endpoint and the answer changes: pick it before you look.',
    csv: fasterMoreRework,
    endpoint: 'time',
  },
  {
    id: 'vanity',
    name: 'Vanity metrics',
    notice:
      'Lines of code and suggestion acceptance rate, and nothing else. Both went up for B. Neither says whether the work got done.',
    csv: vanity,
    endpoint: 'time',
  },
];

export const DEFAULT_PRESET: PresetId = 'five-unpaired';

export const findPreset = (id: string | null): Preset | null =>
  presets.find((preset) => preset.id === id) ?? null;

export const customNotice = 'Your own data. Pick a preset to get back to a worked example.';
