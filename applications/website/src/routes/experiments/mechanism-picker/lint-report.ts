import { summarize } from './lint';
import type { LintItem } from './lint';
import { classificationLabels } from './lint-rules';

/** Escapes text from a file so it can't break out of a Markdown table cell or format itself. */
export const escapeMarkdownCell = (text: string): string =>
  text.replace(/\r?\n/g, ' ').replace(/[\\`*_{}[\]<>#|&!~]/g, (character) => `\\${character}`);

/** Suggestions hold `code` on purpose. Only pipes and line breaks need escaping there. */
const escapeOwnCell = (text: string): string => text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');

/** The linter's report as Markdown, ready to paste into a pull request description. */
export const buildLintReport = (items: readonly LintItem[], fileName: string | null): string => {
  const lines = [
    `## Instructions lint${fileName ? `: ${escapeMarkdownCell(fileName)}` : ''}`,
    '',
    summarize(items),
    '',
  ];

  if (items.length === 0) {
    lines.push('There were no lines to classify, only headings, code blocks, or blank lines.', '');
  } else {
    lines.push(
      '| Line | Text | Classification | Suggestion | Rule that fired |',
      '| --- | --- | --- | --- | --- |',
      ...items.map((item) => {
        const secondary = item.matches
          .slice(1)
          .map((match) => classificationLabels[match.classification].toLowerCase());
        const classification = `**${classificationLabels[item.primary]}**${
          secondary.length > 0 ? ` (also ${secondary.join(', ')})` : ''
        }`;

        return `| ${item.lineNumber} | ${escapeMarkdownCell(item.text)} | ${classification} | ${escapeOwnCell(item.suggestion)} | ${escapeMarkdownCell(item.rule)} |`;
      }),
      '',
    );
  }

  lines.push(
    'Classifications and suggestions are heuristics from the course outline, not tool behavior. A rule in an instructions file can only ask; a permission rule, a hook, a required check, or the OS can refuse.',
    '',
  );

  return lines.join('\n');
};
