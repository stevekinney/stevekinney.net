import {
  isClaudeCodeLine,
  readClaudeCodeReportedCost,
  readClaudeCodeResponse,
} from './claude-code-session';
import { isCodexLine, readCodexTokenEvent, readCodexTurnModel } from './codex-session';
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
const mightCarryUsage = (line: string, format: SessionFormat): boolean =>
  format === 'claude-code'
    ? line.includes('"usage"') || line.includes('"cost-state"')
    : line.includes('"token_count"') || line.includes('"turn_context"');

/**
 * Collects token usage from one or more Claude Code or Codex session files.
 * Files can mix formats; their usage is combined by model.
 */
export const createSessionUsageCollector = (): SessionUsageCollector => {
  // Shared across files: an older Claude Code transcript can hold a subagent's
  // lines that the subagent's own file repeats, and the last line written for
  // a response always has its final usage.
  const claudeCodeResponses = new Map<string, SessionRequest[]>();
  const codexRequests: SessionRequest[] = [];
  const codexEventKeys = new Set<string>();
  const reportedCosts = new Map<string, number>();
  const files: SessionFileSummary[] = [];

  const readFile = (name: string): SessionFileReader => {
    const summary: SessionFileSummary = { name, format: null, requests: 0, unreadableLines: 0 };
    const claudeCodeKeys = new Set<string>();
    let codexModel: string | null = null;
    // Usage that arrives before the first turn names a model waits here.
    const codexPending: Omit<SessionRequest, 'model'>[] = [];

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
      const model = readCodexTurnModel(line);

      if (model) {
        codexModel = model;
        for (const pending of codexPending.splice(0)) codexRequests.push({ model, ...pending });

        return;
      }

      const event = readCodexTokenEvent(line);
      // A reset after compaction reports zero usage and isn't a request.
      if (!event || event.promptTokens + event.usage.output === 0) return;

      if (event.key !== null) {
        if (codexEventKeys.has(event.key)) return;
        codexEventKeys.add(event.key);
      }

      summary.requests += 1;

      const request = { usage: event.usage, promptTokens: event.promptTokens };
      if (codexModel) codexRequests.push({ model: codexModel, ...request });
      else codexPending.push(request);
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
          codexRequests.push({ model: UNKNOWN_MODEL, ...pending });
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
    codexRequests.forEach(record);

    const models = [...byModel.values()].sort(
      (first, second) => totalTokens(second.usage) - totalTokens(first.usage),
    );
    const total = emptyTokenUsage();
    for (const model of models) addTokenUsage(total, model.usage);

    return {
      files: files.map((file) => ({ ...file })),
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
