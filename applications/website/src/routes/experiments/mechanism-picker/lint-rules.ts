import type { RungId } from './ladder';

/**
 * The linter's heuristics, as data. Every word list is matched
 * case-insensitively as a whole word or phrase.
 */
export const classifications = [
  'must-hold',
  'deterministic',
  'stale-prone',
  'skill-candidate',
  'vague',
  'pointer',
  'good-fact',
] as const;

export type RuleClassification = (typeof classifications)[number];

/** What a line can come out as: a rule's classification, or one of the two fallbacks. */
export type Classification = RuleClassification | 'unknown' | 'no-match';

export const classificationLabels: Record<Classification, string> = {
  'must-hold': 'Must hold every time',
  deterministic: 'Deterministic',
  'stale-prone': 'Stale-prone',
  'skill-candidate': 'Skill candidate',
  vague: 'Doesn’t change a decision',
  pointer: 'Pointer',
  'good-fact': 'Good operational fact',
  unknown: 'Unknown',
  'no-match': 'No rule matched',
};

/** A group of tool-shaped words, and the rung a prohibition about them needs. */
export type ObjectGroup = { label: string; rung: RungId; words: string[] };

export type LintRules = {
  mustHold: { enabled: boolean; absolutes: string[]; objects: ObjectGroup[] };
  deterministic: { enabled: boolean; tools: string[]; frequencies: string[] };
  staleProne: { enabled: boolean; phrases: string[]; branchPrefixes: string[] };
  skillCandidate: { enabled: boolean; cues: string[]; longerThan: number };
  vague: { enabled: boolean; words: string[] };
  pointer: { enabled: boolean; words: string[] };
  goodFact: { enabled: boolean; triggers: string[] };
};

export const defaultRules: LintRules = {
  mustHold: {
    enabled: true,
    absolutes: [
      'never',
      'do not',
      'don’t',
      "don't",
      'must not',
      'mustn’t',
      "mustn't",
      'may not',
      'under no circumstances',
      'forbidden',
      'prohibited',
    ],
    objects: [
      {
        label: 'files',
        rung: 'permission',
        words: [
          '.env',
          'file',
          'files',
          'folder',
          'folders',
          'directory',
          'directories',
          'read',
          'edit',
          'write',
          'modify',
          'migration',
          'migrations',
          'lockfile',
        ],
      },
      {
        label: 'commands',
        rung: 'permission',
        words: [
          'command',
          'commands',
          'run',
          'execute',
          'rm',
          'delete',
          'install',
          'npm',
          'pnpm',
          'yarn',
          'sudo',
          'curl',
        ],
      },
      {
        label: 'branches',
        rung: 'ci',
        words: ['branch', 'branches', 'main', 'master', 'push', 'force-push', 'merge', 'commit'],
      },
      {
        label: 'network and credentials',
        rung: 'sandbox',
        words: [
          'network',
          'internet',
          'production',
          'prod',
          'database',
          'credentials',
          'secrets',
          'secret',
          'token',
          'tokens',
          'deploy',
        ],
      },
    ],
  },
  deterministic: {
    enabled: true,
    tools: [
      'format',
      'formatting',
      'formatter',
      'prettier',
      'lint',
      'linting',
      'linter',
      'eslint',
      'biome',
      'black',
      'ruff',
      'rustfmt',
      'gofmt',
    ],
    frequencies: [
      'every edit',
      'each edit',
      'after every',
      'after each',
      'every change',
      'every file',
      'every time',
      'each time',
      'on save',
      'after editing',
      'always',
    ],
  },
  staleProne: {
    enabled: true,
    phrases: [
      'current branch',
      'branch is',
      'currently',
      'right now',
      'as of',
      'this week',
      'this sprint',
      'today',
      'latest commit',
    ],
    branchPrefixes: ['feature/', 'feat/', 'fix/', 'bugfix/', 'hotfix/', 'release/', 'chore/'],
  },
  skillCandidate: {
    enabled: true,
    cues: ['how to', 'to investigate', 'steps to', 'step by step', 'procedure', 'runbook'],
    longerThan: 5,
  },
  vague: {
    enabled: true,
    words: [
      'high quality',
      'high-quality',
      'properly',
      'best practices',
      'best practice',
      'clean',
      'cleanly',
      'good',
      'well-written',
      'robust',
      'maintainable',
      'readable',
      'elegant',
      'appropriate',
      'appropriately',
      'carefully',
      'correctly',
      'idiomatic',
    ],
  },
  pointer: {
    enabled: true,
    words: ['documentation', 'docs', 'readme', 'wiki', 'handbook', 'guide'],
  },
  goodFact: {
    enabled: true,
    triggers: ['after', 'before', 'when', 'whenever', 'if', 'once', 'while', 'until'],
  },
};
