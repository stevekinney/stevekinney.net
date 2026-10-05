import { evaluateState, MAX_TOKENS, normalizeState } from './calculator-state';
import type { CalculatorState } from './calculator-state';
import type { ChangeEvaluation } from './calculate';
import type { PricingTable } from './pricing';

/** A setup the person saved under a name, kept in this browser only. */
export type SavedScenario = {
  id: string;
  name: string;
  state: CalculatorState;
};

export const STORAGE_KEY = 'cache-break-even:scenarios';
export const MAX_SCENARIOS = 20;
export const MAX_COMPARED = 3;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_TOKENS
    ? value
    : null;

const readState = (value: unknown): CalculatorState | null => {
  if (!isRecord(value)) return null;

  const { fromModel, fromEffort, toModel, toEffort, ttl, ratioOverride } = value;
  const contextTokens = readCount(value.contextTokens);
  const remainingOutput = readCount(value.remainingOutput);

  if (
    typeof fromModel !== 'string' ||
    typeof fromEffort !== 'string' ||
    typeof toModel !== 'string' ||
    typeof toEffort !== 'string' ||
    (ttl !== '5m' && ttl !== '1h') ||
    contextTokens === null ||
    remainingOutput === null
  ) {
    return null;
  }

  return {
    fromModel,
    fromEffort,
    toModel,
    toEffort,
    ttl,
    contextTokens,
    remainingOutput,
    ratioOverride:
      typeof ratioOverride === 'number' && Number.isFinite(ratioOverride) && ratioOverride >= 0
        ? ratioOverride
        : null,
  };
};

/** Reads saved scenarios, ignoring anything damaged. Storage can be missing or throw, so it never fails. */
export const loadScenarios = (storage: StorageLike | undefined): SavedScenario[] => {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry): SavedScenario[] => {
      if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string') {
        return [];
      }

      const state = readState(entry.state);

      return state ? [{ id: entry.id, name: entry.name, state }] : [];
    });
  } catch {
    return [];
  }
};

/** Writes scenarios. Returns `false` when the browser wouldn't store them. */
export const storeScenarios = (
  storage: StorageLike | undefined,
  scenarios: readonly SavedScenario[],
): boolean => {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(scenarios));

    return storage !== undefined;
  } catch {
    return false;
  }
};

/** The browser's storage, or `undefined` when reading it throws, as it can in a private window. */
export const browserStorage = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/**
 * Adds a scenario under a name. Saving under a name that's already taken
 * replaces that scenario, so a name never appears twice.
 */
export const addScenario = (
  scenarios: readonly SavedScenario[],
  name: string,
  state: CalculatorState,
  makeId: () => string = () => crypto.randomUUID(),
): SavedScenario[] => {
  const trimmed = name.trim().slice(0, 60) || 'Untitled scenario';
  const existing = scenarios.find((scenario) => scenario.name === trimmed);
  const entry: SavedScenario = { id: existing?.id ?? makeId(), name: trimmed, state: { ...state } };

  const next = existing
    ? scenarios.map((scenario) => (scenario.id === existing.id ? entry : scenario))
    : [...scenarios, entry];

  return next.slice(-MAX_SCENARIOS);
};

export type ScenarioComparison = {
  scenario: SavedScenario;
  evaluation: ChangeEvaluation;
};

/** Evaluates saved scenarios against the current prices. A model that's been removed falls back to the first. */
export const compareScenarios = (
  scenarios: readonly SavedScenario[],
  pricing: PricingTable,
): ScenarioComparison[] =>
  scenarios.map((scenario) => ({
    scenario,
    evaluation: evaluateState(normalizeState(scenario.state, pricing), pricing),
  }));
