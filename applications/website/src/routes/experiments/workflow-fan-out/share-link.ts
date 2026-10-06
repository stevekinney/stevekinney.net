import {
  clampProbability,
  clampTo,
  defaultConfig,
  defaultStage,
  MAXIMUM_MANUAL_ITEMS,
  MAXIMUM_STAGES,
  ranges,
  resizeGrid,
  roundMinutes,
} from './config';
import type { StageConfig, WorkflowConfig } from './config';
import type { WorkflowModel } from './models';

/**
 * The configuration as `key=value` pairs for the URL's hash, which never
 * reaches a server. It holds the controls and any edited prices, and never a
 * pasted script.
 */
export type SharedConfiguration = {
  config: WorkflowConfig;
  /** Prices that differ from the defaults, by model ID. */
  prices: Record<string, { input: number; output: number }>;
};

const number = (value: number): string => String(Number(value.toFixed(4)));

export const encodeConfiguration = (
  config: WorkflowConfig,
  models: readonly WorkflowModel[],
  defaults: readonly WorkflowModel[],
): string => {
  const parameters = new URLSearchParams({
    items: String(config.items),
    concurrency: String(config.concurrency),
    seed: String(config.seed),
    session: config.sessionModelId,
  });

  config.stages.forEach((stage, index) => {
    const key = `s${index + 1}`;
    parameters.set(`${key}name`, stage.name);
    parameters.set(`${key}mean`, number(stage.meanMinutes));
    parameters.set(`${key}spread`, number(stage.variability));
    parameters.set(`${key}tokens`, String(stage.tokens));
    if (stage.modelId) parameters.set(`${key}model`, stage.modelId);
    if (stage.definitionModelId) parameters.set(`${key}definition`, stage.definitionModelId);
  });

  if (config.durationMode === 'manual') {
    parameters.set('grid', config.manual.map((row) => row.map(number).join(',')).join(';'));
  }
  if (config.failureProbability > 0) parameters.set('failure', number(config.failureProbability));
  if (config.validationFailureProbability > 0) {
    parameters.set('invalid', number(config.validationFailureProbability));
  }
  if (config.validationAttempts !== 5)
    parameters.set('attempts', String(config.validationAttempts));
  if (config.handling === 'filter') parameters.set('results', 'filter');
  if (config.errorHandling === 'uncaught') parameters.set('errors', 'uncaught');
  if (config.environmentModelId) parameters.set('environment', config.environmentModelId);
  if (!config.scout) parameters.set('scout', 'off');
  else if (config.scoutTokens !== defaultConfig().scoutTokens) {
    parameters.set('scout', String(config.scoutTokens));
  }
  if (config.outputPercent > 0) parameters.set('output', String(config.outputPercent));

  for (const model of models) {
    const standard = defaults.find((entry) => entry.id === model.id);
    if (standard && (standard.input !== model.input || standard.output !== model.output)) {
      parameters.set(`price-${model.id}`, `${number(model.input)}/${number(model.output)}`);
    }
  }

  return parameters.toString();
};

const wholeNumber = (value: string | null): number | null =>
  value !== null && /^\d{1,12}$/.test(value) ? Number(value) : null;

const decimal = (value: string | null): number | null =>
  value !== null && /^(\d{1,9}(\.\d{1,6})?|\.\d{1,6})$/.test(value) ? Number(value) : null;

/** A usable price per million tokens from a link: finite, at least zero, and at most $100,000. */
const price = (value: string | undefined): number | null => {
  const parsed = decimal(value ?? null);

  return parsed !== null && parsed <= 100_000 ? parsed : null;
};

