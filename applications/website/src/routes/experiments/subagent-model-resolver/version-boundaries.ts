import { v } from './versions';
import type { Version } from './versions';

/**
 * The releases where a rule changed. The resolver reads its thresholds from
 * here, so when Claude Code changes again, this file and `resolve.ts` are the
 * only places to touch.
 */
export const thresholds = {
  /** Env `inherit` stopped forcing the main model. Docs only. */
  environmentInheritIsUnset: v(196),
  /** Built-in Explore began inheriting the main model, capped at Opus. */
  exploreInherits: v(198),
  /** Resuming a subagent keeps its per-invocation model. */
  resumeKeepsInvocationModel: v(211),
  /** Forking became on by default. */
  forkingByDefault: v(232),
  /** The reversal: the env var became a default instead of an override. */
  reversal: v(251),
  /** `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` arrived. */
  force: v(257),
  /** Explore inherits an unrecognized model ID instead of switching to Opus. */
  exploreInheritsUnrecognized: v(284),
} as const satisfies Record<string, Version>;

/** Where a rule was verified: the changelog, the documentation, or both. */
export type BoundarySource = 'docs only' | 'changelog' | 'changelog + docs';

export type VersionBoundary = {
  version: Version;
  /** The full description, shown in the table. */
  change: string;
  /** A few words, shown beside a flip in the strip's list. */
  shortNote: string;
  source: BoundarySource;
  /** Whether `resolve` branches on this release. The others are informational. */
  changesResolution: boolean;
  /** The one the whole tool is about. */
  isReversal?: boolean;
};

export const versionBoundaries: VersionBoundary[] = [
  {
    version: thresholds.environmentInheritIsUnset,
    change:
      'Setting the env var to `inherit` became equivalent to leaving it unset. Before this release, `inherit` forced subagents onto the main model and ignored every other source.',
    shortNote: 'env var inherit stopped forcing the main model',
    source: 'docs only',
    changesResolution: true,
  },
  {
    version: thresholds.exploreInherits,
    change:
      'Built-in Explore began inheriting the main model, capped at Opus, instead of always running on Haiku. Subagents also began inheriting the session’s extended-thinking setting.',
    shortNote: 'Explore inherits the main model, capped at Opus',
    source: 'changelog + docs',
    changesResolution: true,
  },
  {
    version: thresholds.resumeKeepsInvocationModel,
    change:
      'Resuming a subagent, or sending it a follow-up, keeps its per-invocation model. Before this release, it reverted to the definition’s `model` field or the main model. (The changelog says “the parent’s model.”)',
    shortNote: 'a resumed subagent keeps its per-invocation model',
    source: 'changelog + docs',
    changesResolution: true,
  },
  {
    version: v(222),
    change:
      'A blocked family alias resolves to the newest permitted version of that family. Before this release, it fell back to the inherited model.',
    shortNote: 'blocked aliases step down to an allowed version',
    source: 'changelog + docs',
    changesResolution: false,
  },
  {
    version: v(223),
    change:
      'A warning appears when a requested subagent model is restricted and the parent model runs instead.',
    shortNote: 'a restricted model now warns',
    source: 'changelog',
    changesResolution: false,
  },
  {
    version: thresholds.forkingByDefault,
    change:
      'Subagent forking became on by default: a fork inherits the full conversation and prompt cache.',
    shortNote: 'forking is on by default',
    source: 'changelog',
    changesResolution: true,
  },
  {
    version: v(243),
    change:
      'The `/tasks` command names the model, and the effort level, on each subagent row. This was the first way to observe the resolved model directly. The docs say 2.1.242, but the changelog has no 2.1.242 entry.',
    shortNote: '/tasks shows each subagent’s model',
    source: 'changelog',
    changesResolution: false,
  },
  {
    version: thresholds.reversal,
    change:
      'The reversal. The env var went from overriding everything to setting a default. The definition’s `model:` and an explicit per-spawn model now win over it.',
    shortNote: 'the env var stopped overriding the definition',
    source: 'changelog + docs',
    changesResolution: true,
    isReversal: true,
  },
  {
    version: thresholds.force,
    change:
      '`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` arrived. It applies the env model, or the main model, to every subagent and ignores per-spawn and definition models. The exemptions for forks and `model: inherit` skills come from the docs.',
    shortNote: 'FORCE arrived',
    source: 'changelog + docs',
    changesResolution: true,
  },
  {
    version: thresholds.exploreInheritsUnrecognized,
    change:
      'Explore stopped switching to Opus when the session runs an unrecognized model ID. It now inherits that model.',
    shortNote: 'Explore keeps an unrecognized model instead of switching to Opus',
    source: 'changelog',
    changesResolution: true,
  },
];

/** The boundary at exactly this version, if any. */
export const boundaryAt = (version: Version): VersionBoundary | undefined =>
  versionBoundaries.find(
    (boundary) =>
      boundary.version.major === version.major &&
      boundary.version.minor === version.minor &&
      boundary.version.patch === version.patch,
  );

/** The date the rules above were last checked against the changelog and the docs. */
export const rulesVerifiedOn = '2026-10-04';
