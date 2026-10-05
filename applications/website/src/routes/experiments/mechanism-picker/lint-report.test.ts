import { describe, expect, it } from 'vitest';

import { lintInstructions } from './lint';
import { defaultRules } from './lint-rules';
import { buildLintReport, escapeMarkdownCell } from './lint-report';

const sample = [
  '- Maintain high quality code.',
  '- Never read .env files.',
  '- Run `pnpm test:billing` from `apps/api` after billing changes.',
  '- Format files with Prettier after every edit.',
  '- Current branch is feature/invoices-2.',
].join('\n');

describe('buildLintReport', () => {
  const report = buildLintReport(lintInstructions(sample, defaultRules), 'CLAUDE.md');
  const rows = report.split('\n').filter((line) => /^\| \d/.test(line));

  it('opens with the file name and the summary', () => {
    expect(report.startsWith('## Instructions lint: CLAUDE.md\n\n5 lines: 1 must-hold')).toBe(true);
  });

  it('has a row for each line with its classification, suggestion, and rule', () => {
    expect(rows).toHaveLength(5);
    expect(rows[1]).toContain('| 2 | Never read .env files. | **Must hold every time** |');
    expect(rows[1]).toContain('deny `Read(**/.env*)`');
    expect(rows[1]).toContain('Absolute language (“never”)');
    expect(rows[2]).toContain('Run \\`pnpm test:billing\\` from \\`apps/api\\`');
    expect(rows.every((row) => row.split(/(?<!\\)\|/).length === 7)).toBe(true);
  });

  it('labels the advice as heuristics from the course outline', () => {
    expect(report).toContain('heuristics from the course outline');
  });

  it('notes secondary matches', () => {
    const [row] = buildLintReport(
      lintInstructions('Never edit files on feature/x.', defaultRules),
      null,
    )
      .split('\n')
      .filter((line) => line.startsWith('| 1'));

    expect(row).toContain('(also stale-prone)');
  });

  it('says so when there was nothing to classify', () => {
    expect(buildLintReport([], null)).toContain('There were no lines to classify');
  });

  it('keeps a pasted line from breaking the table or injecting markup', () => {
    expect(escapeMarkdownCell('a | b <script>')).toBe('a \\| b \\<script\\>');
  });
});
