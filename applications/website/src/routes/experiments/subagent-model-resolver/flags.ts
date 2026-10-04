import { flipAt } from './across-versions';
import { modelLabel } from './models';
import { isEnvironmentUsable } from './resolve';
import type { Resolution, ResolverConfiguration } from './resolve';
import { thresholds } from './version-boundaries';
import { formatVersion, isAtLeast, isBefore } from './versions';

export type AnswerFlag = {
  id: 'flips-at-reversal' | 'force-inert' | 'environment-ignored' | 'force-exempt' | 'explore-cap';
  severity: 'warning' | 'info';
  title: string;
  body: string;
};

/** The notes shown under the answer banner. */
export const describeFlags = (
  configuration: ResolverConfiguration,
  resolution: Resolution,
): AnswerFlag[] => {
  const flags: AnswerFlag[] = [];
  const { kind, version, force, environmentModel } = configuration;
  const reversal = thresholds.reversal;
  const forceActive = force && isAtLeast(version, thresholds.force);

  const previous = { ...reversal, patch: reversal.patch - 1 };
  const flip = flipAt(configuration, reversal, previous);
  if (flip) {
    const before = modelLabel(flip.from);
    const after = modelLabel(flip.to);
    const move =
      flip.direction === 'more-expensive'
        ? 'a silent move up to a more expensive tier'
        : flip.direction === 'cheaper'
          ? 'a silent move down to a cheaper tier'
          : 'a silent move to a different model';

    flags.push({
      id: 'flips-at-reversal',
      severity: 'warning',
      title: `Flips at ${formatVersion(reversal)}`,
      body: `It resolved to \`${before}\` before that release and \`${after}\` from it on. That is ${move}, with no edit to any file.`,
    });
  }

  if (force && isBefore(version, thresholds.force)) {
    flags.push({
      id: 'force-inert',
      severity: 'warning',
      title: 'FORCE is set but does nothing here',
      body: `FORCE doesn’t exist before ${formatVersion(thresholds.force)}, so ${formatVersion(version)} ignores it. Anyone who sets it expecting a pin gets whatever the other sources decide.`,
    });
  }

  if (environmentModel !== 'unset' && !forceActive && (kind === 'explore' || kind === 'plan')) {
    const suggestion =
      isEnvironmentUsable(environmentModel) && !force
        ? ` To move it, add \`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1\` (${formatVersion(thresholds.force)} or later).`
        : '';

    flags.push({
      id: 'environment-ignored',
      severity: 'warning',
      title: 'The env var does not move this subagent',
      body: `Built-in ${kind === 'explore' ? 'Explore' : 'Plan'} ignores \`CLAUDE_CODE_SUBAGENT_MODEL\` on its own.${suggestion}`,
    });
  }

  if (forceActive && (kind === 'fork' || kind === 'skill-inherit')) {
    flags.push({
      id: 'force-exempt',
      severity: 'info',
      title: 'Exempt from FORCE',
      body:
        kind === 'fork'
          ? 'FORCE doesn’t apply to a fork. It runs on the main model.'
          : 'FORCE doesn’t apply to a skill running with `model: inherit`. It runs on the main model.',
    });
  }

  if (resolution.exploreCapApplied) {
    flags.push({
      id: 'explore-cap',
      severity: 'info',
      title: 'Explore’s cap applied',
      body:
        configuration.mainModel === 'unrecognized'
          ? `Before ${formatVersion(thresholds.exploreInheritsUnrecognized)}, Explore switched to Opus when the session ran an unrecognized model ID.`
          : 'On a subscription, a Console account, or an LLM gateway, Explore never runs above Opus, even when the session does.',
    });
  }

  return flags;
};
