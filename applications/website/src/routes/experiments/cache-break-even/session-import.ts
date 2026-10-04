import type { SourceFile } from '$lib/experiments/dropped-files';
import type { ClaudeCodeTranscript } from '$lib/experiments/claude-code-transcript';

/** The last compaction in the transcript, as Claude Code reported it. */
export type CompactionSummary = {
  timestamp: string | null;
  trigger: string;
  preTokens: number;
  postTokens: number;
};

/** What the page takes from a session transcript. Nothing else is kept. */
export type SessionImport = {
  fileCount: number;
  /** Main-thread responses, counted once per message ID. */
  turns: number;
  /** The context size of the latest main-thread turn: the page's N. */
  contextTokens: number;
  /** The model ID recorded on the latest turn, such as `claude-opus-5`. */
  modelId: string;
  meanOutput: number;
  medianOutput: number;
  lastCompaction: CompactionSummary | null;
  /** Lines that weren't complete JSON objects. */
  skippedLines: number;
  /** Files with no records that looked like a Claude Code transcript. */
  unrecognizedFiles: number;
  /** Subagent responses left out of every figure above. */
  sidechainTurns: number;
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Summarizes a transcript, or returns `null` when it has no main-thread responses. */
export const summarizeSession = (transcript: ClaudeCodeTranscript): SessionImport | null => {
  const latest = transcript.turns.at(-1);
  if (!latest) return null;

  const outputs = transcript.turns.map((turn) => turn.outputTokens);
  const compaction = transcript.compactions.at(-1);

  return {
    fileCount: transcript.files.length,
    turns: transcript.turns.length,
    contextTokens: latest.contextTokens,
    modelId: latest.model,
    meanOutput: Math.round(outputs.reduce((sum, count) => sum + count, 0) / outputs.length),
    medianOutput: Math.round(median(outputs)),
    lastCompaction: compaction
      ? {
          timestamp: compaction.timestamp,
          trigger: compaction.trigger,
          preTokens: compaction.preTokens,
          postTokens: compaction.postTokens,
        }
      : null,
    skippedLines: transcript.skippedLines,
    unrecognizedFiles: transcript.files.filter((file) => !file.recognized).length,
    sidechainTurns: transcript.sidechainTurns,
  };
};

/** Whether a file picked from inside a folder could be a main-thread session. */
export const isSessionFile = (path: string): boolean =>
  path.endsWith('.jsonl') && !path.split('/').includes('subagents');

/**
 * Reads transcripts in the browser. The transcript reader is loaded only now,
 * so people who never drop a file never download it.
 */
export const readSession = async (
  files: readonly SourceFile[],
  onFileStart?: (index: number) => void,
): Promise<SessionImport | null> => {
  const { readClaudeCodeTranscripts } = await import('$lib/experiments/claude-code-transcript');

  return summarizeSession(await readClaudeCodeTranscripts(files, onFileStart));
};
