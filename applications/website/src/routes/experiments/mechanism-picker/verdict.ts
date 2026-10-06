import { findRung, rungs } from './ladder';
import type { Rung, RungId } from './ladder';
import type { LintItem } from './lint';

/** Whether a line is fine as a request, or needs a rung that can refuse. */
export type Verdict = { kind: 'asks' } | { kind: 'enforce'; rung: Rung };

/** A line needs enforcing when the linter points it at a rung that can refuse. */
export const verdictFor = (item: LintItem): Verdict => {
  const rung = findRung(item.rung);

  return rung?.refuses ? { kind: 'enforce', rung } : { kind: 'asks' };
};

/** The rung's place on the ladder, counting from the weakest, such as 5 for a permission rule. */
export const rungNumber = (id: RungId): number => rungs.findIndex((rung) => rung.id === id) + 1;

export type FileVerdict = {
  lines: number;
  /** Lines written as requests that should refuse, by the rung they belong on. */
  enforce: { rung: Rung; count: number }[];
  enforceTotal: number;
};

export const verdictForFile = (items: readonly LintItem[]): FileVerdict => {
  const counts = new Map<RungId, number>();
  for (const item of items) {
    const verdict = verdictFor(item);
    if (verdict.kind === 'enforce') {
      counts.set(verdict.rung.id, (counts.get(verdict.rung.id) ?? 0) + 1);
    }
  }

  const enforce = rungs
    .filter((rung) => counts.has(rung.id))
    .map((rung) => ({ rung, count: counts.get(rung.id) ?? 0 }));

  return {
    lines: items.length,
    enforce,
    enforceTotal: enforce.reduce((total, entry) => total + entry.count, 0),
  };
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/** The headline, such as "2 of 5 lines ask for something that should be enforced." */
export const headline = ({ lines, enforceTotal }: FileVerdict): string => {
  if (lines === 0) return 'There’s nothing to check yet.';
  if (enforceTotal === 0) {
    return `Nothing here needs to refuse. ${
      lines === 1 ? 'The one line can stay a request.' : `All ${lines} lines can stay as requests.`
    }`;
  }

  return `${enforceTotal} of ${plural(lines, 'line', 'lines')} ${
    enforceTotal === 1 ? 'asks' : 'ask'
  } for something that should be enforced.`;
};

const destinations: Partial<Record<RungId, string>> = {
  permission: 'a permission rule',
  hook: 'a hook',
  ci: 'a required CI check',
  sandbox: 'the OS, sandbox, or network',
};

/** Where those lines belong, such as "Move 1 to a permission rule and 1 to a hook." */
export const breakdown = ({ enforce }: FileVerdict): string | null => {
  if (enforce.length === 0) return null;

  const parts = enforce.map(
    ({ rung, count }) => `${count} to ${destinations[rung.id] ?? rung.name}`,
  );
  const list =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;

  return `Move ${list}.`;
};
