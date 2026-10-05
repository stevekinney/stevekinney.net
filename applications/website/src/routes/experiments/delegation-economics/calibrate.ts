import { createTranscriptReader } from '$lib/experiments/claude-code-transcript';
import type { ClaudeCodeTranscript } from '$lib/experiments/claude-code-transcript';

/**
 * Measures spawn overhead from real subagent transcripts: the context of each
 * subagent's first response, before it has done any work. The shared reader
 * keeps the last streamed line for each message ID and takes context as
 * uncached input plus cache reads plus cache writes.
 */
export type SpawnCalibration = {
  /** Subagents measured. */
  subagents: number;
  median: number;
  minimum: number;
  maximum: number;
  files: number;
  skippedLines: number;
};

export type CalibrationResult =
  { calibration: SpawnCalibration; message: null } | { calibration: null; message: string };

export const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const skippedNote = (skipped: number): string =>
  skipped === 0 ? '' : ` Skipped ${skipped} malformed ${skipped === 1 ? 'line' : 'lines'}.`;

/** The first response of every subagent, keyed by its agent ID, or its file when it has none. */
export const firstSubagentContexts = (transcript: ClaudeCodeTranscript): number[] => {
  const first = new Map<string, number>();

  // Subagent turns arrive oldest first, so the first one seen for each agent is its first turn.
  for (const turn of transcript.subagentTurns) {
    const key = turn.agentId ? `agent:${turn.agentId}` : `file:${turn.file}`;
    if (!first.has(key)) first.set(key, turn.contextTokens);
  }

  return [...first.values()];
};

export const calibrateSpawnOverhead = (transcript: ClaudeCodeTranscript): CalibrationResult => {
  const contexts = firstSubagentContexts(transcript).filter((tokens) => tokens > 0);
  const middle = median(contexts);
  const skipped = skippedNote(transcript.skippedLines);

  if (middle === null) {
    if (transcript.files.every((file) => !file.recognized)) {
      return {
        calibration: null,
        message: `None of that looked like a Claude Code transcript, which is one JSON object per line.${skipped}`,
      };
    }

    return {
      calibration: null,
      message: `That has no subagent responses. Subagent transcripts sit in a subagents folder beside the session file, so choose that folder, or the session’s whole folder.${skipped}`,
    };
  }

  return {
    calibration: {
      subagents: contexts.length,
      median: Math.round(middle),
      minimum: Math.min(...contexts),
      maximum: Math.max(...contexts),
      files: transcript.files.length,
      skippedLines: transcript.skippedLines,
    },
    message: null,
  };
};

/** Reads pasted JSON Lines with the same reader the file picker uses. Nothing leaves the page. */
export const readPastedTranscript = (text: string): ClaudeCodeTranscript => {
  const reader = createTranscriptReader();
  const file = reader.readFile('pasted lines');

  for (const line of text.split('\n')) file.addLine(line);
  file.finish();

  return reader.summarize();
};
