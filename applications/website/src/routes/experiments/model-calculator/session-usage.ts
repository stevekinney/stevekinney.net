import {
  isClaudeCodeLine,
  readClaudeCodeReportedCost,
  readClaudeCodeResponse,
} from './claude-code-session';
import {
  isCodexLine,
  readCodexSessionMeta,
  readCodexTokenEvent,
  readCodexTurnModel,
} from './codex-session';
import { isRecord } from './session-records';
import type { JsonRecord, SessionRequest } from './session-records';
import { addTokenUsage, emptyTokenUsage, totalTokens } from './token-usage';
import type { TokenUsage } from './token-usage';

export type SessionFormat = 'claude-code' | 'codex';

/** Codex usage that no `turn_context` ever attributed to a model. */
export const UNKNOWN_MODEL = 'unknown model';

export type SessionFileSummary = {
  /** The file's name, or its path inside a dropped folder. */
  name: string;
  /** `null` when no line in the file looked like Claude Code or Codex. */
  format: SessionFormat | null;
  /** Model requests found in this file. */
  requests: number;
  /** Lines that weren't valid JSON, such as the last line of a session that's still running. */
  unreadableLines: number;
};

export type ModelSessionUsage = {
  /** The model ID exactly as the session recorded it. */
  model: string;
  usage: TokenUsage;
  requests: number;
  /** The most input tokens that any single request sent. */
  largestPrompt: number;
};

export type SessionUsage = {
  files: SessionFileSummary[];
  /** Usage per model, most tokens first. */
  models: ModelSessionUsage[];
  total: TokenUsage;
  requests: number;
  largestPrompt: number;
  /** The cost Claude Code recorded for itself, when the transcript includes it. */
  reportedCost: number | null;
};

export type SessionFileReader = {
  addLine: (line: string) => void;
  finish: () => SessionFileSummary;
};

export type SessionUsageCollector = {
  /** Starts one file. Feed it every line, then call `finish` before starting the next. */
  readFile: (name: string) => SessionFileReader;
  summarize: () => SessionUsage;
};

const detectSessionFormat = (line: JsonRecord): SessionFormat | null => {
  if (isCodexLine(line)) return 'codex';
  if (isClaudeCodeLine(line)) return 'claude-code';

  return null;
};

/**
 * Most lines in a session are prompts, tool calls, and tool output. These
 * substring checks skip parsing any line that can't carry usage.
 */
type CodexEvent = {
  /** Which file it came from, as an index into the collector's files. */
  fileIndex: number;
  /** The thread its file names, or the file itself when it names none. */
  thread: string;
  /** Counts the compactions before it, since a compaction resets the running total to zero. */
  epoch: number;
  key: string | null;
  /** `null` until a `turn_context` names the model. */
  model: string | null;
  usage: SessionRequest['usage'];
  promptTokens: number;
};

const mightCarryUsage = (line: string, format: SessionFormat): boolean =>
  format === 'claude-code'
    ? line.includes('"usage"') || line.includes('"cost-state"')
    : line.includes('"token_count"') ||
      line.includes('"turn_context"') ||
      line.includes('"session_meta"');

/**
 * Collects token usage from one or more Claude Code or Codex session files.
 * Files can mix formats; their usage is combined by model.
 */
