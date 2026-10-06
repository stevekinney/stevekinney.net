import { parseLenientJson } from './lenient-json';

/** What a settings file says that this tool cares about. Values are raw text. */
export type SettingsValues = {
  /** `env.CLAUDE_CODE_SUBAGENT_MODEL`. */
  environmentModel: string | null;
  /** `env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE`. */
  force: string | null;
  /** The top-level `model`, which is the main model. */
  mainModel: string | null;
  warnings: string[];
};

const asText = (value: unknown): string | null =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : null;

export const parseSettingsFile = (text: string): SettingsValues => {
  const result: SettingsValues = {
    environmentModel: null,
    force: null,
    mainModel: null,
    warnings: [],
  };

  const parsed = parseLenientJson(text);

  if (!parsed) {
    result.warnings.push('This file isn’t valid JSON, even without comments and trailing commas.');

    return result;
  }

  if (parsed.lenient) {
    result.warnings.push(
      'This file has comments or trailing commas, which Claude Code tolerates and strict JSON doesn’t.',
    );
  }

  const root = parsed.value;
  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    result.warnings.push('The top level of this file isn’t an object.');

    return result;
  }

  const settings = root as Record<string, unknown>;
  result.mainModel = asText(settings.model);

  const environment = settings.env;
  if (typeof environment === 'object' && environment !== null && !Array.isArray(environment)) {
    const variables = environment as Record<string, unknown>;
    result.environmentModel = asText(variables.CLAUDE_CODE_SUBAGENT_MODEL);
    result.force = asText(variables.CLAUDE_CODE_SUBAGENT_MODEL_FORCE);
  }

  return result;
};

/**
 * Whether a raw FORCE value counts as on. `1` and `true` do, `0`, `false`,
 * and an empty value don't, and anything else is off, with a warning.
 */
export const parseForceValue = (raw: string | null): { on: boolean; recognized: boolean } => {
  if (raw === null) return { on: false, recognized: true };

  const text = raw
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim()
    .toLowerCase();

  if (text === '1' || text === 'true') return { on: true, recognized: true };
  if (text === '' || text === '0' || text === 'false') return { on: false, recognized: true };

  return { on: false, recognized: false };
};
