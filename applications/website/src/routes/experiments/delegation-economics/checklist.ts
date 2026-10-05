import type { Evaluation } from './economics';
import { formatMinutes, formatMultiplier } from './display';

/** The course outline's “When not to delegate” list. */
export type ChecklistId = 'smaller' | 'changing' | 'interface' | 'integration' | 'no-test';

/** Every item but the integration one, which the page checks from the numbers. */
export type ManualChecklistId = Exclude<ChecklistId, 'integration'>;

export type Checks = Record<ManualChecklistId, boolean>;

export const noChecks: Checks = {
  smaller: false,
  changing: false,
  interface: false,
  'no-test': false,
};

export type ChecklistItem = {
  id: ChecklistId;
  label: string;
  /** The verdict line when this item is checked. */
  verdict: (evaluation: Evaluation) => string;
};

export const checklistItems: readonly ChecklistItem[] = [
  {
    id: 'smaller',
    label: 'The task is smaller than the handoff.',
    verdict: () =>
      'Don’t fan out: the task is smaller than the handoff. Writing the brief and reading the report costs more than doing it yourself.',
  },
  {
    id: 'changing',
    label: 'Every worker needs the same changing context.',
    verdict: () =>
      'Don’t fan out yet: every worker needs the same changing context. Each one would work from a copy that goes stale, so keep it in one session until it settles.',
  },
  {
    id: 'interface',
    label: 'The shared interface is unresolved.',
    verdict: () =>
      'Don’t fan out yet: resolve the shared interface first. Otherwise workers implement against an imagined contract and the coordinator rewrites everything.',
  },
  {
    id: 'integration',
    label: 'Integration costs exceed parallel savings.',
    verdict: (evaluation) =>
      `Don’t fan out: integration eats the parallel savings. ${evaluation.workers} workers take ${formatMinutes(evaluation.fanMinutes)} against ${formatMinutes(evaluation.soloMinutes)} solo.`,
  },
  {
    id: 'no-test',
    label: 'There is no independent acceptance test.',
    verdict: () =>
      'Don’t fan out yet: there’s no independent acceptance test. Write one first, so you can tell which results to accept.',
  },
];

export const isChecked = (id: ChecklistId, checks: Checks, evaluation: Evaluation): boolean =>
  id === 'integration' ? evaluation.integrationExceedsSavings : checks[id];

export type Verdict = {
  /** Whether anything on the checklist says not to fan out. */
  blocked: boolean;
  headline: string;
  /** One line for every checked item, in the checklist's order. */
  reasons: string[];
};

/** Any checked item blocks the fan-out, whatever the numbers say. */
export const verdict = (checks: Checks, evaluation: Evaluation): Verdict => {
  const reasons = checklistItems
    .filter((item) => isChecked(item.id, checks, evaluation))
    .map((item) => item.verdict(evaluation));

  if (reasons.length > 0) return { blocked: true, headline: reasons[0], reasons };

  if (evaluation.workers === 1) {
    return {
      blocked: false,
      headline: 'One worker is the solo session, so there’s nothing to fan out.',
      reasons: [],
    };
  }

  const speedup = evaluation.speedup === null ? null : formatMultiplier(evaluation.speedup);
  const cost =
    evaluation.costMultiplier === null ? null : formatMultiplier(evaluation.costMultiplier);
  const trade = speedup && cost ? ` Fanning out is ${speedup} faster for ${cost} the cost.` : '';

  return {
    blocked: false,
    headline: evaluation.warning
      ? `Nothing on the checklist rules it out, but the numbers are thin.${trade}`
      : `Nothing on the checklist rules it out.${trade}`,
    reasons: [],
  };
};
