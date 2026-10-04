import { suggestFix } from './fixes';
import type { FleetAnalysis, FleetRow } from './fleet';
import { modelLabel } from './models';
import type { ModelValue } from './models';
import { rulesVerifiedOn } from './version-boundaries';
import { formatVersion } from './versions';

const show = (model: ModelValue | null): string => (model === null ? '—' : modelLabel(model));

/** Escapes text from a file so it can't break out of a Markdown table cell or format itself. */
export const escapeMarkdownCell = (text: string): string =>
  text.replace(/\r?\n/g, ' ').replace(/[\\`*_{}[\]<>#|&!~]/g, (character) => `\\${character}`);

const changeText = (row: FleetRow): string => {
  if (row.status.kind === 'shadowed') return 'shadowed';
  if (!row.changed) return 'unchanged';

  return `${show(row.before)} → ${show(row.after)}`;
};

const statusText = (row: FleetRow): string => {
  if (row.status.kind === 'shadowed') {
    return `shadowed by ${row.shadowedBy ? `${row.shadowedBy.scope} ${row.shadowedBy.path}` : 'another definition'}`;
  }
  if (row.status.kind === 'ambiguous') return 'ambiguous duplicate';

  return row.overridesBuiltIn ? 'overrides the built-in' : 'runs';
};

export const buildMarkdownReport = (analysis: FleetAnalysis): string => {
  const { columns, verdict, summary } = analysis;
  const lines: string[] = [
    '# Subagent model audit',
    '',
    `**Verdict:** ${verdict.text}`,
    '',
    `Compared ${columns.beforeLabel} with ${columns.afterLabel}. ${summary.moved} of ${analysis.agentCount} agents change: ${summary.movesUp} move up a tier, ${summary.movesDown} move down, and ${summary.unchanged} are unchanged.`,
    '',
    '## Assumptions',
    '',
    ...analysis.assumptions.map((assumption) => `- ${assumption}`),
    '',
    '## Agents',
    '',
    `| Agent | Scope | Declares | ${columns.beforeLabel} | ${columns.afterLabel} | Change |`,
    '| --- | --- | --- | --- | --- | --- |',
    ...analysis.rows.map(
      (row) =>
        `| ${escapeMarkdownCell(row.name)} | ${escapeMarkdownCell(row.scopeLabel)} | ${escapeMarkdownCell(row.declares)} | ${show(row.before)} | ${show(row.after)} | ${escapeMarkdownCell(changeText(row))} |`,
    ),
    '',
    '## Suggested edits',
    '',
  ];

  const changed = analysis.rows.filter((row) => row.changed && row.status.kind !== 'shadowed');

  if (changed.length === 0) {
    lines.push('No agent changes, so there is nothing to edit.');
  } else {
    for (const row of changed) {
      const fix = suggestFix(row, analysis);
      lines.push(
        `- ${escapeMarkdownCell(row.name)}: ${fix.editInstruction.replace(/[\r\n]+/g, ' ')}`,
      );
    }
    lines.push(
      '',
      'Each edit pins the model the agent ran on before. Pick a different model in the tool if you want something else.',
    );
  }

  lines.push(
    '',
    `Rules last verified ${rulesVerifiedOn} against Claude Code up to the changelog’s latest entry. Run \`/tasks\` to see the model a subagent actually used.`,
    '',
  );

  return lines.join('\n');
};

/**
 * Quotes a CSV field when it needs it. A field that starts with `=`, `+`, `-`,
 * or `@` could run as a formula when the file opens in a spreadsheet, and agent
 * names are untrusted, so those get a leading apostrophe.
 */
export const csvField = (value: string): string => {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const buildCsv = (analysis: FleetAnalysis): string => {
  const header = [
    'agent',
    'scope',
    'declares',
    `resolves ${formatVersion(analysis.columns.before)}`,
    `resolves ${formatVersion(analysis.columns.after)}`,
    'change',
    'status',
    'path',
  ];

  const rows = analysis.rows.map((row) => [
    row.name,
    row.scopeLabel,
    row.declares,
    show(row.before),
    show(row.after),
    changeText(row),
    statusText(row),
    row.definition?.path ?? '',
  ]);

  return [header, ...rows].map((fields) => fields.map(csvField).join(',')).join('\r\n') + '\r\n';
};
