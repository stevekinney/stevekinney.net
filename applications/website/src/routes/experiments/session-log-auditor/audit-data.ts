/**
 * The format-neutral records the auditor works from, and the adapter that
 * builds them from Claude Code transcripts. Another tool's log format needs
 * only another adapter: everything after this file reads `AuditData`.
 */
import { createDetailedTranscriptReader } from '$lib/experiments/claude-code-transcript';
import type {
  DetailedTranscript,
  ResponseUsage,
  TranscriptFileSummary,
} from '$lib/experiments/claude-code-transcript';

import { buildErrorText, findVerbatim } from './error-text';
import { toSignature } from './signature';

export type AuditSession = {
  id: string;
  start: string | null;
  end: string | null;
  cwd: string | null;
  gitBranch: string | null;
  versions: string[];
  models: string[];
  files: string[];
  /** Subagent transcripts attributed to this session. */
  subagentFiles: number;
};

export type AuditResponse = {
  sessionId: string;
  timestamp: string | null;
  model: string;
  usage: ResponseUsage;
  isSidechain: boolean;
};

export type AuditToolCall = {
  sessionId: string;
  timestamp: string | null;
  name: string;
  /** The model of the response that issued the call, or `null` when it isn't known. */
  model: string | null;
};

export type AuditError = {
  /** Where it was read, such as `session.jsonl:42`. Unique. */
  id: string;
  sessionId: string;
  timestamp: string | null;
  /** The tool's name, or `unknown` when the call isn't in any file read. */
  tool: string;
  /** The model whose call failed, or `null` when the call isn't in any file read. */
  model: string | null;
  /** The shell command, for a shell tool. */
  command: string | null;
  exitCode: number | null;
  message: string;
  signature: string;
  /** The message exactly as it appears in its source line, or `null` when it can't be quoted. */
  quote: string | null;
  file: string;
  line: number;
};

export type AuditCompaction = {
  sessionId: string;
  timestamp: string | null;
  trigger: string;
  preTokens: number;
  postTokens: number;
  file: string;
};

export type AuditData = {
  /** The adapter that read the files, such as `claude-code`. */
  source: string;
  sessions: AuditSession[];
  responses: AuditResponse[];
  toolCalls: AuditToolCall[];
  errors: AuditError[];
  compactions: AuditCompaction[];
  files: TranscriptFileSummary[];
  skippedLines: number;
};

export type LogFileReader = {
  addLine: (line: string) => void;
  finish: () => void;
};

export type SessionLogReader = {
  /** Starts one file. Feed it every line, then call `finish` before starting the next. */
  readFile: (path: string) => LogFileReader;
  finish: () => AuditData;
};

/** Reads one tool's session logs into `AuditData`. */
export type SessionLogAdapter = {
  id: string;
  name: string;
  createReader: () => SessionLogReader;
};

/**
 * The session a subagent transcript belongs to, from its folder: Claude Code
 * writes them to `<session>/subagents/agent-<id>.jsonl` beside `<session>.jsonl`.
 */
export const parentSessionOf = (path: string): string | null => {
  const segments = path.split('/');
  const index = segments.lastIndexOf('subagents');

  return index > 0 && index < segments.length - 1 ? segments[index - 1] : null;
};

/** Tools whose input `command` is shell text worth showing. */
const SHELL_TOOLS = new Set(['bash', 'shell', 'powershell']);

const earliest = (times: Iterable<string | null>): string | null => {
  let result: string | null = null;
  for (const time of times) if (time && (result === null || time < result)) result = time;

  return result;
};

const latest = (times: Iterable<string | null>): string | null => {
  let result: string | null = null;
  for (const time of times) if (time && (result === null || time > result)) result = time;

  return result;
};

