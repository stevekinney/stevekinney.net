import { families, unrecognized } from './models';
import type { ModelSetting, ModelValue } from './models';
import type { ProviderGroup, ResolverConfiguration, SubagentKind } from './resolve';
import { subagentKinds } from './resolve';
import { defaultRange, formatVersion, isValidRange, parseVersion } from './versions';
import type { VersionRange } from './versions';

export type SharedState = {
  configuration: ResolverConfiguration;
  presetId: string | null;
  range: VersionRange;
};

const modelValues: string[] = [...families, unrecognized];

const readSetting = (
  value: string | null,
  allowed: 'invocation' | 'definition',
  fallback: ModelSetting,
): ModelSetting => {
  if (value === null) return fallback;
  if (value === 'unset') return 'unset';
  if (value === 'inherit') return allowed === 'definition' ? 'inherit' : fallback;

  return modelValues.includes(value) ? (value as ModelValue) : fallback;
};

/**
 * Writes the resolver's configuration, and nothing else, as `key=value` pairs for the URL's hash, which never reaches a server.
 * Uploaded and pasted content never goes in a link.
 */
export const encodeConfiguration = ({ configuration, presetId, range }: SharedState): string => {
  const parameters = new URLSearchParams({
    kind: configuration.kind,
    definition: configuration.definitionModel,
    invocation: configuration.invocationModel,
    environment: configuration.environmentModel,
    force: configuration.force ? '1' : '0',
    main: configuration.mainModel,
    provider: configuration.providerGroup,
    version: formatVersion(configuration.version),
    resumed: configuration.resumed ? '1' : '0',
  });

  if (presetId) parameters.set('preset', presetId);
  if (formatVersion(range.first) !== formatVersion(defaultRange.first)) {
    parameters.set('from', formatVersion(range.first));
  }
  if (formatVersion(range.last) !== formatVersion(defaultRange.last)) {
    parameters.set('to', formatVersion(range.last));
  }

  return parameters.toString();
};

/** Reads a shared configuration back, ignoring anything that isn't valid. */
export const decodeConfiguration = (query: string, fallback: SharedState): SharedState | null => {
  const parameters = new URLSearchParams(query);
  if (!parameters.has('kind') && !parameters.has('version')) return null;

  const base = fallback.configuration;
  const kind = parameters.get('kind');
  const provider = parameters.get('provider');
  const main = parameters.get('main');
  const version = parseVersion(parameters.get('version') ?? '');
  const first = parseVersion(parameters.get('from') ?? '');
  const last = parseVersion(parameters.get('to') ?? '');
  const range: VersionRange =
    first && last && isValidRange({ first, last }) ? { first, last } : fallback.range;

  return {
    configuration: {
      kind: subagentKinds.some((entry) => entry.value === kind)
        ? (kind as SubagentKind)
        : base.kind,
      definitionModel: readSetting(
        parameters.get('definition'),
        'definition',
        base.definitionModel,
      ),
      invocationModel: readSetting(
        parameters.get('invocation'),
        'invocation',
        base.invocationModel,
      ),
      environmentModel: readSetting(
        parameters.get('environment'),
        'definition',
        base.environmentModel,
      ),
      force: parameters.has('force') ? parameters.get('force') === '1' : base.force,
      mainModel:
        main !== null && modelValues.includes(main) ? (main as ModelValue) : base.mainModel,
      providerGroup:
        provider === 'capped' || provider === 'uncapped'
          ? (provider as ProviderGroup)
          : base.providerGroup,
      version: version ?? base.version,
      resumed: parameters.has('resumed') ? parameters.get('resumed') === '1' : base.resumed,
    },
    presetId: parameters.get('preset') ?? null,
    range,
  };
};
