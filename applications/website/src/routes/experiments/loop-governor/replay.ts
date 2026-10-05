import { roundDollars } from './cost';

/**
 * Reads a real loop's log, one JSON object per line and one line per
 * iteration, and works out what each governor would have done to it. Logs
 * differ, so every field is found by name and can be remapped, and nothing
 * about a line is trusted: a line that isn't a JSON object is skipped and
 * counted, and a value of the wrong type reads as missing.
 */

export type FieldRole = 'iteration' | 'session' | 'cost' | 'score' | 'kept' | 'failure';

export const fieldRoles: readonly FieldRole[] = [
  'iteration',
  'session',
  'cost',
  'score',
  'kept',
  'failure',
];

/** The log key each role reads from, or null for none. */
export type FieldMapping = Record<FieldRole, string | null>;

export type RawLog = {
  records: Record<string, unknown>[];
  /** Every key seen, in the order first seen. Nested objects appear as `parent.child`. */
  keys: string[];
  /** Non-empty lines that weren't a JSON object. */
  skippedLines: number;
  /** Whether lines past the limit were left out. */
  truncated: boolean;
};

/** The most iterations a replay reads. A log longer than this is cut off and says so. */
export const MAXIMUM_RECORDS = 50_000;

/** Names a field goes by in the logs people keep. The first match wins. */
const candidates: Record<FieldRole, readonly string[]> = {
  iteration: ['iteration', 'iter', 'attempt', 'step', 'round', 'run', 'n', 'i', 'index'],
  session: ['session_id', 'sessionid', 'session'],
  cost: ['cost_usd', 'costusd', 'total_cost_usd', 'cost', 'usd', 'spend', 'dollars', 'price'],
  score: [
    'score',
    'metric',
    'value',
    'errors',
    'errors_remaining',
    'error_count',
    'remaining',
    'failures_left',
  ],
  kept: ['kept', 'keep', 'accepted', 'accept', 'committed', 'merged', 'success', 'passed'],
  failure: ['failure', 'failure_reason', 'error', 'reason', 'failed_check', 'message'],
};

/** Score names where a lower number is better, such as a count of type errors. */
const LOWER_IS_BETTER = /error|remaining|fail|warning|violation|loss|left/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lifts one level of nesting into `parent.child` keys, so `usage.cost_usd` can be mapped. */
const flatten = (record: Record<string, unknown>): Record<string, unknown> => {
  const flat: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (isRecord(value)) {
      for (const [child, nested] of Object.entries(value)) flat[`${key}.${child}`] = nested;
    } else {
      flat[key] = value;
    }
  }

  return flat;
};

export type LogReader = {
  addLine: (line: string) => void;
  finish: () => RawLog;
};

export const createLogReader = (): LogReader => {
  const records: Record<string, unknown>[] = [];
  const keys = new Set<string>();
  let skippedLines = 0;
  let truncated = false;

  return {
    addLine: (line) => {
      const text = line.trim();
      if (!text) return;
      if (records.length >= MAXIMUM_RECORDS) {
        truncated = true;

        return;
      }

      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch {
        skippedLines += 1;

        return;
      }
      if (!isRecord(value)) {
        skippedLines += 1;

        return;
      }

      const flat = flatten(value);
      for (const key of Object.keys(flat)) keys.add(key);
      records.push(flat);
    },
    finish: () => ({ records, keys: [...keys], skippedLines, truncated }),
  };
};

/** Reads pasted text. Files go through `readLines` and the same reader. */
export const parseLogText = (text: string): RawLog => {
  const reader = createLogReader();
  for (const line of text.split(/\r?\n/)) reader.addLine(line);

  return reader.finish();
};

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[\s-]/g, '_');

/** Picks the likeliest key for each role. A key is used for at most one role. */
export const guessMapping = (keys: readonly string[]): FieldMapping => {
  const used = new Set<string>();
  const mapping = {} as FieldMapping;

  for (const role of fieldRoles) {
    let found: string | null = null;

    for (const name of candidates[role]) {
      found =
        keys.find((key) => {
          if (used.has(key)) return false;
          const normalized = normalizeKey(key);
          const leaf = normalized.split('.').at(-1);

          return normalized === name || leaf === name;
        }) ?? null;
      if (found) break;
    }

    if (found) used.add(found);
    mapping[role] = found;
  }

  return mapping;
};

