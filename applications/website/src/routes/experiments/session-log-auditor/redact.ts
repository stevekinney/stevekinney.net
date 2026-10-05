/**
 * Masks home directories and common secret shapes before anything leaves the
 * page as a digest. The rules run in order, specific shapes first, so a
 * GitHub token is reported as one instead of as a long base64 run.
 */

export type RedactionKind =
  | 'GitHub token'
  | 'GitHub fine-grained token'
  | 'API key (sk-)'
  | 'Slack token'
  | 'AWS access key'
  | 'Bearer token'
  | 'Home directory'
  | 'Long base64 run';

type RedactionRule = { kind: RedactionKind; pattern: RegExp; replace: (match: string) => string };

const masked = (label: string): string => `[redacted ${label}]`;

const RULES: RedactionRule[] = [
  {
    kind: 'GitHub fine-grained token',
    pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}/g,
    replace: () => masked('github_pat_'),
  },
  {
    kind: 'GitHub token',
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}/g,
    replace: (match) => masked(`${match.slice(0, 4)}`),
  },
  {
    kind: 'API key (sk-)',
    pattern: /\bsk-[A-Za-z0-9_-]{16,}/g,
    replace: () => masked('sk-'),
  },
  {
    kind: 'Slack token',
    pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g,
    replace: (match) => masked(match.slice(0, 5)),
  },
  {
    kind: 'AWS access key',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    replace: () => masked('AWS key'),
  },
  {
    kind: 'Bearer token',
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    replace: () => `Bearer ${masked('token')}`,
  },
  {
    kind: 'Home directory',
    pattern: /(?:\/Users|\/home)\/[^/\s'"`:]+|\b[A-Za-z]:\\Users\\[^\\\s'"`]+/g,
    replace: () => '~',
  },
  {
    // Forty or more base64 characters with at least one digit and one letter, such as a secret key.
    kind: 'Long base64 run',
    pattern:
      /(?<![A-Za-z0-9+/])(?=[A-Za-z0-9+/]*\d)(?=[A-Za-z0-9+/]*[A-Za-z])[A-Za-z0-9+/]{40,}={0,2}/g,
    replace: () => masked('base64'),
  },
];

export type RedactionFinding = {
  kind: RedactionKind;
  /** What replaced it. The secret itself is never kept. */
  replacement: string;
  count: number;
};

export type Redaction = { text: string; findings: RedactionFinding[] };

/** Masks every rule's matches in `text`, and counts what was masked. */
export const redact = (text: string): Redaction => {
  const findings = new Map<string, RedactionFinding>();
  let result = text;

  for (const rule of RULES) {
    result = result.replace(rule.pattern, (match) => {
      const replacement = rule.replace(match);
      const key = `${rule.kind}\u0000${replacement}`;
      const finding = findings.get(key) ?? { kind: rule.kind, replacement, count: 0 };
      finding.count += 1;
      findings.set(key, finding);

      return replacement;
    });
  }

  return { text: result, findings: [...findings.values()] };
};

/** Adds up findings from several redactions. */
export const mergeFindings = (groups: readonly RedactionFinding[][]): RedactionFinding[] => {
  const merged = new Map<string, RedactionFinding>();

  for (const finding of groups.flat()) {
    const key = `${finding.kind}\u0000${finding.replacement}`;
    const existing = merged.get(key);
    if (existing) existing.count += finding.count;
    else merged.set(key, { ...finding });
  }

  return [...merged.values()].sort((first, second) => second.count - first.count);
};
