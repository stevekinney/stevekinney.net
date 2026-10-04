import { evaluateChange } from './calculate';
import type { ChangeEvaluation } from './calculate';
import type { CalculatorState } from './calculator-state';
import { normalizeState } from './calculator-state';
import { findEffort, findModel } from './pricing';
import type { EffortLevel, ModelPrice, PricingTable } from './pricing';

/** One destination in the "every option from here" table. */
export type OptionRow = {
  key: string;
  model: ModelPrice;
  effort: EffortLevel;
  evaluation: ChangeEvaluation;
  /** Position in the table of models and efforts, so ties sort in a stable order. */
  order: number;
};

export type OptionSortKey = 'destination' | 'cost' | 'value' | 'net' | 'breakEven';
export type SortDirection = 'ascending' | 'descending';

/**
 * Every model at every effort level, evaluated from the current starting point
 * with the current context, remaining work, and TTL. The ratio always comes
 * from the efforts: an override applies to the destination the person picked,
 * not to every row.
 */
export const buildOptions = (state: CalculatorState, pricing: PricingTable): OptionRow[] => {
  const safe = normalizeState(state, pricing);
  const from = findModel(pricing, safe.fromModel)!;
  const fromEffort = findEffort(pricing, safe.fromEffort)!;
  const rows: OptionRow[] = [];

  for (const model of pricing.models) {
    for (const effort of pricing.efforts) {
      rows.push({
        key: `${model.id}:${effort.id}`,
        model,
        effort,
        order: rows.length,
        evaluation: evaluateChange({
          from,
          fromEffort,
          to: model,
          toEffort: effort,
          ttl: safe.ttl,
          contextTokens: safe.contextTokens,
          remainingOutput: safe.remainingOutput,
          ratioOverride: null,
        }),
      });
    }
  }

  return rows;
};

const sortValue = (row: OptionRow, key: Exclude<OptionSortKey, 'destination'>): number | null => {
  switch (key) {
    case 'cost':
      return row.evaluation.cost;
    case 'value':
      return row.evaluation.value;
    case 'net':
      return row.evaluation.net;
    case 'breakEven':
      return row.evaluation.breakEvenOutput;
  }
};

/** Sorts rows without changing the input. Rows with no break-even always sort last. */
export const sortOptions = (
  rows: readonly OptionRow[],
  key: OptionSortKey,
  direction: SortDirection,
): OptionRow[] => {
  const sign = direction === 'ascending' ? 1 : -1;

  return [...rows].sort((first, second) => {
    if (key === 'destination') return sign * (first.order - second.order);

    const firstValue = sortValue(first, key);
    const secondValue = sortValue(second, key);
    if (firstValue === null && secondValue === null) return first.order - second.order;
    if (firstValue === null) return 1;
    if (secondValue === null) return -1;

    return sign * (firstValue - secondValue) || first.order - second.order;
  });
};
