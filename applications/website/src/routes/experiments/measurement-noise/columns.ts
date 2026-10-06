/** The columns the tool reads. Everything else is listed as unknown. */
export const roles = [
  'condition',
  'task',
  'minutes',
  'accepted',
  'rework',
  'reviewMinutes',
  'cost',
] as const;

export type Role = (typeof roles)[number];

/** Which column index fills each role, or null for none. */
export type ColumnMapping = Record<Role, number | null>;

export const roleLabels: Record<Role, string> = {
  condition: 'Condition',
  task: 'Task',
  minutes: 'Minutes to accepted result',
  accepted: 'Accepted',
  rework: 'Rework',
  reviewMinutes: 'Review minutes',
  cost: 'Cost',
};

export const roleHints: Record<Role, string> = {
  condition: 'Which way of working: A or B, before or after, or any two labels.',
  task: 'Optional. When every task appears once under each condition, the comparison is paired.',
  minutes: 'Time from starting the task until the result was accepted.',
  accepted: 'Whether the result was accepted: true or false.',
  rework: 'Whether a person had to touch it again afterward: true or false.',
  reviewMinutes: 'Minutes a person spent reviewing it.',
  cost: 'What the task cost, such as dollars of API spend.',
};

/** Lowercase, with every run of other characters turned into one underscore. `Duration (min)` reads as `duration_min`. */
export const normalizeHeader = (header: string): string =>
  header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const synonyms: Record<Role, readonly string[]> = {
  condition: [
    'condition',
    'group',
    'arm',
    'variant',
    'workflow',
    'treatment',
    'cohort',
    'phase',
    'period',
    'setup',
    'mode',
  ],
  task: ['task', 'task_id', 'task_name', 'id', 'item', 'ticket', 'issue', 'name'],
  minutes: [
    'minutes',
    'duration',
    'mins',
    'min',
    'time',
    'elapsed',
    'duration_minutes',
    'duration_min',
    'duration_mins',
    'time_minutes',
    'time_min',
    'minutes_to_accepted',
    'time_to_accepted',
    'time_to_accepted_result',
    'time_to_accept',
    'elapsed_minutes',
  ],
  accepted: ['accepted', 'merged', 'success', 'succeeded', 'passed', 'accepted_result', 'shipped'],
  rework: [
    'rework',
    'reworked',
    'needed_rework',
    'needs_rework',
    'human_touched',
    'revised',
    'redo',
  ],
  reviewMinutes: [
    'review_minutes',
    'review',
    'review_time',
    'review_mins',
    'review_min',
    'review_duration',
    'reviewing_minutes',
  ],
  cost: ['cost', 'cost_usd', 'usd', 'dollars', 'spend', 'cost_dollars', 'price'],
};

/**
 * Columns that look like progress but don't measure an outcome, with the
 * reason each one misleads.
 */
const vanity: { pattern: RegExp; label: string; reason: string }[] = [
  {
    pattern: /^(lines|loc|sloc|lines_of_code|lines_added|lines_changed|lines_written|added_lines)$/,
    label: 'Lines of code',
    reason:
      'More lines isn’t more done. An agent that writes twice the code for the same feature looks twice as productive here and is twice as much to review.',
  },
  {
    pattern:
      /^(acceptance_rate|acceptance|accept_rate|suggestion_acceptance|suggestions_accepted|suggestion_acceptance_rate|accepted_suggestions)$/,
    label: 'Suggestion acceptance rate',
    reason:
      'It goes up when you stop reading. Accepting more suggestions says how often you clicked yes, not whether the result was right.',
  },
  {
    pattern: /^(tokens|token_count|total_tokens|input_tokens|output_tokens|tokens_used)$/,
    label: 'Raw token counts',
    reason:
      'Tokens are a cost input, not a result. Spending more of them can mean more work or more flailing; divide cost by accepted results instead.',
  },
  {
    pattern: /^(agents|agent_count|num_agents|agents_running|parallel_agents|number_of_agents)$/,
    label: 'Number of agents running',
    reason:
      'Running more agents is activity. What matters is how many accepted results come out the other end.',
  },
];

export type VanityColumn = { column: string; label: string; reason: string };

export const findVanity = (header: string): VanityColumn | null => {
  const normalized = normalizeHeader(header);
  const match = vanity.find((entry) => entry.pattern.test(normalized));

  return match ? { column: header, label: match.label, reason: match.reason } : null;
};

export const emptyMapping = (): ColumnMapping => ({
  condition: null,
  task: null,
  minutes: null,
  accepted: null,
  rework: null,
  reviewMinutes: null,
  cost: null,
});

/**
 * Guesses which column fills each role from its header. An exact synonym wins;
 * each column fills at most one role, and a vanity metric never fills one.
 */
export const guessMapping = (columns: readonly string[]): ColumnMapping => {
  const mapping = emptyMapping();
  const taken = new Set<number>();
  const normalized = columns.map(normalizeHeader);

  for (const role of roles) {
    for (const synonym of synonyms[role]) {
      const index = normalized.findIndex(
        (header, position) => header === synonym && !taken.has(position),
      );
      if (index !== -1) {
        mapping[role] = index;
        taken.add(index);
        break;
      }
    }
  }

  return mapping;
};

export type ColumnReport = {
  /** Columns not used for any role and not recognized as a vanity metric. */
  unknown: string[];
  vanity: VanityColumn[];
};

export const describeColumns = (
  columns: readonly string[],
  mapping: ColumnMapping,
): ColumnReport => {
  const used = new Set(Object.values(mapping).filter((index) => index !== null));
  const unknown: string[] = [];
  const found: VanityColumn[] = [];

  columns.forEach((column, index) => {
    if (used.has(index)) return;

    const match = findVanity(column);
    if (match) found.push(match);
    else unknown.push(column);
  });

  return { unknown, vanity: found };
};

/** Whether the mapping has an outcome a verdict can be about: time, rework, or review minutes. */
export const hasOutcome = (mapping: ColumnMapping): boolean =>
  mapping.minutes !== null || mapping.rework !== null || mapping.reviewMinutes !== null;