export const createSessionUsageCollector = (): SessionUsageCollector => {
  // Shared across files: an older Claude Code transcript can hold a subagent's
  // lines that the subagent's own file repeats, and the last line written for
  // a response always has its final usage.
  const claudeCodeResponses = new Map<string, SessionRequest[]>();
  // Codex events are kept raw and deduplicated when the usage is summarized, because a fork's
  // parent can turn up in any order and only the finished set of `session_meta` lines says which
  // threads share a lineage. Keys are scoped to a lineage, so two unrelated sessions that happen
  // to report the same counts aren't mistaken for a replay.
  const codexEvents: CodexEvent[] = [];
  const codexForkParents = new Map<string, string>();
  const reportedCosts = new Map<string, number>();
  const files: SessionFileSummary[] = [];

  const lineageOf = (thread: string): string => {
    if (!thread.startsWith('thread:')) return thread;

    const seen = new Set<string>();
    let current = thread.slice('thread:'.length);

    for (
      let parent = codexForkParents.get(current);
      parent;
      parent = codexForkParents.get(parent)
    ) {
      if (seen.has(parent)) break;
      seen.add(parent);
      current = parent;
    }

    return `thread:${current}`;
  };

  const readFile = (name: string): SessionFileReader => {
    const summary: SessionFileSummary = { name, format: null, requests: 0, unreadableLines: 0 };
    const claudeCodeKeys = new Set<string>();
    const fileIndex = files.length;
    let codexModel: string | null = null;
    // A file that never names its thread is its own lineage.
    let codexThread = `file:${name}`;
    let codexEpoch = 0;
    // Usage that arrives before the first turn names a model waits here.
    const codexPending: CodexEvent[] = [];

    const parse = (line: string): JsonRecord | null => {
      try {
        const value: unknown = JSON.parse(line);

        return isRecord(value) ? value : null;
      } catch {
        summary.unreadableLines += 1;

        return null;
      }
    };

    const addClaudeCodeLine = (line: JsonRecord): void => {
      const response = readClaudeCodeResponse(line);

      if (response) {
        claudeCodeResponses.set(response.key, response.requests);
        claudeCodeKeys.add(response.key);

        return;
      }

      const reported = readClaudeCodeReportedCost(line);
      if (reported) reportedCosts.set(reported.sessionId || name, reported.cost);
    };

    const addCodexLine = (line: JsonRecord): void => {
      const meta = readCodexSessionMeta(line);

      if (meta) {
        if (meta.forkedFromId) codexForkParents.set(meta.id, meta.forkedFromId);
        codexThread = `thread:${meta.id}`;

        return;
      }

      const model = readCodexTurnModel(line);

      if (model) {
        codexModel = model;
        for (const pending of codexPending.splice(0)) {
          pending.model = model;
          codexEvents.push(pending);
        }

        return;
      }

      const event = readCodexTokenEvent(line);
      if (!event) return;

      // A reset after compaction reports zero usage and isn't a request. It starts a new run of
      // running totals, so an identical event on either side of it is a different request.
      if (event.promptTokens + event.usage.output === 0) {
        codexEpoch += 1;

        return;
      }

      const entry: CodexEvent = {
        fileIndex,
        thread: codexThread,
        epoch: codexEpoch,
        key: event.key,
        model: codexModel,
        usage: event.usage,
        promptTokens: event.promptTokens,
      };

      if (codexModel) codexEvents.push(entry);
      else codexPending.push(entry);
    };

    const addRecord = (line: JsonRecord): void => {
      if (summary.format === 'codex') addCodexLine(line);
      else addClaudeCodeLine(line);
    };

    return {
      addLine: (rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        if (summary.format === null) {
          const record = parse(line);
          if (!record) return;

          summary.format = detectSessionFormat(record);
          if (summary.format) addRecord(record);

          return;
        }

        if (!mightCarryUsage(line, summary.format)) return;

        const record = parse(line);
        if (record) addRecord(record);
      },
      finish: () => {
        for (const pending of codexPending.splice(0)) {
          pending.model = UNKNOWN_MODEL;
          codexEvents.push(pending);
        }

        if (summary.format === 'claude-code') {
          for (const key of claudeCodeKeys) {
            summary.requests += claudeCodeResponses.get(key)?.length ?? 0;
          }
        }

        files.push(summary);

        return { ...summary };
      },
    };
  };

  const summarize = (): SessionUsage => {
    const byModel = new Map<string, ModelSessionUsage>();

    const record = ({ model, usage, promptTokens }: SessionRequest): void => {
      const entry = byModel.get(model) ?? {
        model,
        usage: emptyTokenUsage(),
        requests: 0,
        largestPrompt: 0,
      };

      addTokenUsage(entry.usage, usage);
      entry.requests += 1;
      entry.largestPrompt = Math.max(entry.largestPrompt, promptTokens);
      byModel.set(model, entry);
    };

    for (const requests of claudeCodeResponses.values()) requests.forEach(record);

    // Drop what a fork replays from its parent, now that every file's lineage is known.
    const seen = new Set<string>();
    const codexCounts = new Map<number, number>();

    for (const event of codexEvents) {
      if (event.key !== null) {
        const scoped = `${lineageOf(event.thread)}|${event.epoch}|${event.key}`;

        if (seen.has(scoped)) continue;
        seen.add(scoped);
      }

      record({
        model: event.model ?? UNKNOWN_MODEL,
        usage: event.usage,
        promptTokens: event.promptTokens,
      });
      codexCounts.set(event.fileIndex, (codexCounts.get(event.fileIndex) ?? 0) + 1);
    }

    const models = [...byModel.values()].sort(
      (first, second) => totalTokens(second.usage) - totalTokens(first.usage),
    );
    const total = emptyTokenUsage();
    for (const model of models) addTokenUsage(total, model.usage);

    return {
      files: files.map((file, index) => ({
        ...file,
        requests: file.requests + (codexCounts.get(index) ?? 0),
      })),
      models,
      total,
      requests: models.reduce((sum, model) => sum + model.requests, 0),
      largestPrompt: models.reduce((largest, model) => Math.max(largest, model.largestPrompt), 0),
      reportedCost:
        reportedCosts.size > 0
          ? [...reportedCosts.values()].reduce((sum, cost) => sum + cost)
          : null,
    };
  };

  return { readFile, summarize };
};
