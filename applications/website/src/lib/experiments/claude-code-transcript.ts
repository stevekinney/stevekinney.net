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
 * - `isSidechain` lines are subagent traffic, not the main context. They're
 *   kept apart as `subagentTurns`, each with the `agentId` Claude Code
 *   records, so a subagent's own transcript can still be measured.
 * - When a response has several `message` iterations, as it does around an
 *   advisor call, its top-level usage is their sum. That double-counts the
 *   prompt: the next turn's context is about half of it, but just above the
 *   last iteration's. So a turn's context is its last iteration's prompt.
 *   Claude Code's own `compactMetadata.preTokens` reports the doubled sum on
 *   such turns.
 * - Each line of a streamed response carries at most one content item, so a
 *   response's tool calls are collected from every line, not just the last.
 * - A failed tool result arrives in a `user` record as a `tool_result` item
 *   with `is_error: true`, and its line contains `"is_error":true` verbatim.
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

/** One subagent response. */
export type SubagentTurn = TranscriptTurn & {
  /**
   * The subagent that wrote it, as recorded in `agentId`. Older transcripts
   * kept subagent lines in the session file without one.
   */
  agentId: string | null;
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
  /** Subagent responses, one per message ID, oldest first. */
  subagentTurns: SubagentTurn[];
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

/** A response's usage as billed: every part counted once, cache writes split by lifetime when recorded. */
export type ResponseUsage = {
  inputTokens: number;
  cacheReadTokens: number;
  /** Every cache write, `cache_creation_input_tokens`. */
  cacheWriteTokens: number;
  /**
   * The write split by cache lifetime, from `usage.cache_creation`. `null` when
   * the transcript doesn't record the split, so the caller has to assume one.
   */
  cacheWriteSplit: { fiveMinute: number; oneHour: number } | null;
  outputTokens: number;
};

/** One model response, main thread or subagent, with what it billed and where it ran. */
export type TranscriptResponse = {
  messageId: string;
  model: string;
  sessionId: string;
  timestamp: string | null;
  file: string;
  isSidechain: boolean;
  /**
   * The top-level usage. Around an advisor call it's the sum of the response's
   * iterations, which is what was billed, even though it overstates the context.
   */
  usage: ResponseUsage;
  cwd: string | null;
  gitBranch: string | null;
  version: string | null;
};

/** A `tool_use` item from a response. */
export type TranscriptToolCall = {
  id: string;
  name: string;
  /** `input.command` for a shell tool such as Bash, otherwise `null`. */
  command: string | null;
  sessionId: string;
  timestamp: string | null;
  file: string;
  /** One-based line number in the file. */
  line: number;
};

/** A `tool_result` item with `is_error: true`. */
export type TranscriptToolError = {
  /** The call it answers, or `null` when the result doesn't say. */
  toolUseId: string | null;
  sessionId: string;
  timestamp: string | null;
  file: string;
  /** One-based line number in the file. */
  line: number;
  /** The result's content as text: the string itself, or its text parts joined by newlines. */
  text: string;
  /** The whole line the result was read from, so a quote can be checked against it. */
  source: string;
};

export type TranscriptDetails = {
  /** Every response, subagent responses included, one per message ID, oldest first. */
  responses: TranscriptResponse[];
  /** Every tool call, one per ID, in the order read. */
  toolCalls: TranscriptToolCall[];
  /** Every failed tool result, one per call ID, in the order read. */
  toolErrors: TranscriptToolError[];
};

export type DetailedTranscript = ClaudeCodeTranscript & { details: TranscriptDetails };

export type DetailedTranscriptReader = {
  readFile: (name: string) => TranscriptFileReader;
  summarize: () => DetailedTranscript;
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

const readUsage = (usage: JsonRecord): ResponseUsage => {
  const creation = isRecord(usage.cache_creation) ? usage.cache_creation : null;

  return {
    inputTokens: readCount(usage.input_tokens),
    cacheReadTokens: readCount(usage.cache_read_input_tokens),
    cacheWriteTokens: readCount(usage.cache_creation_input_tokens),
    cacheWriteSplit: creation
      ? {
          fiveMinute: readCount(creation.ephemeral_5m_input_tokens),
          oneHour: readCount(creation.ephemeral_1h_input_tokens),
        }
      : null,
    outputTokens: readCount(usage.output_tokens),
  };
};

/** A tool result's content: a string, or an array of parts whose text parts are joined. */
const contentText = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .flatMap((part) => (isRecord(part) && typeof part.text === 'string' ? [part.text] : []))
    .join('\n');
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

type TurnEntry = TranscriptTurn & {
  sequence: number;
  isSidechain: boolean;
  agentId: string | null;
  usage: ResponseUsage;
  cwd: string | null;
  gitBranch: string | null;
  version: string | null;
};
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

const toSubagentTurn = (entry: TurnEntry): SubagentTurn => ({
  ...toTurn(entry),
  agentId: entry.agentId,
});

const toCompaction = (entry: CompactionEntry): CompactionEvent => ({
  sessionId: entry.sessionId,
  timestamp: entry.timestamp,
  trigger: entry.trigger,
  preTokens: entry.preTokens,
  postTokens: entry.postTokens,
  file: entry.file,
});

const toResponse = (entry: TurnEntry): TranscriptResponse => ({
  messageId: entry.messageId,
  model: entry.model,
  sessionId: entry.sessionId,
  timestamp: entry.timestamp,
  file: entry.file,
  isSidechain: entry.isSidechain,
  usage: entry.usage,
  cwd: entry.cwd,
  gitBranch: entry.gitBranch,
  version: entry.version,
});

/** Matches a failed tool result however the JSON is spaced. */
const FAILED_RESULT = /"is_error"\s*:\s*true/;

type ReaderOptions = {
  /** Also collect every response, tool call, and failed tool result. */
  details: boolean;
};

type InternalReader = TranscriptReader & { summarizeDetailed: () => DetailedTranscript };

const createReader = ({ details }: ReaderOptions): InternalReader => {
  const responses = new Map<string, TurnEntry>();
  const toolCalls = new Map<string, TranscriptToolCall>();
  const toolErrors: TranscriptToolError[] = [];
  const failedCalls = new Set<string>();
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
    let lineNumber = 0;

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

    const addToolCalls = (record: JsonRecord, message: JsonRecord): void => {
      if (!Array.isArray(message.content)) return;

      for (const item of message.content) {
        if (!isRecord(item) || item.type !== 'tool_use') continue;

        const id = readString(item.id);
        if (!id || toolCalls.has(id)) continue;

        const input = isRecord(item.input) ? item.input : {};
        toolCalls.set(id, {
          id,
          name: readString(item.name) ?? 'unknown',
          command: readString(input.command),
          sessionId: readString(record.sessionId) ?? name,
          timestamp: readString(record.timestamp),
          file: name,
          line: lineNumber,
        });
      }
    };

    const addToolErrors = (record: JsonRecord, source: string): void => {
      if (!isRecord(record.message) || !Array.isArray(record.message.content)) return;

      for (const item of record.message.content) {
        if (!isRecord(item) || item.type !== 'tool_result' || item.is_error !== true) continue;

        const toolUseId = readString(item.tool_use_id);
        if (toolUseId) {
          if (failedCalls.has(toolUseId)) continue;
          failedCalls.add(toolUseId);
        }

        toolErrors.push({
          toolUseId,
          sessionId: readString(record.sessionId) ?? name,
          timestamp: readString(record.timestamp),
          file: name,
          line: lineNumber,
          text: contentText(item.content),
          source,
        });
      }
    };

    const addResponse = (record: JsonRecord): void => {
      if (!isRecord(record.message)) return;
      if (details) addToolCalls(record, record.message);

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
        agentId: readString(record.agentId) ?? previous?.agentId ?? null,
        usage: readUsage(usage),
        cwd: readString(record.cwd) ?? previous?.cwd ?? null,
        gitBranch: readString(record.gitBranch) ?? previous?.gitBranch ?? null,
        version: readString(record.version) ?? previous?.version ?? null,
      });
      fileResponses.add(messageId);
    };

    return {
      addLine: (rawLine) => {
        lineNumber += 1;
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
        const carriesFailure =
          details && line.includes('"tool_result"') && FAILED_RESULT.test(line);

        // Parse only the lines that matter, plus the first lines until one has a time.
        if (
          !carriesCompaction &&
          !carriesResponse &&
          !carriesFailure &&
          fileFirstTimestamp !== null
        ) {
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
        } else if (carriesFailure && record.type === 'user') {
          addToolErrors(record, line);
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
      subagentTurns: entries.filter((entry) => entry.isSidechain).map(toSubagentTurn),
      compactions: [...compactions].sort(chronologically).map(toCompaction),
      firstTimestamp,
      lastTimestamp,
      skippedLines: files.reduce((sum, file) => sum + file.skippedLines, 0),
    };
  };

  const summarizeDetailed = (): DetailedTranscript => ({
    ...summarize(),
    details: {
      responses: [...responses.values()].sort(chronologically).map(toResponse),
      toolCalls: [...toolCalls.values()],
      toolErrors: [...toolErrors],
    },
  });

  return { readFile, summarize, summarizeDetailed };
};

/**
 * Collects turns and compactions from one or more transcripts. A response that
 * appears in more than one file is counted once.
 */
export const createTranscriptReader = (): TranscriptReader => createReader({ details: false });

/**
 * Like `createTranscriptReader`, but also collects every response with its
 * usage split, every tool call, and every failed tool result with the line it
 * came from. Lines that only carry a successful tool result are still skipped
 * without parsing.
 */
export const createDetailedTranscriptReader = (): DetailedTranscriptReader => {
  const reader = createReader({ details: true });

  return { readFile: reader.readFile, summarize: () => reader.summarizeDetailed() };
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
