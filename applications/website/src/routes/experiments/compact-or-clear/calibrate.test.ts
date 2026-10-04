import { describe, expect, it } from 'vitest';

import { createTranscriptReader } from '$lib/experiments/claude-code-transcript';

import { assessCache, calibrate, formatElapsed, median } from './calibrate';
import { defaultModels } from './pricing';

const NOW = Date.parse('2026-10-04T12:00:00.000Z');

const assistant = (
  id: string,
  timestamp: string,
  usage: { input?: number; read?: number; write?: number; output?: number },
  extra: Record<string, unknown> = {},
  model = 'claude-opus-5',
  sessionId = 'session-1',
): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId,
    timestamp,
    ...extra,
    message: {
      id,
      model,
      role: 'assistant',
      usage: {
        input_tokens: usage.input ?? 0,
        cache_read_input_tokens: usage.read ?? 0,
        cache_creation_input_tokens: usage.write ?? 0,
        output_tokens: usage.output ?? 0,
      },
    },
  });

const boundary = (timestamp: string, preTokens: number, postTokens: number, trigger = 'manual') =>
  JSON.stringify({
    type: 'system',
    subtype: 'compact_boundary',
    sessionId: 'session-1',
    timestamp,
    compactMetadata: { trigger, preTokens, postTokens },
  });

const read = (files: Record<string, string[]>) => {
  const reader = createTranscriptReader();

  for (const [name, lines] of Object.entries(files)) {
    const file = reader.readFile(name);
    lines.forEach(file.addLine);
    file.finish();
  }

  return reader.summarize();
};

const calibrateLines = (lines: string[], now = NOW) => {
  const result = calibrate(read({ 'session.jsonl': lines }), defaultModels, now);
  if (!result.calibration) throw new Error(result.message);

  return result.calibration;
};