/** Turns what the shared transcript reader found into audit records. */
export const toAuditData = (transcript: DetailedTranscript): AuditData => {
  const { details } = transcript;
  const sessionFor = (file: string, sessionId: string): string =>
    parentSessionOf(file) ?? sessionId;

  const calls = new Map(details.toolCalls.map((call) => [call.id, call]));

  const responses: AuditResponse[] = details.responses.map((response) => ({
    sessionId: sessionFor(response.file, response.sessionId),
    timestamp: response.timestamp,
    model: response.model,
    usage: response.usage,
    isSidechain: response.isSidechain,
  }));

  const toolCalls: AuditToolCall[] = details.toolCalls.map((call) => ({
    sessionId: sessionFor(call.file, call.sessionId),
    timestamp: call.timestamp,
    name: call.name,
    model: call.model,
  }));

  const errors: AuditError[] = details.toolErrors.map((error) => {
    const call = error.toolUseId ? calls.get(error.toolUseId) : undefined;
    const tool = call?.name ?? 'unknown';
    const model = call?.model ?? null;
    const sessionId = sessionFor(error.file, error.sessionId);
    const { exitCode, message } = buildErrorText(error.text);

    // Every result answers a call. One whose call isn't in any file read still
    // counts as a tool call, so failures never outnumber the calls they failed.
    if (!call) toolCalls.push({ sessionId, timestamp: error.timestamp, name: tool, model });

    return {
      id: `${error.file}:${error.line}`,
      sessionId,
      timestamp: error.timestamp,
      tool,
      model,
      command: call && SHELL_TOOLS.has(tool.toLowerCase()) ? call.command : null,
      exitCode,
      message,
      signature: toSignature(message) || '(empty error)',
      quote: findVerbatim(message, error.source),
      file: error.file,
      line: error.line,
    };
  });

  const compactions: AuditCompaction[] = transcript.compactions.map((compaction) => ({
    ...compaction,
    sessionId: sessionFor(compaction.file, compaction.sessionId),
  }));

  return {
    source: claudeCodeAdapter.id,
    sessions: buildSessions(details.responses, responses, toolCalls, errors, compactions),
    responses,
    toolCalls,
    errors,
    compactions,
    files: transcript.files,
    skippedLines: transcript.skippedLines,
  };
};

const buildSessions = (
  raw: DetailedTranscript['details']['responses'],
  responses: readonly AuditResponse[],
  toolCalls: readonly AuditToolCall[],
  errors: readonly AuditError[],
  compactions: readonly AuditCompaction[],
): AuditSession[] => {
  type Draft = {
    times: (string | null)[];
    cwd: string | null;
    gitBranch: string | null;
    versions: Set<string>;
    models: Set<string>;
    files: Set<string>;
  };
  const drafts = new Map<string, Draft>();
  const draftFor = (id: string): Draft => {
    let draft = drafts.get(id);
    if (!draft) {
      draft = {
        times: [],
        cwd: null,
        gitBranch: null,
        versions: new Set(),
        models: new Set(),
        files: new Set(),
      };
      drafts.set(id, draft);
    }

    return draft;
  };

  raw.forEach((response, index) => {
    const draft = draftFor(responses[index].sessionId);
    draft.times.push(response.timestamp);
    draft.cwd ??= response.cwd;
    draft.gitBranch ??= response.gitBranch;
    if (response.version) draft.versions.add(response.version);
    draft.models.add(response.model);
    draft.files.add(response.file);
  });
  for (const record of [...toolCalls, ...compactions]) {
    draftFor(record.sessionId).times.push(record.timestamp);
  }
  for (const error of errors) {
    const draft = draftFor(error.sessionId);
    draft.times.push(error.timestamp);
    draft.files.add(error.file);
  }

  return [...drafts.entries()]
    .map(([id, draft]) => {
      const files = [...draft.files].sort();

      return {
        id,
        start: earliest(draft.times),
        end: latest(draft.times),
        cwd: draft.cwd,
        gitBranch: draft.gitBranch,
        versions: [...draft.versions].sort(),
        models: [...draft.models].sort(),
        files,
        subagentFiles: files.filter((file) => parentSessionOf(file) !== null).length,
      };
    })
    .sort(
      (first, second) =>
        (first.start ?? '').localeCompare(second.start ?? '') || first.id.localeCompare(second.id),
    );
};

export const claudeCodeAdapter: SessionLogAdapter = {
  id: 'claude-code',
  name: 'Claude Code',
  createReader: () => {
    const reader = createDetailedTranscriptReader();

    return {
      readFile: (path) => reader.readFile(path),
      finish: () => toAuditData(reader.summarize()),
    };
  },
};

/** Reads files given as `path → lines` through the Claude Code adapter, all at once. */
export const readLinesByFile = (files: Record<string, readonly string[]>): AuditData => {
  const reader = claudeCodeAdapter.createReader();

  for (const [path, lines] of Object.entries(files)) {
    const file = reader.readFile(path);
    lines.forEach((line) => file.addLine(line));
    file.finish();
  }

  return reader.finish();
};
