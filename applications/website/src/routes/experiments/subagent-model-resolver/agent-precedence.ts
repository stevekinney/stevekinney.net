import { pathSegments } from '$lib/experiments/settings-scope';

import { containsWorkingDirectory, scopeRank } from './scopes';
import type { AgentScope } from './scopes';

/** What the precedence rules need to know about a definition. */
export type PrecedenceCandidate = {
  id: string;
  name: string;
  scope: AgentScope;
  /** The `agents` folder it was read from, so two files in one tree can be told from two trees. */
  tree: string;
  /** The directory whose `.claude/agents` holds it, as path segments. Only for project definitions. */
  projectDirectory: string[];
};

export type PrecedenceStatus =
  | { kind: 'effective' }
  | { kind: 'shadowed'; by: string; reason: string }
  /** Loaded in an order Claude Code doesn't document, so there's no telling which one runs. */
  | { kind: 'ambiguous'; reason: string };

/**
 * Applies the documented priority when one name appears more than once:
 * managed, then the `--agents` flag, then project, then user, then plugin.
 * Among nested project directories, the one closest to the working directory
 * wins. Two files in the same tree load in filesystem order, so they stay
 * ambiguous instead of being guessed at.
 */
export const resolvePrecedence = (
  candidates: PrecedenceCandidate[],
  workingDirectory: string,
): Map<string, PrecedenceStatus> => {
  const statuses = new Map<string, PrecedenceStatus>();
  const working = pathSegments(workingDirectory);
  const byName = new Map<string, PrecedenceCandidate[]>();

  for (const candidate of candidates) {
    byName.set(candidate.name, [...(byName.get(candidate.name) ?? []), candidate]);
  }

  for (const group of byName.values()) {
    const bestRank = Math.min(...group.map((candidate) => scopeRank(candidate.scope)));
    const tier = group.filter((candidate) => scopeRank(candidate.scope) === bestRank);
    const losers = group.filter((candidate) => scopeRank(candidate.scope) !== bestRank);
    const scope = tier[0].scope;
    let anchor = tier[0];

    const treesInTier = new Set(tier.map((candidate) => candidate.tree));

    if (tier.length === 1) {
      statuses.set(anchor.id, { kind: 'effective' });
    } else if (
      scope === 'project' &&
      new Set(tier.map((c) => c.projectDirectory.join('/'))).size > 1
    ) {
      // Nested project directories: the closest one to the working directory wins.
      const eligible = tier.filter((candidate) =>
        containsWorkingDirectory(candidate.projectDirectory, working),
      );
      const deepest = Math.max(...eligible.map((candidate) => candidate.projectDirectory.length));
      const closest = eligible.filter((candidate) => candidate.projectDirectory.length === deepest);

      if (working.length === 0) {
        for (const candidate of tier) {
          statuses.set(candidate.id, {
            kind: 'ambiguous',
            reason:
              'This name is defined in more than one project directory. Enter your working directory to see which one is closest.',
          });
        }
      } else if (eligible.length === 0) {
        for (const candidate of tier) {
          statuses.set(candidate.id, {
            kind: 'ambiguous',
            reason:
              'None of the project directories that define this name contains your working directory.',
          });
        }
      } else if (closest.length === 1) {
        anchor = closest[0];
        statuses.set(anchor.id, { kind: 'effective' });
        for (const candidate of tier) {
          if (candidate.id !== anchor.id) {
            statuses.set(candidate.id, {
              kind: 'shadowed',
              by: anchor.id,
              reason: 'A project definition closer to the working directory wins.',
            });
          }
        }
      } else {
        for (const candidate of tier) {
          statuses.set(
            candidate.id,
            closest.includes(candidate)
              ? {
                  kind: 'ambiguous',
                  reason:
                    'Two files in the same agents folder share this name, and they load in filesystem order.',
                }
              : {
                  kind: 'shadowed',
                  by: closest[0].id,
                  reason: 'A project definition closer to the working directory wins.',
                },
          );
        }
        anchor = closest[0];
      }
    } else {
      for (const candidate of tier) {
        statuses.set(candidate.id, {
          kind: 'ambiguous',
          reason:
            treesInTier.size > 1
              ? `This name is defined in more than one ${scope} location, and Claude Code documents no order between them.`
              : 'Two files in the same agents folder share this name, and they load in filesystem order.',
        });
      }
    }

    for (const loser of losers) {
      statuses.set(loser.id, {
        kind: 'shadowed',
        by: anchor.id,
        reason: `A ${scope} definition outranks a ${loser.scope} one.`,
      });
    }
  }

  return statuses;
};
