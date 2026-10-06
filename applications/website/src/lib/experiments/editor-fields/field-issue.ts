/**
 * Something to say about one field: an error the tool rejects, a warning it
 * accepts but probably shouldn't, or a tip toward a better value.
 */
export type FieldIssue = {
  severity: 'error' | 'warning' | 'tip';
  message: string;
};

export const hasFieldError = (issues: readonly FieldIssue[]): boolean =>
  issues.some((issue) => issue.severity === 'error');
