import type { SourceFile } from './dropped-files';
import { readLines } from './read-lines';

/**
 * Reads Claude Code session transcripts (`~/.claude/projects/<project>/<session>.jsonl`)
 * into main-thread turns and compaction events. Every rule here was checked
 * against real transcripts:
 *
 * - A streamed response is written as several lines that share a
 *   `message.id`. Their `output_tokens` grows until the last line, so the last
 *   line for each ID wins. Treating the copies as identical undercounts output.
 * - `isSidechain` lines are subagent traffic, not the main context.
 * - When a response has several `message` iterations, as it does around an
 *   advisor call, its top-level usage is their sum. That double-counts the
 *   prompt: the next turn's context is about half of it, but just above the
 *   last iteration's. So a turn's context is its last iteration's prompt.
 *   Claude Code's own `compactMetadata.preTokens` reports the doubled sum on
 *   such turns.
 */

/** One main-thread model response. */
export type TranscriptTurn = {
  messageId: string;
  /** The model ID as recorded, such as `claude-opus-5-5`. */
  model: string;
  sessionId: string;
  /** When the response was written, as an ISO 8601 string, if recorded. */
  timestamp: string | null;
  /** Tokens in context for the request: uncached input, cache reads, and cache writes. */
  contextTokens: number;
  outputTokens: number;
  /**
   * How many compactions the session had before this turn. Two turns in
   * different segments straddle a compaction.
   */
  segment: number;
  /** The file this turn came from. */
  file: string;
};

/** A `compact_boundary` record: the session's history was replaced with a summary. */
export type CompactionEvent = {
  sessionId: string;
  timestamp: string | null;
  /** `manual` or `auto`, as recorded. */
  trigger: string;
  /** Context size Claude Code reported before compacting. */
  preTokens: number;
  /** Context size right after compacting. */
  postTokens: number;
  file: string;
};

export type TranscriptFileSummary = {
  name: string;
  /** `false` when nothing in the file looked like a Claude Code transcript. */
  recognized: boolean;
  /** Main-thread responses found in this file. */
  turns: number;
  /** Subagent responses found in this file, which aren't counted as turns. */
  sidechainTurns: number;
  compactions: number;
  /** Lines that weren't complete JSON objects, such as the last line of a session still running. */
  skippedLines: number;
};

export type ClaudeCodeTranscript = {
  files: TranscriptFileSummary[];
  /** Main-thread responses, one per message ID, oldest first. */
  turns: TranscriptTurn[];
  sidechainTurns: number;
  /** Oldest first. */
  compactions: CompactionEvent[];
  /**
   * The time of the first record in the earliest file and of the last record
   * in the latest file, in the order they were written. Records aren't
   * strictly time-ordered. Across 119 real transcripts the last record was
   * within 8 ms of the latest time, precise enough to judge whether a cache
   * has expired, but the first record was up to seven minutes after the
   * earliest time, so don't use `firstTimestamp` for anything that tight.
   */
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  skippedLines: number;
};

export type TranscriptFileReader = {
  addLine: (line: string) => void;
  finish: () => TranscriptFileSummary;
};

export type TranscriptReader = {
  /** Starts one file. Feed it every line, then call `finish` before starting the next. */
  readFile: (name: string) => TranscriptFileReader;
  summarize: () => ClaudeCodeTranscript;
};

type JsonRecord = Record<string, unknown>;

/** Claude Code writes placeholder responses, such as API errors, under this model name. */
const SYNTHETIC_MODEL = '<synthetic>';

/** How many trailing lines to keep for finding a file's last timestamp. */
const TRAILING_LINES = 50;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null;

const promptTokens = (usage: JsonRecord): number =>
  readCount(usage.input_tokens) +
  readCount(usage.cache_read_input_tokens) +
  readCount(usage.cache_creation_input_tokens);

/** The context a response ran with: its last `message` iteration, or its usage if it has none. */
const contextTokensOf = (usage: JsonRecord): number => {
  const iterations = Array.isArray(usage.iterations)
    ? usage.iterations.filter(
        (iteration): iteration is JsonRecord => isRecord(iteration) && iteration.type === 'message',
      )
    : [];
  const last = iterations.at(-1);

  return last ? promptTokens(last) : promptTokens(usage);
};

const looksLikeJsonObject = (line: string): boolean => line.startsWith('{') && line.endsWith('}');

