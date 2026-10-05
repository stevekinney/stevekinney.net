import { describe, expect, it } from 'vitest';

import { analyze, emptyFilters } from './analysis';
import { buildDigest, buildSummary, toCsv } from './digest';
import { readLinesByFile } from './fixture-reader';
import { redact } from './redact';
import { defaultRules } from './rules';
import { createSessionWriter } from './synthetic-sessions';

// Built at run time so no token-shaped string is ever committed.
const githubToken = `ghp_${'A1b2C3d4E5'.repeat(3)}abcdef`;

const sessionWithSecret = () => {
  const writer = createSessionWriter({
    sessionId: 'session-1',
    cwd: '/Users/someone/work/app',
    version: '3.1.2',
    model: 'claude-opus-5-5',
  });
  writer
    .respond('msg_1', { input: 10 }, [{ id: 'call-1', name: 'Bash', command: 'git push' }])
    .result(
      'call-1',
      `Exit code 128\nremote: Invalid token ${githubToken} for /Users/someone/work/app`,
      true,
    );

  return analyze({
    data: readLinesByFile({ 'session.jsonl': writer.lines() }),
    rules: defaultRules,
    prices: [],
    filters: emptyFilters,
    marks: [],
  });
};

describe('redact', () => {
  it('masks ghp_ followed by 36 characters (acceptance check 8)', () => {
    expect(githubToken).toHaveLength(40);

    const result = redact(`token ${githubToken} here`);

    expect(result.text).toBe('token [redacted ghp_] here');
    expect(result.findings).toEqual([
      { kind: 'GitHub token', replacement: '[redacted ghp_]', count: 1 },
    ]);
  });

  it.each([
    ['sk-', `key sk-${'a'.repeat(32)}`, 'key [redacted sk-]'],
    ['github_pat_', `github_pat_${'B'.repeat(30)}`, '[redacted github_pat_]'],
    ['xox', `xoxb-${'1'.repeat(12)}-abc`, '[redacted xoxb-]'],
    ['AWS', 'id AKIAABCDEFGHIJKLMNOP', 'id [redacted AWS key]'],
    ['Bearer', 'Authorization: Bearer abc.def.ghi123', 'Authorization: Bearer [redacted token]'],
    ['home', 'open /Users/someone/app and /home/other/x', 'open ~/app and ~/x'],
    [
      'dash-encoded home',
      'projects/-Users-someone-work-app/a.jsonl and -home-other-x/b.jsonl',
      'projects/~-work-app/a.jsonl and ~-x/b.jsonl',
    ],
    ['base64', `blob ${'QmFzZTY0'.repeat(6)}1==`, 'blob [redacted base64]'],
  ])('masks a %s shape', (_, text, expected) => {
    expect(redact(text).text).toBe(expected);
  });

  it('leaves ordinary text alone', () => {
    expect(redact('zsh: command not found: timeout')).toEqual({
      text: 'zsh: command not found: timeout',
      findings: [],
    });
  });
});

describe('buildDigest', () => {
  it('masks the token in the preview and in both exports, and lists what it masked', () => {
    const analysis = sessionWithSecret();
    const digest = buildDigest({
      overview: analysis.overview,
      clusters: analysis.clusters,
      scope: null,
      redaction: true,
    });

    expect(digest.markdown).not.toContain(githubToken);
    expect(digest.json).not.toContain(githubToken);
    expect(digest.markdown).toContain('[redacted ghp_]');
    // A masked quote is no longer verbatim, and the digest says so.
    expect(digest.markdown).toContain('except where a home directory or secret is masked');
    expect(JSON.parse(digest.json).note).toContain(
      'except where a home directory or secret is masked',
    );
    expect(digest.findings.map((finding) => finding.kind)).toEqual(
      expect.arrayContaining(['GitHub token']),
    );
  });

  it('keeps the token only when redaction is turned off', () => {
    const analysis = sessionWithSecret();
    const digest = buildDigest({
      overview: analysis.overview,
      clusters: analysis.clusters,
      scope: null,
      redaction: false,
    });

    expect(digest.markdown).toContain(githubToken);
    expect(digest.markdown).not.toContain('except where');
    expect(digest.findings).toEqual([]);
  });

  it('masks a home directory in the scope a filter puts in the digest', () => {
    const analysis = sessionWithSecret();
    const digest = buildDigest({
      overview: analysis.overview,
      clusters: analysis.clusters,
      scope: 'directory /Users/someone/work/app',
      redaction: true,
    });

    expect(digest.markdown).toContain('Scope: directory ~/work/app');
    expect(JSON.parse(digest.json).scope).toBe('directory ~/work/app');
    expect(`${digest.markdown}${digest.json}`).not.toContain('someone');
    expect(digest.findings).toContainEqual(
      expect.objectContaining({ kind: 'Home directory', replacement: '~' }),
    );
  });

  it('carries counts from code and the clusters ranked by sessions', () => {
    const analysis = sessionWithSecret();
    const json = JSON.parse(
      buildDigest({
        overview: analysis.overview,
        clusters: analysis.clusters,
        scope: 'Branch main',
        redaction: true,
      }).json,
    );

    expect(json.counts).toMatchObject({
      sessions: 1,
      toolCalls: 1,
      failedToolCalls: 1,
      clusters: 1,
    });
    expect(json.scope).toBe('Branch main');
    expect(json.clusters[0]).toMatchObject({
      rank: 1,
      tool: 'Bash',
      sessions: 1,
      occurrences: 1,
      exitCodes: [128],
    });
  });
});

describe('buildSummary', () => {
  it('writes the overview and a clusters table in Markdown', () => {
    const analysis = sessionWithSecret();
    const summary = buildSummary(analysis.overview, analysis.clusters, null);

    expect(summary).toContain('- Failed tool calls: 1 of 1 (100.0%)');
    expect(summary).toContain('| Signature | Tool | Category | Sessions | Occurrences |');
    expect(summary).not.toContain(githubToken);
  });
});

describe('toCsv', () => {
  it('quotes commas and quotes, and defuses spreadsheet formulas', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          ['x, y', 'say "hi"'],
          ['=SUM(A1)', 3],
        ],
      ),
    ).toBe('a,b\r\n"x, y","say ""hi"""\r\n\'=SUM(A1),3\r\n');
  });
});
