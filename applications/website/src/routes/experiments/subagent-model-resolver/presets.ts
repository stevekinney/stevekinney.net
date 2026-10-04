import type { ResolverConfiguration } from './resolve';
import { defaultVersion, v } from './versions';

export type Preset = {
  id: string;
  label: string;
  /** Explains what the scenario shows. */
  notice: string;
  configuration: ResolverConfiguration;
};

export const baseConfiguration: ResolverConfiguration = {
  kind: 'custom',
  definitionModel: 'unset',
  invocationModel: 'unset',
  environmentModel: 'unset',
  force: false,
  mainModel: 'sonnet',
  providerGroup: 'capped',
  version: defaultVersion,
  resumed: false,
};

/** The notice that replaces a preset's once any control changes. */
export const customScenarioNotice =
  'Custom scenario — pick a preset to get back to a worked example.';

export const presets: Preset[] = [
  {
    id: 'classic-trap',
    label: 'The classic trap',
    notice:
      'Until 2.1.251, the environment variable won and the agent quietly ran on Haiku. From 2.1.251 on, the definition wins. It is the same file with the opposite answer, and there is no warning either way.',
    configuration: {
      ...baseConfiguration,
      definitionModel: 'opus',
      environmentModel: 'haiku',
      mainModel: 'sonnet',
      version: v(278),
    },
  },
  {
    id: 'force-too-early',
    label: 'FORCE set too early',
    notice:
      'The flag doesn’t exist until 2.1.257. That leaves a six-version window where it is set, silently does nothing, and the agent runs on Opus while you believe Haiku is pinned.',
    configuration: {
      ...baseConfiguration,
      definitionModel: 'opus',
      environmentModel: 'haiku',
      force: true,
      mainModel: 'sonnet',
      version: v(254),
    },
  },
  {
    id: 'explore-cap',
    label: 'Explore’s Opus cap',
    notice:
      'Explore ignores the env var and inherits the session model. On a subscription, a Console account, or an LLM gateway, it is capped at Opus, so a Fable session still explores on Opus. Switching to the uncapped provider group removes the cap.',
    configuration: {
      ...baseConfiguration,
      kind: 'explore',
      environmentModel: 'haiku',
      mainModel: 'fable',
      version: v(278),
    },
  },
  {
    id: 'inherit-meaning',
    label: 'When inherit meant something else',
    notice:
      'Today `inherit` is the same as leaving the variable unset. Before 2.1.196 it forced the main model.',
    configuration: {
      ...baseConfiguration,
      definitionModel: 'opus',
      environmentModel: 'inherit',
      mainModel: 'sonnet',
      version: v(194),
    },
  },
  {
    id: 'no-surprises',
    label: 'A setup with no surprises',
    notice:
      'There is one source of truth, so the strip is a single color and no version boundary can change the answer.',
    configuration: {
      ...baseConfiguration,
      definitionModel: 'sonnet',
      mainModel: 'opus',
      version: v(278),
    },
  },
];

export const findPreset = (id: string | null): Preset | undefined =>
  presets.find((preset) => preset.id === id);

export const configurationsEqual = (
  first: ResolverConfiguration,
  second: ResolverConfiguration,
): boolean =>
  first.kind === second.kind &&
  first.definitionModel === second.definitionModel &&
  first.invocationModel === second.invocationModel &&
  first.environmentModel === second.environmentModel &&
  first.force === second.force &&
  first.mainModel === second.mainModel &&
  first.providerGroup === second.providerGroup &&
  first.resumed === second.resumed &&
  first.version.major === second.version.major &&
  first.version.minor === second.version.minor &&
  first.version.patch === second.version.patch;
