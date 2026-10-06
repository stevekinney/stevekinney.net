import type { FieldIssue } from './field-issue';

/** The ids `field-shell.svelte` gives the hint and the issues it renders for a control. */
export const describedBy = (
  id: string,
  hint: string | undefined,
  issues: readonly FieldIssue[],
): string | undefined =>
  [hint ? `${id}-hint` : null, issues.length > 0 ? `${id}-issues` : null]
    .filter(Boolean)
    .join(' ') || undefined;
