import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { looksLikeTranscript, readLogText } from './log-intake';
import { guessMapping } from './replay';

// Synthetic fixtures. The transcript is the model calculator's synthetic Claude Code session.
const read = (path: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../../../tests/fixtures/${path}`, import.meta.url)),
    'utf8',
  );

describe('reading a dropped log', () => {
  it('reads a loop log and doesn’t mistake it for a transcript', () => {
    const intake = readLogText('flat-from-15.jsonl', read('loop-governor/flat-from-15.jsonl'));

    expect(intake.log.records).toHaveLength(24);
    expect(intake.transcript.recognized).toBe(false);
    expect(looksLikeTranscript(intake, guessMapping(intake.log.keys))).toBe(false);
  });

  it('names a Claude Code session transcript through the shared reader', () => {
    const intake = readLogText(
      'claude-code-session.jsonl',
      read('model-calculator/claude-code-session.jsonl'),
    );

    expect(intake.transcript.recognized).toBe(true);
    expect(intake.transcript.turns).toBeGreaterThan(0);
    expect(looksLikeTranscript(intake, guessMapping(intake.log.keys))).toBe(true);
  });
});
