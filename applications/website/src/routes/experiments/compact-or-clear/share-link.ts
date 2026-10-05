import { clampLaterAfter, clampTo, defaultScenario, ranges } from './scenario';
import type { Scenario } from './scenario';
import { defaultModels, readPrice } from './pricing';
import type { ModelPrice } from './pricing';

/**
 * The scenario as `key=value` pairs for the URL's hash, which never reaches a
 * server. It holds the controls and nothing from an imported session.
 */
export type SharedScenario = {
  scenario: Partial<Scenario>;
  /** Prices for the selected model when they differ from the defaults, so the link reproduces the numbers. */
  customModel: ModelPrice | null;
};

const MODEL_ID = /^[a-z0-9][a-z0-9-]{0,59}$/;

const wholeNumber = (value: string | null): number | null => {
  if (value === null || !/^\d+$/.test(value)) return null;

  return Number(value);
};

const decimal = (value: string | null): number | null => {
  if (value === null || !/^(\d+(\.\d+)?|\.\d+)$/.test(value)) return null;

  return Number(value);
};

export const encodeScenario = (scenario: Scenario, models: readonly ModelPrice[]): string => {
  const parameters = new URLSearchParams({
    model: scenario.modelId,
    ttl: scenario.ttl,
    cache: scenario.warm ? 'warm' : 'cold',
    context: String(scenario.contextNow),
    summary: String(scenario.summaryPercent),
    reread: String(scenario.reread),
    input: String(scenario.inputPerTurn),
    output: String(scenario.outputPerTurn),
    turns: String(scenario.turns),
  });

  if (scenario.baseline !== defaultScenario.baseline) {
    parameters.set('baseline', String(scenario.baseline));
  }
  if (scenario.charsPerToken !== defaultScenario.charsPerToken) {
    parameters.set('characters', String(scenario.charsPerToken));
  }
  if (scenario.laterEnabled) parameters.set('later', String(scenario.laterAfter));

  const selected = models.find((model) => model.id === scenario.modelId);
  const standard = defaultModels.find((model) => model.id === scenario.modelId);

  if (
    selected &&
    (!standard ||
      standard.input !== selected.input ||
      standard.output !== selected.output ||
      standard.name !== selected.name)
  ) {
    parameters.set('name', selected.name);
    parameters.set('inputPrice', String(selected.input));
    parameters.set('outputPrice', String(selected.output));
  }

  return parameters.toString();
};

/** Reads a shared scenario back, keeping only what's valid. Returns null when nothing in it applies. */
export const decodeScenario = (query: string): SharedScenario | null => {
  const parameters = new URLSearchParams(query);
  const scenario: Partial<Scenario> = {};

  const model = parameters.get('model');
  if (model !== null && MODEL_ID.test(model)) scenario.modelId = model;

  const ttl = parameters.get('ttl');
  if (ttl === '5m' || ttl === '1h') scenario.ttl = ttl;

  const cache = parameters.get('cache');
  if (cache === 'warm' || cache === 'cold') scenario.warm = cache === 'warm';

  const numbers: [
    string,
    'contextNow' | 'reread' | 'inputPerTurn' | 'outputPerTurn' | 'turns' | 'baseline',
  ][] = [
    ['context', 'contextNow'],
    ['reread', 'reread'],
    ['input', 'inputPerTurn'],
    ['output', 'outputPerTurn'],
    ['turns', 'turns'],
    ['baseline', 'baseline'],
  ];
  for (const [key, field] of numbers) {
    const value = wholeNumber(parameters.get(key));
    if (value !== null) scenario[field] = clampTo(ranges[field], value);
  }

  const summary = decimal(parameters.get('summary'));
  if (summary !== null) scenario.summaryPercent = clampTo(ranges.summaryPercent, summary);

  const characters = decimal(parameters.get('characters'));
  if (characters !== null) scenario.charsPerToken = clampTo(ranges.charsPerToken, characters);

  const later = wholeNumber(parameters.get('later'));
  if (later !== null) {
    scenario.laterEnabled = true;
    scenario.laterAfter = clampLaterAfter(later, scenario.turns ?? defaultScenario.turns);
  }

  const name = parameters.get('name')?.trim().slice(0, 60);
  // A link is untrusted input, so its prices get the same bounds as an imported price table.
  const inputPrice = readPrice(decimal(parameters.get('inputPrice')));
  const outputPrice = readPrice(decimal(parameters.get('outputPrice')));
  const customModel: ModelPrice | null =
    scenario.modelId && name && inputPrice && outputPrice
      ? { id: scenario.modelId, name, input: inputPrice, output: outputPrice }
      : null;

  return Object.keys(scenario).length === 0 ? null : { scenario, customModel };
};
