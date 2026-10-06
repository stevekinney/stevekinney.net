/**
 * The enforcement ladder, weakest first. The lesson on CLAUDE.md walks through it.
 * The lower four rungs can only ask; the upper four can refuse.
 */
export const rungIds = [
  'chat',
  'memory',
  'instructions',
  'skill',
  'permission',
  'hook',
  'ci',
  'sandbox',
] as const;

export type RungId = (typeof rungIds)[number];

export type Rung = {
  id: RungId;
  /** What sits on the rung, such as "Permission rule". */
  name: string;
  /** What the rung can do, such as "refuses at the tool boundary". */
  power: string;
  /** Whether the rung can refuse, rather than only ask. */
  refuses: boolean;
};

export const rungs: readonly Rung[] = [
  { id: 'chat', name: 'Something said in chat', power: 'asks, until compaction', refuses: false },
  { id: 'memory', name: 'Auto memory', power: 'asks, on your machine only', refuses: false },
  {
    id: 'instructions',
    name: 'Project instructions',
    power: 'asks, if it loads',
    refuses: false,
  },
  { id: 'skill', name: 'Skill', power: 'asks, if it activates', refuses: false },
  {
    id: 'permission',
    name: 'Permission rule',
    power: 'refuses at the tool boundary',
    refuses: true,
  },
  { id: 'hook', name: 'Hook', power: 'refuses at one event', refuses: true },
  { id: 'ci', name: 'Required CI check', power: 'refuses for everyone', refuses: true },
  {
    id: 'sandbox',
    name: 'OS, sandbox, or network',
    power: 'refuses no matter what the model thinks',
    refuses: true,
  },
];

export const findRung = (id: RungId | null | undefined): Rung | null =>
  rungs.find((rung) => rung.id === id) ?? null;