/** Whether a lower score is better, judged from the score field's name. */
export const guessLowerIsBetter = (scoreKey: string | null): boolean =>
  scoreKey !== null && LOWER_IS_BETTER.test(scoreKey);

export const readNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value.trim().replace(/^\$/, ''));

    return Number.isFinite(number) ? number : null;
  }

  return null;
};

const TRUE_WORDS = new Set(['true', 'yes', 'y', 'kept', 'keep', 'accepted', 'pass', 'passed', '1']);
const FALSE_WORDS = new Set([
  'false',
  'no',
  'n',
  'discarded',
  'reverted',
  'rejected',
  'rolled back',
  'fail',
  'failed',
  '0',
]);

export const readBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 0 ? false : value === 1 ? true : null;
  if (typeof value === 'string') {
    const word = value.trim().toLowerCase();
    if (TRUE_WORDS.has(word)) return true;
    if (FALSE_WORDS.has(word)) return false;
  }

  return null;
};

/** A failure as a comparable string. No failure, an empty string, or `false` is none. */
export const readFailure = (value: unknown): string | null => {
  if (value === null || value === undefined || value === false) return null;
  if (typeof value === 'string') {
    const text = value.trim().replace(/\s+/g, ' ');

    return text === '' ? null : text;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return JSON.stringify(value);
};

export type ReplayOptions = {
  mapping: FieldMapping;
  lowerIsBetter: boolean;
  /**
   * Whether the cost field is each iteration's cost or a running total. A drop in a running
   * total starts a new total.
   */
  costIsRunningTotal: boolean;
  /**
   * What a running total counts: the whole log (the default) or each session. Used only when
   * `costIsRunningTotal` is on. Per session needs a mapped session field; without one, the
   * total is read across the whole log.
   */
  runningTotalScope?: 'log' | 'session';
};

export type ReplayIteration = {
  /** The iteration's number: the log's own, or its position when the log has none. */
  iteration: number;
  session: string | null;
  cost: number;
  cumulative: number;
  score: number | null;
  /** True when the log has no kept field, and null when this row's kept can't be read. */
  kept: boolean | null;
  failure: string | null;
  /**
   * Kept and the score improved on the best kept so far, or kept alone with no score. Null
   * when this row lacks a value it needs, such as a score or a readable kept, or when the log
   * has neither field. A row that wasn't kept is no progress whatever its score, and one no
   * better than the best is no progress whether or not it was kept.
   */
  progress: boolean | null;
  /**
   * Iterations in a row without progress, counting this one, or null when this row's progress
   * is unknown. An unknown row leaves the count where it was: it neither resets it nor adds to
   * it, so the next known row carries on from the last known one.
   */
  sinceProgress: number | null;
  /** The same failure as the iteration before. */
  repeated: boolean;
};

export type Replay = {
  iterations: ReplayIteration[];
  total: number;
  hasScore: boolean;
  hasKept: boolean;
  /** Whether progress can be told from a stall: the log has a score or a kept field. */
  hasProgress: boolean;
  hasCost: boolean;
  /** Plain statements about what the log lacked and how it was read. */
  notes: string[];
};

const plural = (count: number, word: string): string =>
  `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

export const analyzeLog = (log: RawLog, options: ReplayOptions): Replay => {
  const { mapping, lowerIsBetter, costIsRunningTotal, runningTotalScope = 'log' } = options;
  const notes: string[] = [];
  const read = (record: Record<string, unknown>, role: FieldRole): unknown =>
    mapping[role] === null ? undefined : record[mapping[role] as string];

  const scores = log.records.map((record) => readNumber(read(record, 'score')));
  const keptValues = log.records.map((record) => readBoolean(read(record, 'kept')));
  const costValues = log.records.map((record) => readNumber(read(record, 'cost')));

  const hasScore = scores.some((score) => score !== null);
  const hasKept = keptValues.some((kept) => kept !== null);
  const hasCost = costValues.some((cost) => cost !== null);
  const hasProgress = hasScore || hasKept;

  if (!hasScore && hasKept) {
    notes.push(
      'This log has no score, so progress is inferred from kept alone: a kept iteration counts as progress, and a stall is a run of iterations that weren’t kept.',
    );
  }
  if (hasScore && !hasKept) {
    notes.push('This log has no kept field, so every iteration counts as kept.');
  }
  if (!hasScore && !hasKept) {
    notes.push(
      'This log has neither a score nor a kept field, so there’s no way to tell progress from a stall. Map one of them to see stalls.',
    );
  }
  if (!hasCost) notes.push('This log has no cost field, so every iteration costs $0.');

  const missingCosts = hasCost ? costValues.filter((cost) => cost === null).length : 0;
  if (missingCosts > 0) {
    notes.push(`${plural(missingCosts, 'iteration')} had no readable cost and count as $0.`);
  }
  if (log.skippedLines > 0) {
    notes.push(
      `Skipped ${plural(log.skippedLines, 'line')} that ${log.skippedLines === 1 ? 'wasn’t a JSON object' : 'weren’t JSON objects'}.`,
    );
  }
  if (log.truncated) {
    notes.push(`Read the first ${MAXIMUM_RECORDS.toLocaleString('en-US')} iterations only.`);
  }

  // Nothing in a log says which a running total counts, so the reader chooses.
  const sessionKeys = log.records.map((record) => {
    const session = read(record, 'session');
    if (typeof session === 'number' && Number.isFinite(session)) return String(session);

    return typeof session === 'string' ? session.trim() : '';
  });
  // Rows without a session ID can't be told apart, so one of them with a cost leaves every
  // per-session total in doubt, and the whole log is read as one total instead.
  const unidentifiedCosts =
    runningTotalScope === 'session' && mapping.session !== null && costIsRunningTotal
      ? costValues.filter((cost, index) => cost !== null && sessionKeys[index] === '').length
      : 0;
  const totalPerSession =
    runningTotalScope === 'session' && mapping.session !== null && unidentifiedCosts === 0;
  if (unidentifiedCosts > 0) {
    notes.push(
      `${plural(unidentifiedCosts, 'iteration')} with a cost had no session ID, so running totals are read across the whole log, not per session.`,
    );
  }

  const iterations: ReplayIteration[] = [];
  let cumulative = 0;
  // The last running total seen in each session, or in the whole log.
  const previousTotals = new Map<string, number>();
  let resets = 0;
  let best: number | null = null;
  let sinceProgress = 0;
  let previousFailure: string | null = null;

  log.records.forEach((record, index) => {
    const labeled = readNumber(read(record, 'iteration'));
    const iteration = labeled !== null && Number.isInteger(labeled) ? labeled : index + 1;

    const session = read(record, 'session');
    const reported = costValues[index];
    let cost = 0;
    if (reported !== null && costIsRunningTotal) {
      const key = totalPerSession ? sessionKeys[index] : '';
      const previous = previousTotals.get(key) ?? 0;
      // A total that drops means a new run started counting from zero.
      if (reported < previous) resets += 1;
      cost = Math.max(0, reported < previous ? reported : reported - previous);
      previousTotals.set(key, reported);
    } else if (reported !== null) {
      cost = Math.max(0, reported);
    }
    cumulative = roundDollars(cumulative + cost);

    const score = scores[index];
    const kept = hasKept ? keptValues[index] : true;

    // An unknown row never moves the best score, so it can't be mistaken for one that did.
    let progress: boolean | null;
    if (!hasProgress) {
      progress = null;
    } else if (hasScore) {
      const improved =
        score === null ? null : best === null || (lowerIsBetter ? score < best : score > best);
      progress = kept === false || improved === false ? false : kept && improved ? true : null;
      if (progress) best = score;
    } else {
      progress = kept;
    }

    if (progress !== null) sinceProgress = progress ? 0 : sinceProgress + 1;

    const failure = readFailure(read(record, 'failure'));
    const repeated = failure !== null && failure === previousFailure;
    previousFailure = failure;

    iterations.push({
      iteration,
      session: typeof session === 'string' && session ? session : null,
      cost: roundDollars(cost),
      cumulative,
      score,
      kept,
      failure,
      progress,
      sinceProgress: progress === null ? null : sinceProgress,
      repeated,
    });
  });

  const unknownProgress = hasProgress
    ? iterations.filter((step) => step.progress === null).length
    : 0;
  if (unknownProgress > 0) {
    const what = !hasScore ? 'kept value' : hasKept ? 'score or kept value' : 'score';
    notes.push(
      `${plural(unknownProgress, 'iteration')} ${unknownProgress === 1 ? 'has' : 'have'} no readable ${what}, so ${unknownProgress === 1 ? 'its' : 'their'} progress is unknown: ${unknownProgress === 1 ? 'it neither starts nor ends' : 'they neither start nor end'} a stall.`,
    );
  }
  if (resets > 0) {
    notes.push(
      `The running total dropped ${resets === 1 ? 'once' : `${resets.toLocaleString('en-US')} times`}, so ${resets === 1 ? 'that iteration starts' : 'each of those iterations starts'} a new total at its own value.`,
    );
  }

  return { iterations, total: cumulative, hasScore, hasKept, hasProgress, hasCost, notes };
};

export type CounterfactualGovernor =
  | { kind: 'stall'; m: number }
  | { kind: 'maxIterations'; maximum: number }
  | { kind: 'budget'; dollars: number }
  | { kind: 'repeatedFailure' };

export type Counterfactual = {
  governor: CounterfactualGovernor;
  /** The governor's name with its setting, such as "A stall detector of 3". */
  name: string;
  /** Position in the log of the iteration it stops after, or null if it never fires. */
  stopIndex: number | null;
  /** The log's own number for that iteration. */
  stopIteration: number | null;
  saved: number;
  /** Progress iterations after the stop that the governor would have cut off. */
  progressLost: number;
  /**
   * Whether rows with unknown progress leave a stall detector's stop in doubt. When it is,
   * nothing is claimed as saved or lost, and the sentence says the stop only might happen.
   */
  uncertain: boolean;
  sentence: string;
};

const fires = (governor: CounterfactualGovernor, step: ReplayIteration, index: number): boolean => {
  switch (governor.kind) {
    case 'stall':
      return step.sinceProgress !== null && step.sinceProgress >= governor.m;
    case 'maxIterations':
      return index + 1 >= governor.maximum;
    case 'budget':
      return step.cumulative >= governor.dollars;
    case 'repeatedFailure':
      return step.repeated;
  }
};

/**
 * Whether rows with unknown progress could move a stall detector's stop, given where it
 * fires counting only the known rows. Null when the stop is certain. Treating every unknown
 * row as no progress finds the earliest it could fire. With a score, an unknown row before
 * the stop could also have raised the best score, so later rows counted as progress might
 * not be, and any unknown row up to the stop leaves it in doubt.
 */
const stallDoubt = (
  replay: Replay,
  m: number,
  stopIndex: number | null,
): { earliest: number | null; unknown: number; unknownBefore: number } | null => {
  const steps = replay.iterations;
  const unknown = steps.filter((step) => step.progress === null).length;
  if (unknown === 0) return null;

  let count = 0;
  let earliest: number | null = null;
  for (const [index, step] of steps.entries()) {
    count = step.progress === true ? 0 : count + 1;
    if (count >= m) {
      earliest = index;
      break;
    }
  }

  const end = stopIndex ?? steps.length - 1;
  const upToStop = steps.slice(0, end + 1);
  const unknownBefore = upToStop.filter((step) => step.progress === null).length;
  const lastProgress = upToStop.findLastIndex((step) => step.progress === true);
  const unknownInStretch = upToStop.slice(lastProgress + 1).some((step) => step.progress === null);
  const doubtful =
    earliest !== stopIndex || unknownInStretch || (replay.hasScore && unknownBefore > 0);

  return doubtful ? { earliest, unknown, unknownBefore } : null;
};

const governorName = (governor: CounterfactualGovernor, format: (dollars: number) => string) => {
  switch (governor.kind) {
    case 'stall':
      return `A stall detector of ${governor.m}`;
    case 'maxIterations':
      return `A maximum of ${governor.maximum} iterations`;
    case 'budget':
      return `A ${format(governor.dollars)} budget`;
    case 'repeatedFailure':
      return 'A repeated-failure check';
  }
};

/**
 * Where a governor would have stopped the real run, checked after each
 * iteration as the simulation checks it, and what that would have saved.
 */
export const counterfactual = (
  replay: Replay,
  governor: CounterfactualGovernor,
  format: (dollars: number) => string,
): Counterfactual => {
  const name = governorName(governor, format);

  // A stall is a run without progress, so it can't be found where progress is unknown.
  if (governor.kind === 'stall' && !replay.hasProgress) {
    return {
      governor,
      name,
      stopIndex: null,
      stopIteration: null,
      saved: 0,
      progressLost: 0,
      uncertain: false,
      sentence: `${name} can’t be checked on this log, which has neither a score nor a kept field.`,
    };
  }

  const stopIndex = replay.iterations.findIndex((step, index) => fires(governor, step, index));

  if (governor.kind === 'stall') {
    const firstFire = stopIndex === -1 ? null : stopIndex;
    const doubt = stallDoubt(replay, governor.m, firstFire);
    if (doubt) {
      const what = !replay.hasScore
        ? 'kept value'
        : replay.hasKept
          ? 'score or kept value'
          : 'score';
      const unknown = (count: number, where: string): string =>
        `${plural(count, 'iteration')}${where} ${count === 1 ? 'has' : 'have'} no readable ${what}`;
      // The chart marks the iteration the sentence names, if it names one.
      const sooner = doubt.earliest !== null && doubt.earliest !== firstFire;
      const marked = sooner ? doubt.earliest : firstFire;
      const sentence = sooner
        ? `${name} might stop this as early as iteration ${replay.iterations[doubt.earliest as number].iteration}, but ${unknown(doubt.unknown, '')}, so it can’t tell.`
        : firstFire !== null
          ? `${name} might stop this at iteration ${replay.iterations[firstFire].iteration}, but ${unknown(doubt.unknownBefore, ' up to there')}, so it can’t tell.`
          : `${name} never fires on the iterations it can read, but ${unknown(doubt.unknown, '')}, so it might.`;

      return {
        governor,
        name,
        stopIndex: marked,
        stopIteration: marked === null ? null : replay.iterations[marked].iteration,
        saved: 0,
        progressLost: 0,
        uncertain: true,
        sentence,
      };
    }
  }

  if (stopIndex === -1 || stopIndex === replay.iterations.length - 1) {
    const stoppedLast = stopIndex !== -1;

    return {
      governor,
      name,
      stopIndex: stoppedLast ? stopIndex : null,
      stopIteration: stoppedLast ? replay.iterations[stopIndex].iteration : null,
      saved: 0,
      progressLost: 0,
      uncertain: false,
      sentence: stoppedLast
        ? `${name} stops this at iteration ${replay.iterations[stopIndex].iteration}, its last, and saves nothing.`
        : `${name} never fires on this run.`,
    };
  }

  const stop = replay.iterations[stopIndex];
  const saved = roundDollars(replay.total - stop.cumulative);
  const progressLost = replay.iterations
    .slice(stopIndex + 1)
    .filter((step) => step.progress).length;
  const cost = `stops this at iteration ${stop.iteration} and saves ${format(saved)}`;
  const lost =
    progressLost > 0 ? `, but it cuts off ${plural(progressLost, 'later progress iteration')}` : '';

  return {
    governor,
    name,
    stopIndex,
    stopIteration: stop.iteration,
    saved,
    progressLost,
    uncertain: false,
    sentence: `${name} ${cost}${lost}.`,
  };
};

/** The governors the replay tries: stall detectors of 2, 3, and 5 plus the page's own settings. */
export const counterfactualGovernors = (settings: {
  stallM: number;
  maxIterations: number;
  budget: number;
}): CounterfactualGovernor[] => {
  const stalls = [...new Set([2, 3, 5, settings.stallM])].sort((first, second) => first - second);

  return [
    ...stalls.map((m): CounterfactualGovernor => ({ kind: 'stall', m })),
    { kind: 'repeatedFailure' },
    { kind: 'maxIterations', maximum: settings.maxIterations },
    { kind: 'budget', dollars: settings.budget },
  ];
};
