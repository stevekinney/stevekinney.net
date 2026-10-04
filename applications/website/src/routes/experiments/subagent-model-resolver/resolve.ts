import { capAtOpus, modelLabel, unrecognized } from './models';
import type { ModelSetting, ModelValue } from './models';
import { thresholds } from './version-boundaries';
import { formatVersion, isAtLeast, isBefore } from './versions';
import type { Version } from './versions';

export type SubagentKind =
  'custom' | 'general-purpose' | 'explore' | 'plan' | 'fork' | 'skill-inherit';

/** Whether Explore is capped at Opus. */
export type ProviderGroup = 'capped' | 'uncapped';

export type ResolverConfiguration = {
  kind: SubagentKind;
  /** The definition's `model:` frontmatter. */
  definitionModel: ModelSetting;
  /** The model parameter passed when the subagent is spawned. Never `inherit`. */
  invocationModel: ModelSetting;
  /** `CLAUDE_CODE_SUBAGENT_MODEL`. */
  environmentModel: ModelSetting;
  /** `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`. */
  force: boolean;
  /** The main conversation's model. */
  mainModel: ModelValue;
  providerGroup: ProviderGroup;
  version: Version;
  /** Whether the subagent is being resumed, or sent a follow-up. */
  resumed: boolean;
};

/**
 * `win` is the source that decided, `dead` was outranked or ignored, `skip`
 * did not apply, and `info` is context that decided nothing.
 */
export type StepState = 'win' | 'dead' | 'skip' | 'info';

export type ResolutionStep = { text: string; state: StepState };

export type Resolution = {
  model: ModelValue;
  /** The deciding rule in one line. */
  why: string;
  steps: ResolutionStep[];
  /** Whether Explore would have run on something pricier if it were not capped at Opus. */
  exploreCapApplied: boolean;
};

export const subagentKinds: { value: SubagentKind; label: string }[] = [
  { value: 'custom', label: 'Custom agent (a definition file)' },
  { value: 'general-purpose', label: 'Built-in general-purpose' },
  { value: 'explore', label: 'Built-in Explore' },
  { value: 'plan', label: 'Built-in Plan' },
  { value: 'fork', label: 'Fork of the conversation' },
  { value: 'skill-inherit', label: 'Skill with model: inherit' },
];

/** The env var is set to something other than `inherit`. */
export const isEnvironmentUsable = (setting: ModelSetting): boolean =>
  setting !== 'unset' && setting !== 'inherit';

/**
 * The model built-in Explore runs on once it inherits. Where the provider
 * isn't capped it is the main model. Otherwise it is the main model capped at
 * Opus, except that an unrecognized ID is the main model from 2.1.284 on.
 */
export const exploreModel = (
  mainModel: ModelValue,
  providerGroup: ProviderGroup,
  version: Version,
): { model: ModelValue; capApplied: boolean } => {
  if (providerGroup === 'uncapped') return { model: mainModel, capApplied: false };

  if (mainModel === unrecognized) {
    return isBefore(version, thresholds.exploreInheritsUnrecognized)
      ? { model: 'opus', capApplied: true }
      : { model: mainModel, capApplied: false };
  }

  const capped = capAtOpus(mainModel);

  return { model: capped, capApplied: capped !== mainModel };
};

const name = (model: ModelValue): string => `\`${modelLabel(model)}\``;

const at = (version: Version): string => formatVersion(version);