describe('median', () => {
  it('takes the middle value, or the mean of the two in the middle', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 10])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe('calibrate', () => {
  const lines = [
    assistant('a', '2026-10-04T10:00:00.000Z', { write: 30_000, output: 400 }),
    assistant('b', '2026-10-04T10:01:00.000Z', { read: 30_000, write: 5_400, output: 600 }),
    assistant('c', '2026-10-04T10:02:00.000Z', { read: 35_400, write: 4_700, output: 200 }),
  ];

  it('takes N from the latest turn and gOut and gIn as medians', () => {
    const calibration = calibrateLines(lines);

    // Context: 30,000, 35,400, 40,100. Growth minus the previous output: 5,000 and 4,100.
    expect(calibration.contextNow).toBe(40_100);
    expect(calibration.outputPerTurn).toBe(400);
    expect(calibration.inputPerTurn).toBe(4_550);
    expect(calibration.inputPairs).toBe(2);
    expect(calibration.baselineEstimate).toBe(30_000);
  });

  it('counts a response that streamed across several lines once, at its final size', () => {
    const calibration = calibrateLines([
      assistant('a', '2026-10-04T10:00:00.000Z', { write: 30_000, output: 12 }),
      assistant('a', '2026-10-04T10:00:01.000Z', { write: 30_000, output: 480 }),
      assistant('b', '2026-10-04T10:01:00.000Z', { read: 30_000, write: 5_480, output: 100 }),
    ]);

    expect(calibration.turns).toBe(2);
    expect(calibration.outputPerTurn).toBe(290);
  });

  it('leaves out subagent turns and placeholder responses', () => {
    const calibration = calibrateLines([
      ...lines,
      assistant(
        'side',
        '2026-10-04T10:03:00.000Z',
        { read: 900_000, output: 50 },
        { isSidechain: true },
      ),
      assistant('synthetic', '2026-10-04T10:04:00.000Z', { read: 1 }, {}, '<synthetic>'),
    ]);

    expect(calibration.turns).toBe(3);
    expect(calibration.sidechainTurns).toBe(1);
    expect(calibration.contextNow).toBe(40_100);
  });

  it('skips the pair of turns that straddles a compaction', () => {
    const calibration = calibrateLines([
      assistant('a', '2026-10-04T10:00:00.000Z', { read: 100_000, output: 100 }),
      assistant('b', '2026-10-04T10:01:00.000Z', { read: 106_000, output: 100 }),
      boundary('2026-10-04T10:02:00.000Z', 106_100, 9_000),
      assistant('c', '2026-10-04T10:03:00.000Z', { read: 9_000, output: 100 }),
      assistant('d', '2026-10-04T10:04:00.000Z', { read: 9_000, write: 3_000, output: 100 }),
    ]);

    // Without the skip, the drop from 106K to 9K would clamp to 0 and drag the median down.
    expect(calibration.inputPairs).toBe(2);
    expect(calibration.pairsAcrossCompaction).toBe(1);
    expect(calibration.inputPerTurn).toBe(Math.round((5_900 + 2_900) / 2));
  });

  it('never goes below zero when a turn is smaller than the one before', () => {
    const calibration = calibrateLines([
      assistant('a', '2026-10-04T10:00:00.000Z', { read: 50_000, output: 100 }),
      assistant('b', '2026-10-04T10:01:00.000Z', { read: 40_000, output: 100 }),
    ]);

    expect(calibration.inputPerTurn).toBe(0);
  });

  it('does not pair turns from different sessions', () => {
    const calibration = calibrateLines([
      assistant(
        'a',
        '2026-10-04T10:00:00.000Z',
        { read: 10_000, output: 100 },
        {},
        'claude-opus-5',
        's1',
      ),
      assistant(
        'b',
        '2026-10-04T10:01:00.000Z',
        { read: 500_000, output: 100 },
        {},
        'claude-opus-5',
        's2',
      ),
    ]);

    expect(calibration.inputPairs).toBe(0);
    expect(calibration.inputPerTurn).toBeNull();
    expect(calibration.sessions).toBe(2);
  });

  it('turns a compaction of 312,693 into 12,969 tokens into about 4.1%', () => {
    const calibration = calibrateLines([
      ...lines,
      boundary('2026-10-04T10:05:00.000Z', 312_693, 12_969),
    ]);

    expect(calibration.summaryPercent).toBe(4.1);
    expect(calibration.compactions).toHaveLength(1);
    expect(calibration.compactions[0].label).toBe('manual · 313K → 13K (4.1%)');
  });

  it('takes the median ratio across every event and tells manual from auto', () => {
    const calibration = calibrateLines([
      ...lines,
      boundary('2026-10-04T10:05:00.000Z', 300_000, 30_000, 'auto'),
      boundary('2026-10-04T10:06:00.000Z', 400_000, 8_000, 'auto'),
      boundary('2026-10-04T10:07:00.000Z', 500_000, 50_000, 'manual'),
    ]);

    // 10%, 2%, and 10%.
    expect(calibration.summaryPercent).toBe(10);
    expect(calibration.compactions.map((row) => row.trigger)).toEqual(['auto', 'auto', 'manual']);
  });

  it('keeps a ratio that is below what the summary box accepts at the lowest it accepts', () => {
    const calibration = calibrateLines([
      ...lines,
      boundary('2026-10-04T10:05:00.000Z', 2_000_000, 10_000, 'auto'),
    ]);

    expect(calibration.summaryPercent).toBe(1);
  });

  it('has no summary size without a compaction, and lists one without sizes without counting it', () => {
    expect(calibrateLines(lines).summaryPercent).toBeNull();

    const calibration = calibrateLines([
      ...lines,
      JSON.stringify({
        type: 'system',
        subtype: 'compact_boundary',
        sessionId: 'session-1',
        timestamp: '2026-10-04T10:05:00.000Z',
        compactMetadata: { trigger: 'auto' },
      }),
    ]);

    expect(calibration.summaryPercent).toBeNull();
    expect(calibration.compactions[0].label).toBe('auto · size not recorded');
  });

  it('matches the latest turn’s model against the price table', () => {
    expect(calibrateLines(lines).modelMatch?.name).toBe('Opus 5');

    const unmatched = calibrateLines([
      assistant(
        'a',
        '2026-10-04T10:00:00.000Z',
        { read: 10_000, output: 100 },
        {},
        'claude-opus-5-5',
      ),
    ]);

    expect(unmatched.modelId).toBe('claude-opus-5-5');
    expect(unmatched.modelMatch).toBeNull();
  });

  it('uses the model of the latest turn, not the first', () => {
    const calibration = calibrateLines([
      assistant(
        'a',
        '2026-10-04T10:00:00.000Z',
        { read: 10_000, output: 100 },
        {},
        'claude-haiku-4-5',
      ),
      assistant(
        'b',
        '2026-10-04T10:01:00.000Z',
        { read: 10_000, output: 100 },
        {},
        'claude-sonnet-5',
      ),
    ]);

    expect(calibration.modelMatch?.name).toBe('Sonnet 5');
  });

  it('reports lines that could not be read without failing the import', () => {
    const calibration = calibrateLines([
      ...lines,
      '{"type":"assistant","message":{"id":',
      'garbage',
    ]);

    expect(calibration.skippedLines).toBe(2);
    expect(calibration.turns).toBe(3);
  });
});

describe('a transcript with nothing to measure', () => {
  const message = (lines: string[]): string | null =>
    calibrate(read({ 'session.jsonl': lines }), defaultModels, NOW).message;

  it('says there are no assistant responses', () => {
    expect(
      message([JSON.stringify({ type: 'user', sessionId: 's', message: { role: 'user' } })]),
    ).toContain('any assistant responses');
  });

  it('says when only subagents responded', () => {
    expect(
      message([
        assistant(
          'side',
          '2026-10-04T10:00:00.000Z',
          { read: 1_000, output: 5 },
          { isSidechain: true },
        ),
      ]),
    ).toContain('subagent');
  });

  it('says when the files are not sessions', () => {
    expect(message(['{"hello":"world"}'])).toContain(
      'None of those files looked like a Claude Code session',
    );
    expect(message([])).toContain('None of those files looked like a Claude Code session');
  });
});

describe('formatElapsed', () => {
  it('writes minutes, hours with minutes, and days', () => {
    expect(formatElapsed(20_000)).toBe('under a minute');
    expect(formatElapsed(12 * 60_000)).toBe('12m');
    expect(formatElapsed((2 * 60 + 14) * 60_000)).toBe('2h 14m');
    expect(formatElapsed(3 * 60 * 60_000)).toBe('3h');
    expect(formatElapsed(51 * 60 * 60_000)).toBe('2d 3h');
    expect(formatElapsed(-5)).toBe('under a minute');
  });
});

describe('assessCache', () => {
  const at = (minutesAgo: number): string => new Date(NOW - minutesAgo * 60_000).toISOString();

  it('calls the cache cold when the last turn is older than the TTL, and says why', () => {
    expect(assessCache(at(134), NOW, '1h')).toEqual({
      warm: false,
      sentence: 'Your last turn was 2h 14m ago, longer than the 1-hour TTL, so the cache is cold.',
    });
  });

  it('calls the cache warm inside the TTL', () => {
    expect(assessCache(at(12), NOW, '1h')).toEqual({
      warm: true,
      sentence: 'Your last turn was 12m ago, within the 1-hour TTL, so the cache is warm.',
    });
  });

  it('judges the same turn against the selected TTL', () => {
    expect(assessCache(at(12), NOW, '5m')?.warm).toBe(false);
    expect(assessCache(at(12), NOW, '5m')?.sentence).toContain('5-minute TTL');
    expect(assessCache(at(5), NOW, '5m')?.warm).toBe(true);
  });

  it('makes no call without a usable timestamp', () => {
    expect(assessCache(null, NOW, '1h')).toBeNull();
    expect(assessCache('not a date', NOW, '1h')).toBeNull();
  });

  it('treats a timestamp in the future as just now', () => {
    expect(assessCache(at(-30), NOW, '1h')?.warm).toBe(true);
  });
});
