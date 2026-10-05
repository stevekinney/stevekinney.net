import { MODEL_ID_PATTERN, readPrice } from './pricing';
import type { WorkerModel } from './pricing';
import { clampTo, ranges } from './scenario';
import type { NumericField, Scenario } from './scenario';

/**
 * The scenario as `key=value` pairs for the URL's hash, which never reaches a
 * server. It holds the controls and nothing from an imported transcript.
 */
export type SharedScenario = {
  scenario: Partial<Scenario>;
  /** The selected model's prices when they differ from the shared table, so the link reproduces the numbers. */
  customModel: WorkerModel | null;
};

const keys: [string, NumericField][] = [
  ['minutes', 'soloMinutes'],
  ['serial', 'serialFraction'],
  ['workers', 'workers'],
  ['integration', 'integrationMinutes'],
  ['spawn', 'spawnTokens'],
  ['shared', 'sharedTokens'],
  ['unique', 'uniqueTokens'],
  ['output', 'outputTokens'],
  ['report', 'reportTokens'],
  ['team', 'teamMultiplier'],
  ['plan', 'planMultiplier'],
];

const decimal = (value: string | null): number | null => {
  if (value === null || !/^(\d+(\.\d+)?|\.\d+)$/.test(value)) return null;

  return Number(value);
};

export const encodeScenario = (
  scenario: Scenario,
  models: readonly WorkerModel[],
  standardModels: readonly WorkerModel[],
): string => {
  const parameters = new URLSearchParams();

  for (const [key, field] of keys) parameters.set(key, String(scenario[field]));
  parameters.set('mode', scenario.mode);
  parameters.set('prefix', scenario.sharedPrefix ? '1' : '0');
  parameters.set('model', scenario.modelId);

  const selected = models.find((model) => model.id === scenario.modelId);
  const standard = standardModels.find((model) => model.id === scenario.modelId);

  if (
    selected &&
    (!standard ||
      standard.name !== selected.name ||
      standard.input !== selected.input ||
      standard.cachedInput !== selected.cachedInput ||
      standard.output !== selected.output)
  ) {
    parameters.set('name', selected.name);
    parameters.set('inputPrice', String(selected.input));
    parameters.set('cachedPrice', String(selected.cachedInput));
    parameters.set('outputPrice', String(selected.output));
  }

  return parameters.toString();
};

/** Reads a shared scenario back, keeping only what's valid. Returns null when nothing in it applies. */
export const decodeScenario = (query: string): SharedScenario | null => {
  const parameters = new URLSearchParams(query);
  const scenario: Partial<Scenario> = {};

  for (const [key, field] of keys) {
    const value = decimal(parameters.get(key));
    if (value === null) continue;

    const clamped = clampTo(ranges[field], value);
    scenario[field] = field === 'workers' ? Math.round(clamped) : clamped;
  }

  const mode = parameters.get('mode');
  if (mode === 'subagents' || mode === 'team' || mode === 'plan') scenario.mode = mode;

  const prefix = parameters.get('prefix');
  if (prefix === '1' || prefix === '0') scenario.sharedPrefix = prefix === '1';

  const model = parameters.get('model');
  if (model !== null && MODEL_ID_PATTERN.test(model)) scenario.modelId = model;

  const name = parameters.get('name')?.trim().slice(0, 60);
  // A link is untrusted input, so its prices get the same bounds as an imported price table.
  const input = readPrice(decimal(parameters.get('inputPrice')));
  const cachedInput = readPrice(decimal(parameters.get('cachedPrice')));
  const output = readPrice(decimal(parameters.get('outputPrice')));
  const customModel: WorkerModel | null =
    scenario.modelId && name && input && cachedInput && output
      ? { id: scenario.modelId, name, input, cachedInput, output }
      : null;

  return Object.keys(scenario).length === 0 ? null : { scenario, customModel };
};
