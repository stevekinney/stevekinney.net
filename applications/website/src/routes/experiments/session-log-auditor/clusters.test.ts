import { describe, expect, it } from 'vitest';

import type { AuditError } from './audit-data';
import { clusterErrors, clusterKey, MAXIMUM_EXAMPLES, matchesSearch } from './clusters';
import type { Cluster } from './clusters';
import { fixtureLines, readFixtures } from './fixture-reader';
import { defaultRules } from './rules';
import { toSignature } from './signature';

let sequence = 0;

const failure = (
  sessionId: string,
  message: string,
  timestamp = '2026-09-01T10:00:00.000Z',
  tool = 'Bash',
): AuditError => {
  sequence += 1;

  return {
    id: `${sessionId}.jsonl:${sequence}`,
    sessionId,
    timestamp,
    tool,
    model: 'claude-opus-5-5',
    command: null,
    exitCode: 1,
    message,
    signature: toSignature(message),
    quote: message,
    file: `${sessionId}.jsonl`,
    line: sequence,
  };
};

/** Every displayed example, checked against the line it names. Returns the ones that don't match. */
const unverifiedQuotes = (
  clusters: readonly Cluster[],
  linesOf: (file: string) => readonly string[],
): string[] =>
  clusters.flatMap((cluster) =>
    cluster.examples.flatMap((example) => {
      const line = linesOf(example.file)[example.line - 1] ?? '';

      return line.includes(example.quote) ? [] : [`${example.file}:${example.line}`];
    }),
  );

describe('clusterErrors', () => {
  it('counts sessions, not occurrences, and ranks by sessions (acceptance check 4)', () => {
    const retried = 'Error: connect ECONNREFUSED 127.0.0.1:5432';
    const spread = 'zsh: command not found: pnpm';
    const errors = [
      ...Array.from({ length: 200 }, () => failure('session-x', retried)),
      failure('session-y', retried),
      failure('session-z', retried),
      ...['a', 'b', 'c', 'd'].map((session) => failure(`session-${session}`, spread)),
    ];

    const clusters = clusterErrors(errors, defaultRules);

    expect(
      clusters.map(({ signature, sessions, occurrences }) => ({
        signature,
        sessions,
        occurrences,
      })),
    ).toEqual([
      { signature: spread, sessions: 4, occurrences: 4 },
      { signature: 'Error: connect ECONNREFUSED <n>:<n>', sessions: 3, occurrences: 202 },
    ]);
    expect(clusters[1].sessionIds).toEqual(['session-x', 'session-y', 'session-z']);
  });

  it('clusters by tool and signature together', () => {
    const clusters = clusterErrors(
      [
        failure('one', 'No such file or directory', undefined, 'Bash'),
        failure('two', 'No such file or directory', undefined, 'Read'),
      ],
      defaultRules,
    );

    expect(clusters.map((cluster) => cluster.key).sort()).toEqual(
      [
        clusterKey('Bash', 'No such file or directory'),
        clusterKey('Read', 'No such file or directory'),
      ].sort(),
    );
  });

  it('records first and last seen, exit codes, and up to five examples from different sessions first', () => {
    const errors = [
      failure('one', 'boom 1', '2026-09-03T00:00:00.000Z'),
      failure('one', 'boom 2', '2026-09-01T00:00:00.000Z'),
      failure('one', 'boom 3', '2026-09-02T00:00:00.000Z'),
      ...['two', 'three', 'four', 'five', 'six'].map((session, index) =>
        failure(session, `boom ${index + 4}`, `2026-09-1${index}T00:00:00.000Z`),
      ),
    ];

    const [cluster] = clusterErrors(errors, defaultRules);

    expect(cluster).toMatchObject({
      sessions: 6,
      occurrences: 8,
      firstSeen: '2026-09-01T00:00:00.000Z',
      lastSeen: '2026-09-14T00:00:00.000Z',
      exitCodes: [1],
    });
    expect(cluster.examples).toHaveLength(MAXIMUM_EXAMPLES);
    expect(new Set(cluster.examples.map((example) => example.sessionId)).size).toBe(5);
  });

  it('gives an unquotable failure no example and counts it', () => {
    const [cluster] = clusterErrors([{ ...failure('one', 'boom'), quote: null }], defaultRules);

    expect(cluster.examples).toEqual([]);
    expect(cluster.unquotable).toBe(1);
  });
});

describe('verbatim examples (acceptance check 5)', () => {
  const clusters = clusterErrors(readFixtures().errors, defaultRules);

  it('quotes every example exactly as it appears in its fixture line', () => {
    const examples = clusters.flatMap((cluster) => cluster.examples);

    expect(examples.length).toBeGreaterThanOrEqual(4);
    expect(unverifiedQuotes(clusters, fixtureLines)).toEqual([]);
  });

  it('quotes the expected text from the expected lines', () => {
    const quotes = clusters.flatMap((cluster) =>
      cluster.examples.map(
        (example) => `${example.file.split('/').at(-1)}:${example.line} ${example.quote}`,
      ),
    );

    expect(quotes).toEqual(
      expect.arrayContaining([
        'aaaaaaaa-0000-4000-8000-000000000001.jsonl:3 zsh: command not found: timeout',
        'aaaaaaaa-0000-4000-8000-000000000002.jsonl:2 zsh: command not found: timeout',
        'aaaaaaaa-0000-4000-8000-000000000001.jsonl:4 fatal: pathspec \\"src/a b.ts\\" did not match any files',
        'agent-a1.jsonl:2 zsh: no matches found: src/routes/[slug]',
      ]),
    );
  });

  it('fails when one byte of a quoted fixture line changes', () => {
    const [example] = clusters[0].examples;
    const altered = (file: string): string[] => {
      const lines = fixtureLines(file);
      if (file !== example.file) return lines;

      const index = lines[example.line - 1].indexOf(example.quote);
      const line = lines[example.line - 1];
      lines[example.line - 1] =
        line.slice(0, index) + (line[index] === 'z' ? 'Z' : 'z') + line.slice(index + 1);

      return lines;
    };

    expect(unverifiedQuotes(clusters, altered)).toEqual([`${example.file}:${example.line}`]);
  });
});

describe('matchesSearch', () => {
  it('finds a cluster by its signature, tool, or any message', () => {
    const [cluster] = clusterErrors(
      [failure('one', "Cannot find module 'left-pad'")],
      defaultRules,
    );

    expect(matchesSearch(cluster, 'cannot find')).toBe(true);
    expect(matchesSearch(cluster, 'LEFT-PAD')).toBe(true);
    expect(matchesSearch(cluster, 'bash')).toBe(true);
    expect(matchesSearch(cluster, 'timeout')).toBe(false);
    expect(matchesSearch(cluster, '  ')).toBe(true);
  });
});