/** Reads a shared configuration back, keeping only what's valid. Returns null when nothing in it applies. */
export const decodeConfiguration = (
  query: string,
  models: readonly WorkflowModel[],
): SharedConfiguration | null => {
  const parameters = new URLSearchParams(query);
  if (![...parameters.keys()].length) return null;

  const known = (id: string | null): string | null =>
    id !== null && models.some((model) => model.id === id) ? id : null;
  const config = defaultConfig();
  let applied = false;
  const read = <T>(value: T | null, apply: (value: T) => void): void => {
    if (value === null) return;
    apply(value);
    applied = true;
  };

  read(
    wholeNumber(parameters.get('items')),
    (value) => (config.items = clampTo(ranges.items, value)),
  );
  read(wholeNumber(parameters.get('concurrency')), (value) => {
    config.concurrency = clampTo(ranges.concurrency, value);
  });
  read(wholeNumber(parameters.get('seed')), (value) => (config.seed = clampTo(ranges.seed, value)));
  read(known(parameters.get('session')), (value) => (config.sessionModelId = value));
  read(known(parameters.get('environment')), (value) => (config.environmentModelId = value));

  const stages: StageConfig[] = [];
  for (let index = 0; index < MAXIMUM_STAGES; index += 1) {
    const key = `s${index + 1}`;
    if (!parameters.has(`${key}name`) && !parameters.has(`${key}mean`)) break;

    const stage = defaultStage(index);
    const name = parameters.get(`${key}name`)?.trim().slice(0, 40);
    if (name) stage.name = name;
    const mean = decimal(parameters.get(`${key}mean`));
    if (mean !== null) stage.meanMinutes = clampTo(ranges.meanMinutes, mean);
    const spread = decimal(parameters.get(`${key}spread`));
    if (spread !== null) stage.variability = clampTo(ranges.variability, spread);
    const tokens = wholeNumber(parameters.get(`${key}tokens`));
    if (tokens !== null) stage.tokens = clampTo(ranges.tokens, tokens);
    stage.modelId = known(parameters.get(`${key}model`));
    stage.definitionModelId = known(parameters.get(`${key}definition`));
    stages.push(stage);
  }
  if (stages.length > 0) {
    config.stages = stages;
    applied = true;
  }

  const grid = parameters.get('grid');
  if (grid !== null) {
    const rows = grid
      .split(';')
      .slice(0, MAXIMUM_MANUAL_ITEMS)
      .map((row) =>
        row
          .split(',')
          .slice(0, config.stages.length)
          .map((cell) => decimal(cell)),
      );
    if (rows.every((row) => row.every((cell) => cell !== null))) {
      config.durationMode = 'manual';
      config.manual = resizeGrid(
        rows.map((row) => row.map((cell) => roundMinutes(cell!))),
        config.items,
        config.stages,
      );
      applied = true;
    }
  }

  read(decimal(parameters.get('failure')), (value) => {
    config.failureProbability = clampProbability(value);
  });
  read(decimal(parameters.get('invalid')), (value) => {
    config.validationFailureProbability = clampProbability(value);
  });
  read(wholeNumber(parameters.get('attempts')), (value) => {
    config.validationAttempts = clampTo(ranges.validationAttempts, value);
  });
  if (parameters.get('results') === 'filter')
    read('filter' as const, (value) => (config.handling = value));
  if (parameters.get('errors') === 'uncaught') {
    read('uncaught' as const, (value) => (config.errorHandling = value));
  }

  const scout = parameters.get('scout');
  if (scout === 'off') read(false, (value) => (config.scout = value));
  else read(wholeNumber(scout), (value) => (config.scoutTokens = clampTo(ranges.tokens, value)));

  read(wholeNumber(parameters.get('output')), (value) => {
    config.outputPercent = clampTo(ranges.outputPercent, value);
  });

  const prices: SharedConfiguration['prices'] = {};
  for (const model of models) {
    const [input, output] = parameters.get(`price-${model.id}`)?.split('/') ?? [];
    const parsedInput = price(input);
    const parsedOutput = price(output);
    if (parsedInput !== null && parsedOutput !== null) {
      prices[model.id] = { input: parsedInput, output: parsedOutput };
      applied = true;
    }
  }

  return applied ? { config, prices } : null;
};
