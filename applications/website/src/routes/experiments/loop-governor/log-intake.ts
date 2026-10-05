import { createTranscriptReader } from '$lib/experiments/claude-code-transcript';

import { createLogReader } from './replay';
import type { FieldMapping, RawLog } from './replay';

export type LogIntake = {
  log: RawLog;
  /** What the shared Claude Code reader made of the same lines. */
  transcript: { recognized: boolean; turns: number };
};

export type LogIntakeReader = {
  addLine: (line: string) => void;
  finish: () => LogIntake;
};

/**
 * Feeds every line to the loop-log reader and to the shared Claude Code
 * transcript reader at once, so a dropped session transcript can be named for
 * what it is instead of read as a strange loop log.
 */
export const createLogIntake = (name: string): LogIntakeReader => {
  const log = createLogReader();
  const transcript = createTranscriptReader().readFile(name);

  return {
    addLine: (line) => {
      log.addLine(line);
      transcript.addLine(line);
    },
    finish: () => {
      const summary = transcript.finish();

      return {
        log: log.finish(),
        transcript: { recognized: summary.recognized, turns: summary.turns },
      };
    },
  };
};

export const readLogText = (name: string, text: string): LogIntake => {
  const reader = createLogIntake(name);
  for (const line of text.split(/\r?\n/)) reader.addLine(line);

  return reader.finish();
};

/** A Claude Code transcript with none of a loop log's fields: one line per message, not per iteration. */
export const looksLikeTranscript = (intake: LogIntake, mapping: FieldMapping): boolean =>
  intake.transcript.recognized &&
  mapping.score === null &&
  mapping.kept === null &&
  mapping.cost === null;
