import { evaluateChange } from './calculate';
import type { CacheTtl, ChangeEvaluation } from './calculate';
import { findEffort, findModel } from './pricing';
import type { PricingTable } from './pricing';

/** Everything a person sets on the page. The page derives every figure from this and the price table. */
export type CalculatorState = {
  fromModel: string;
  fromEffort: string;
  toModel: string;
  toEffort: string;
  ttl: CacheTtl;
  /** N: tokens already in context. */
  contextTokens: number;
  /** R: output tokens of work left, at the current settings. */
  remainingOutput: number;
  /** A ratio the person typed, or `null` to use the one the efforts imply. */
  ratioOverride: number | null;
};

export const defaultState: CalculatorState = {
  fromModel: 'opus-5',
  fromEffort: 'high',
  toModel: 'sonnet-5',
  toEffort: 'high',
  ttl: '1h',
  contextTokens: 500_000,
  remainingOutput: 150_000,
  ratioOverride: null,
};

/** The largest count a person can type. Beyond this, arithmetic stops being exact. */
export const MAX_TOKENS = 1_000_000_000_000;

/**
 * Replaces anything the price table doesn't know, such as a model that was
 * just removed or a link written for different prices, with something it does.
 */
/** The largest output ratio a link, a field, or a saved scenario can set. Larger ones overflow the cost arithmetic. */
export const MAX_RATIO = 1_000;

export const normalizeState = (state: CalculatorState, pricing: PricingTable): CalculatorState => {
  const firstModel = pricing.models[0].id;
  const standardEffort = findEffort(pricing, 'high') ?? pricing.efforts[0];
  const model = (id: string, fallback: string): string =>
    findModel(pricing, id) ? id : findModel(pricing, fallback) ? fallback : firstModel;
  const effort = (id: string): string => (findEffort(pricing, id) ? id : standardEffort.id);

  return {
    ...state,
    fromModel: model(state.fromModel, defaultState.fromModel),
    toModel: model(state.toModel, defaultState.toModel),
    fromEffort: effort(state.fromEffort),
    toEffort: effort(state.toEffort),
    ratioOverride:
      state.ratioOverride !== null &&
      !(state.ratioOverride >= 0 && state.ratioOverride <= MAX_RATIO)
        ? null
        : state.ratioOverride,
  };
};

/** Computes the change the state describes. The state is normalized first, so this can't fail. */
export const evaluateState = (state: CalculatorState, pricing: PricingTable): ChangeEvaluation => {
  const safe = normalizeState(state, pricing);

  return evaluateChange({
    from: findModel(pricing, safe.fromModel)!,
    fromEffort: findEffort(pricing, safe.fromEffort)!,
    to: findModel(pricing, safe.toModel)!,
    toEffort: findEffort(pricing, safe.toEffort)!,
    ttl: safe.ttl,
    contextTokens: safe.contextTokens,
    remainingOutput: safe.remainingOutput,
    ratioOverride: safe.ratioOverride,
  });
};

/** Exchanges the two sides, model and effort, and clears any ratio override. */
export const swapState = (state: CalculatorState): CalculatorState => ({
  ...state,
  fromModel: state.toModel,
  fromEffort: state.toEffort,
  toModel: state.fromModel,
  toEffort: state.fromEffort,
  ratioOverride: null,
});

/** Parses a ratio a person typed. Empty, negative, and unreadable text all mean "no override". */
export const parseRatioOverride = (text: string): number | null => {
  const normalized = text.trim();
  if (!/^(\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const ratio = Number(normalized);

  return Number.isFinite(ratio) && ratio <= MAX_RATIO ? ratio : null;
};

/** What the note under the ratio field says. An override beats everything, then the efforts. */
export const describeRatioSource = (
  evaluation: ChangeEvaluation,
): 'override' | 'same' | 'published' | 'placeholder' => {
  if (evaluation.overridden) return 'override';
  if (evaluation.fromEffort.id === evaluation.toEffort.id) return 'same';

  return evaluation.fromEffort.sourced && evaluation.toEffort.sourced ? 'published' : 'placeholder';
};

export const ratioNotes = {
  same: 'no effort change',
  published: 'from published coding runs',
  placeholder: 'includes an unpublished placeholder—worth overriding',
  override: 'your override—change an effort level to reset',
} as const;