const parse = (line: string): JsonRecord | null => {
  try {
    const value: unknown = JSON.parse(line);

    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
};

/** Sorts by time, falling back to the order lines were read when a time is missing. */
const chronologically = <Item extends { timestamp: string | null; sequence: number }>(
  first: Item,
  second: Item,
): number => {
  if (first.timestamp && second.timestamp && first.timestamp !== second.timestamp) {
    return first.timestamp < second.timestamp ? -1 : 1;
  }

  return first.sequence - second.sequence;
};

const earlier = (first: string | null, second: string | null): string | null =>
  first === null ? second : second === null || first <= second ? first : second;

const later = (first: string | null, second: string | null): string | null =>
  first === null ? second : second === null || first >= second ? first : second;

type TurnEntry = TranscriptTurn & { sequence: number; isSidechain: boolean };
type CompactionEntry = CompactionEvent & { sequence: number };

const toTurn = (entry: TurnEntry): TranscriptTurn => ({
  messageId: entry.messageId,
  model: entry.model,
  sessionId: entry.sessionId,
  timestamp: entry.timestamp,
  contextTokens: entry.contextTokens,
  outputTokens: entry.outputTokens,
  segment: entry.segment,
  file: entry.file,
});

const toCompaction = (entry: CompactionEntry): CompactionEvent => ({
  sessionId: entry.sessionId,
  timestamp: entry.timestamp,
  trigger: entry.trigger,
  preTokens: entry.preTokens,
  postTokens: entry.postTokens,
  file: entry.file,
});

/**
 * Collects turns and compactions from one or more transcripts. A response that
 * appears in more than one file is counted once.
 */
export const createTranscriptReader = (): TranscriptReader => {
  const responses = new Map<string, TurnEntry>();
  const compactions: CompactionEntry[] = [];
  const files: TranscriptFileSummary[] = [];
  let sequence = 0;
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;

  const readFile = (name: string): TranscriptFileReader => {
    const summary: TranscriptFileSummary = {
      name,
      recognized: false,
      turns: 0,
      sidechainTurns: 0,
      compactions: 0,
      skippedLines: 0,
    };
    const segments = new Map<string, number>();
    const fileResponses = new Set<string>();
    const trailingLines: string[] = [];
    let fileFirstTimestamp: string | null = null;
    let lastParsedTimestamp: string | null = null;

    const addCompaction = (record: JsonRecord): void => {
      const metadata = isRecord(record.compactMetadata) ? record.compactMetadata : {};
      const sessionId = readString(record.sessionId) ?? name;

      compactions.push({
        sessionId,
        timestamp: readString(record.timestamp),
        trigger: readString(metadata.trigger) ?? 'unknown',
        preTokens: readCount(metadata.preTokens),
        postTokens: readCount(metadata.postTokens),
        file: name,
        sequence: sequence++,
      });
      segments.set(sessionId, (segments.get(sessionId) ?? 0) + 1);
      summary.compactions += 1;
    };

    const addResponse = (record: JsonRecord): void => {
      if (!isRecord(record.message)) return;

      const { id, model, usage } = record.message;
      const messageId = readString(id);
      const modelId = readString(model);
      if (!messageId || !modelId || modelId === SYNTHETIC_MODEL || !isRecord(usage)) return;

      const sessionId = readString(record.sessionId) ?? name;
      const previous = responses.get(messageId);

      // The last line for a message ID has its final usage; keep the first line's place in order.
      responses.set(messageId, {
        messageId,
        model: modelId,
        sessionId,
        timestamp: readString(record.timestamp) ?? previous?.timestamp ?? null,
        contextTokens: contextTokensOf(usage),
        outputTokens: readCount(usage.output_tokens),
        segment: previous?.segment ?? segments.get(sessionId) ?? 0,
        file: previous?.file ?? name,
        sequence: previous?.sequence ?? sequence++,
        isSidechain: record.isSidechain === true,
      });
      fileResponses.add(messageId);
    };

    return {
      addLine: (rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        if (!looksLikeJsonObject(line)) {
          summary.skippedLines += 1;

          return;
        }

        trailingLines.push(line);
        if (trailingLines.length > TRAILING_LINES) trailingLines.shift();

        const carriesCompaction = line.includes('"compact_boundary"');
        const carriesResponse = line.includes('"usage"') && line.includes('"assistant"');

        // Parse only the lines that matter, plus the first lines until one has a time.
        if (!carriesCompaction && !carriesResponse && fileFirstTimestamp !== null) {
          if (!summary.recognized && line.includes('"sessionId"')) summary.recognized = true;

          return;
        }

        const record = parse(line);
        if (!record) {
          summary.skippedLines += 1;

          return;
        }

        fileFirstTimestamp ??= readString(record.timestamp);
        lastParsedTimestamp = readString(record.timestamp) ?? lastParsedTimestamp;
        if (typeof record.sessionId === 'string') summary.recognized = true;

        if (
          carriesCompaction &&
          // A subagent's compaction measures its own context, not the main session's.
          record.isSidechain !== true &&
          record.type === 'system' &&
          record.subtype === 'compact_boundary'
        ) {
          addCompaction(record);
        } else if (carriesResponse && record.type === 'assistant') {
          addResponse(record);
        }
      },
      finish: () => {
        let fileLastTimestamp: string | null = null;
        for (let index = trailingLines.length - 1; index >= 0 && !fileLastTimestamp; index -= 1) {
          fileLastTimestamp = readString(parse(trailingLines[index])?.timestamp);
        }

        firstTimestamp = earlier(firstTimestamp, fileFirstTimestamp);
        lastTimestamp = later(lastTimestamp, fileLastTimestamp ?? lastParsedTimestamp);

        for (const messageId of fileResponses) {
          if (responses.get(messageId)?.isSidechain) summary.sidechainTurns += 1;
          else summary.turns += 1;
        }

        files.push(summary);

        return { ...summary };
      },
    };
  };

  const summarize = (): ClaudeCodeTranscript => {
    const entries = [...responses.values()].sort(chronologically);
    const turns = entries.filter((entry) => !entry.isSidechain).map(toTurn);

    return {
      files: files.map((file) => ({ ...file })),
      turns,
      sidechainTurns: entries.length - turns.length,
      compactions: [...compactions].sort(chronologically).map(toCompaction),
      firstTimestamp,
      lastTimestamp,
      skippedLines: files.reduce((sum, file) => sum + file.skippedLines, 0),
    };
  };

  return { readFile, summarize };
};

/** Streams transcripts through one reader in the browser. Nothing leaves the page. */
export const readClaudeCodeTranscripts = async (
  files: readonly SourceFile[],
  onFileStart?: (index: number) => void,
): Promise<ClaudeCodeTranscript> => {
  const reader = createTranscriptReader();

  for (const [index, { file, path }] of files.entries()) {
    onFileStart?.(index);

    const fileReader = reader.readFile(path);
    await readLines(file.stream(), fileReader.addLine);
    fileReader.finish();
  }

  return reader.summarize();
};