export const resolve = (config: ResolverConfiguration): Resolution => {
  const { kind, version, mainModel, force, providerGroup, resumed } = config;
  const steps: ResolutionStep[] = [];
  const add = (state: StepState, text: string): void => {
    steps.push({ state, text });
  };

  const environment = config.environmentModel;
  const environmentSet = environment !== 'unset';
  const environmentUsable = isEnvironmentUsable(environment);
  const modelParameterGiven = config.invocationModel !== 'unset';
  const definitionGiven = config.definitionModel !== 'unset';

  const done = (model: ModelValue, why: string, exploreCapApplied = false): Resolution => ({
    model,
    why,
    steps,
    exploreCapApplied,
  });

  // 1. FORCE only exists from 2.1.257.
  const forceActive = force && isAtLeast(version, thresholds.force);
  if (force && !forceActive) {
    add(
      'dead',
      `FORCE is set, but this version ignores it. It doesn’t exist before ${at(thresholds.force)}.`,
    );
  }

  const builtInIgnoresModelFields = (label: string): void => {
    if (modelParameterGiven || definitionGiven) {
      add('skip', `${label} doesn’t read a definition’s \`model:\` or a per-invocation model.`);
    }
  };

  // 2. FORCE overrides everything except forks and skills that inherit.
  if (forceActive) {
    if (kind === 'fork') {
      add('win', `Fork exception under FORCE: a fork runs on the main model, ${name(mainModel)}.`);

      return done(mainModel, 'A fork is exempt from FORCE, so it runs on the main model.');
    }

    if (kind === 'skill-inherit') {
      add(
        'win',
        `Skill exception under FORCE: a skill with \`model: inherit\` runs on the main model, ${name(mainModel)}.`,
      );

      return done(mainModel, 'A skill with `model: inherit` is exempt from FORCE.');
    }

    add(
      'dead',
      'FORCE is on, so every definition’s `model:` and every per-invocation model is ignored.',
    );

    if (environment === 'inherit') {
      add('skip', 'The env var is `inherit`, which is the same as leaving it unset.');
    }

    if (environmentUsable) {
      add('win', `FORCE applies the env var’s model: ${name(environment as ModelValue)}.`);

      return done(
        environment as ModelValue,
        'FORCE applies the env var’s model to every subagent.',
      );
    }

    if (kind === 'explore') {
      const { model, capApplied } = exploreModel(mainModel, providerGroup, version);
      add(
        'win',
        capApplied
          ? `With no env model, FORCE leaves Explore on its built-in model: the main model, capped at Opus, ${name(model)}.`
          : `With no env model, FORCE leaves Explore on its built-in model: the main model, ${name(model)}.`,
      );

      return done(model, 'FORCE alone keeps Explore on its built-in model.', capApplied);
    }

    add('win', `With no env model, FORCE applies the main model: ${name(mainModel)}.`);

    return done(mainModel, 'FORCE with no env model puts every subagent on the main model.');
  }

  // 3. Built-in Explore.
  if (kind === 'explore') {
    builtInIgnoresModelFields('Built-in Explore');

    if (isBefore(version, thresholds.exploreInherits)) {
      if (environmentSet) {
        add('dead', 'The env var doesn’t move Explore.');
      }
      add(
        'win',
        `Before ${at(thresholds.exploreInherits)}, built-in Explore always ran on \`haiku\`.`,
      );

      return done(
        'haiku',
        `Before ${at(thresholds.exploreInherits)}, Explore always ran on Haiku.`,
      );
    }

    if (environmentSet) {
      add('dead', 'The env var alone doesn’t move Explore. FORCE would, but it isn’t on.');
    }

    const { model, capApplied } = exploreModel(mainModel, providerGroup, version);
    if (capApplied) {
      add(
        'win',
        mainModel === unrecognized
          ? `Explore inherits the main model, but before ${at(thresholds.exploreInheritsUnrecognized)} an unrecognized ID switched it to ${name(model)}.`
          : `Explore inherits the main model, ${name(mainModel)}, capped at Opus on this provider: ${name(model)}.`,
      );

      return done(model, 'Explore inherits the main model, capped at Opus.', true);
    }

    add('win', `Explore inherits the main model: ${name(model)}.`);

    return done(model, 'Explore inherits the main model.');
  }

  // 4. Built-in Plan.
  if (kind === 'plan') {
    builtInIgnoresModelFields('Built-in Plan');

    if (environmentSet) {
      add('dead', 'The env var doesn’t move Plan. FORCE would, but it isn’t on.');
    }
    add('win', `Plan runs on the main model: ${name(mainModel)}.`);

    return done(mainModel, 'Plan runs on the main model.');
  }

  // 5. A fork.
  if (kind === 'fork') {
    builtInIgnoresModelFields('A fork');

    if (isBefore(version, thresholds.forkingByDefault)) {
      add('info', `Forking wasn’t on by default before ${at(thresholds.forkingByDefault)}.`);
    }
    add(
      'win',
      `A fork inherits the conversation, so it runs on the main model: ${name(mainModel)}.`,
    );

    return done(mainModel, 'A fork runs on the main model.');
  }

  // 6 and 7. Definitions, the general-purpose agent, and skills that inherit.
  const definition: ModelSetting =
    kind === 'skill-inherit'
      ? 'inherit'
      : kind === 'general-purpose'
        ? 'unset'
        : config.definitionModel;
  const definitionLabel =
    kind === 'skill-inherit'
      ? 'The skill’s frontmatter'
      : kind === 'general-purpose'
        ? 'The built-in general-purpose agent'
        : 'The definition';

  const dropsInvocationModel =
    modelParameterGiven && resumed && isBefore(version, thresholds.resumeKeepsInvocationModel);
  const invocation: ModelSetting = dropsInvocationModel ? 'unset' : config.invocationModel;
  if (dropsInvocationModel) {
    add('dead', 'A resume before 2.1.211 drops the per-invocation model.');
  }

  const afterReversal = isAtLeast(version, thresholds.reversal);

  if (!afterReversal) {
    // Before the reversal the env var overrides every other source.
    if (environment === 'inherit' && isBefore(version, thresholds.environmentInheritIsUnset)) {
      add(
        'win',
        `Before ${at(thresholds.environmentInheritIsUnset)}, an env var of \`inherit\` forced the main model and ignored every other source: ${name(mainModel)}.`,
      );
      if (invocation !== 'unset') {
        add('dead', `The per-invocation model ${name(invocation as ModelValue)} is overridden.`);
      }
      if (definition !== 'unset') {
        add('dead', `${definitionLabel}’s \`model: ${definition}\` is overridden.`);
      }

      return done(
        mainModel,
        `Before ${at(thresholds.environmentInheritIsUnset)}, an env var of inherit forced the main model.`,
      );
    }

    if (environmentUsable) {
      add(
        'win',
        `Before ${at(thresholds.reversal)}, the env var overrides everything: ${name(environment as ModelValue)}.`,
      );
      if (invocation !== 'unset') {
        add('dead', `The per-invocation model ${name(invocation as ModelValue)} is overridden.`);
      } else if (!dropsInvocationModel) {
        add('skip', 'No per-invocation model.');
      }
      if (definition !== 'unset') {
        add('dead', `${definitionLabel}’s \`model: ${definition}\` is overridden.`);
      } else {
        add('skip', `${definitionLabel} has no \`model:\` line.`);
      }

      return done(
        environment as ModelValue,
        `Before ${at(thresholds.reversal)}, the env var overrides the definition and the per-invocation model.`,
      );
    }
  }

  // The ladder, in precedence order. From 2.1.251 on, the env var is the lowest source before the main model.
  type Source = {
    present: boolean;
    value: ModelValue;
    win: string;
    absent: string;
    outranked: string;
    why: string;
  };

  const sources: Source[] = [
    {
      present: invocation !== 'unset',
      value: invocation as ModelValue,
      win: `The per-invocation model wins: ${name(invocation as ModelValue)}.`,
      absent: 'No per-invocation model.',
      outranked: '',
      why: 'The per-invocation model wins.',
    },
    {
      present: definition !== 'unset',
      value: definition === 'inherit' ? mainModel : (definition as ModelValue),
      win:
        definition === 'inherit'
          ? `${definitionLabel} says \`model: inherit\`, so the main model runs: ${name(mainModel)}.`
          : `${definitionLabel}’s \`model: ${definition}\` wins.`,
      absent: `${definitionLabel} has no \`model:\` line.`,
      outranked: `${definitionLabel}’s \`model: ${definition}\` is outranked.`,
      why:
        definition === 'inherit'
          ? 'The definition says inherit, so the main model runs.'
          : 'The definition’s `model:` field wins.',
    },
  ];

  if (afterReversal) {
    sources.push({
      present: environmentUsable,
      value: environment as ModelValue,
      win: `Nothing above it is set, so the env var acts as the default: ${environmentUsable ? name(environment as ModelValue) : ''}.`,
      absent:
        environment === 'inherit'
          ? 'The env var is `inherit`, which is the same as leaving it unset.'
          : 'The env var isn’t set.',
      outranked: `The env var ${environmentUsable ? name(environment as ModelValue) : ''} is only a default since ${at(thresholds.reversal)}, so it is outranked.`,
      why: 'Nothing above the env var is set, so it acts as the default.',
    });
  } else {
    sources.push({
      present: false,
      value: mainModel,
      win: '',
      absent:
        environment === 'inherit'
          ? 'The env var is `inherit`, which is the same as leaving it unset.'
          : 'The env var isn’t set.',
      outranked: '',
      why: '',
    });
  }

  const winnerIndex = sources.findIndex((source) => source.present);

  sources.forEach((source, index) => {
    if (index === winnerIndex) add('win', source.win);
    else if (!source.present) add('skip', source.absent);
    else add('dead', source.outranked);
  });

  if (winnerIndex === -1) {
    add('win', `Nothing else is set, so the main model runs: ${name(mainModel)}.`);

    return done(mainModel, 'Nothing else is set, so the main model runs.');
  }

  add('skip', 'The main model isn’t needed.');
  const winner = sources[winnerIndex];

  return done(winner.value, winner.why);
};
