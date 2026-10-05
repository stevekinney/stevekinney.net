import type { ClaudeCodeTranscript } from '$lib/experiments/claude-code-transcript';
import { formatPercent, roundPercent } from './field-parsing';
import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';
import { matchModel } from './pricing';
import type { CacheTtl, ModelPrice } from './pricing';
import { clampTo, ranges } from './scenario';

/** One compaction from the session, as the list shows it. */
export type CompactionRow = {
  trigger: string;
  preTokens: number;
  postTokens: number;
  /** `postTokens / preTokens` as a percentage, or null when either size wasn't recorded. */
  percent: number | null;
  /** `manual · 313K → 13K (4.1%)` */
  label: string;
};

export type Calibration = {
  files: number;
  sessions: number;
  turns: number;
  /** Subagent responses, which don't count toward the main thread. */
  sidechainTurns: number;
  skippedLines: number;
  /** N: the context of the latest main-thread turn. */
  contextNow: number;
  /** gOut: the median output tokens per turn. */
  outputPerTurn: number;
  /** gIn: the median growth per turn that isn't output, or null with no pair of turns to measure. */
  inputPerTurn: number | null;
  inputPairs: number;
  /** Pairs left out because a compaction fell between the two turns. */
  pairsAcrossCompaction: number;
  /** The model ID on the latest turn, as recorded. */
  modelId: string;
  modelMatch: ModelPrice | null;
  lastTimestamp: string | null;
  /** When the files were read, in epoch milliseconds. */
  importedAt: number;
  /** The median compaction ratio as a percentage, held to what the summary box accepts. */
  summaryPercent: number | null;
  compactions: CompactionRow[];
  /** The context size of the first main-thread turn, offered as the baseline prefix. */
  baselineEstimate: number;
};

export type CalibrationResult =
  { calibration: Calibration; message: null } | { calibration: null; message: string };

export const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const compactionRow = (event: ClaudeCodeTranscript['compactions'][number]): CompactionRow => {
  const percent =
    event.preTokens > 0 && event.postTokens > 0 ? (event.postTokens / event.preTokens) * 100 : null;
  const sizes =
    percent === null
      ? 'size not recorded'
      : `${formatTokens(event.preTokens)} → ${formatTokens(event.postTokens)} (${formatPercent(percent)})`;

  return {
    trigger: event.trigger,
    preTokens: event.preTokens,
    postTokens: event.postTokens,
    percent,
    label: `${event.trigger} · ${sizes}`,
  };
};

/** Why a transcript can't calibrate anything, for the message under the drop zone. */
const emptyMessage = (transcript: ClaudeCodeTranscript): string => {
  if (transcript.sidechainTurns > 0) {
    return 'Those files only hold subagent responses, which run in their own context. Drop the main session file, the one with the same name as the subagent folder.';
  }

  if (transcript.files.every((file) => !file.recognized)) {
    return 'None of those files looked like a Claude Code session. Sessions are .jsonl files, one JSON object per line.';
  }

  return 'Those files don’t hold any assistant responses yet, so there’s nothing to measure.';
};

/**
 * Turns a parsed session into the numbers the scenario takes. The transcript
 * reader already keeps the last line for each message ID, leaves out subagent
 * and placeholder responses, and takes each turn's context from its last
 * `message` iteration.
 */
export const calibrate = (
  transcript: ClaudeCodeTranscript,
  models: readonly ModelPrice[],
  importedAt: number,
): CalibrationResult => {
  const { turns } = transcript;
  const latest = turns.at(-1);
  const first = turns[0];

  if (!latest || !first) return { calibration: null, message: emptyMessage(transcript) };

  // Pair each turn with the next one from the same session, in the same
  // stretch between compactions. A pair across a compaction measures the
  // summary replacing the history, not a turn's growth.
  const growth: number[] = [];
  let pairsAcrossCompaction = 0;
  const lastBySession = new Map<string, (typeof turns)[number]>();

  for (const turn of turns) {
    const previous = lastBySession.get(turn.sessionId);

    if (previous) {
      if (previous.segment === turn.segment) {
        growth.push(
          Math.max(0, turn.contextTokens - previous.contextTokens - previous.outputTokens),
        );
      } else {
        pairsAcrossCompaction += 1;
      }
    }

    lastBySession.set(turn.sessionId, turn);
  }

  const compactions = transcript.compactions.map(compactionRow);
  const summaryMedian = median(
    compactions.flatMap((row) => (row.percent === null ? [] : [row.percent])),
  );
  const outputMedian = median(turns.map((turn) => turn.outputTokens)) ?? 0;
  const inputMedian = median(growth);

  return {
    calibration: {
      files: transcript.files.length,
      sessions: new Set(turns.map((turn) => turn.sessionId)).size,
      turns: turns.length,
      sidechainTurns: transcript.sidechainTurns,
      skippedLines: transcript.skippedLines,
      contextNow: latest.contextTokens,
      outputPerTurn: Math.round(outputMedian),
      inputPerTurn: inputMedian === null ? null : Math.round(inputMedian),
      inputPairs: growth.length,
      pairsAcrossCompaction,
      modelId: latest.model,
      modelMatch: matchModel(latest.model, models),
      lastTimestamp: transcript.lastTimestamp,
      importedAt,
      summaryPercent:
        summaryMedian === null ? null : clampTo(ranges.summaryPercent, roundPercent(summaryMedian)),
      compactions,
      baselineEstimate: first.contextTokens,
    },
    message: null,
  };
};

const TTL_MINUTES: Record<CacheTtl, number> = { '5m': 5, '1h': 60 };

export type CacheAssessment = {
  warm: boolean;
  /** `Your last turn was 2h 14m ago, longer than the 1-hour TTL, so the cache is cold.` */
  sentence: string;
};

/** `2h 14m`, `45m`, or `3d 4h`. */
export const formatElapsed = (milliseconds: number): string => {
  const minutes = Math.floor(Math.max(0, milliseconds) / 60_000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 48) return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;

  const days = Math.floor(hours / 24);

  return hours % 24 === 0 ? `${days}d` : `${days}d ${hours % 24}h`;
};

/**
 * Whether the cache is still warm: the last record's age against the TTL.
 * The last record in file order is within milliseconds of the latest time, so
 * it's precise enough to judge an expiry measured in minutes.
 */
export const assessCache = (
  lastTimestamp: string | null,
  now: number,
  ttl: CacheTtl,
): CacheAssessment | null => {
  const last = lastTimestamp ? Date.parse(lastTimestamp) : Number.NaN;
  if (!Number.isFinite(last)) return null;

  const elapsed = Math.max(0, now - last);
  const warm = elapsed <= TTL_MINUTES[ttl] * 60_000;
  const label = ttl === '1h' ? '1-hour' : '5-minute';

  return {
    warm,
    sentence: `Your last turn was ${formatElapsed(elapsed)} ago, ${
      warm ? 'within' : 'longer than'
    } the ${label} TTL, so the cache is ${warm ? 'warm' : 'cold'}.`,
  };
};
