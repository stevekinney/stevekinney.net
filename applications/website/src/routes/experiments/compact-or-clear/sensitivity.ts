import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';
import { formatPercent } from './field-parsing';
import { ratesFor } from './pricing';
import type { CacheTtl, ModelPrice } from './pricing';
import { compactPayback } from './projection';
import type { ProjectionInputs } from './projection';
import { ranges } from './scenario';

/** How many turns ahead the panel looks for a payback. The scenario's own T doesn't limit it. */
export const SENSITIVITY_HORIZON = 500;

export type SensitivityId =
  'summary' | 'context' | 'reread' | 'inputPerTurn' | 'outputPerTurn' | 'cache' | 'model';

export type SensitivityRow = {
  id: SensitivityId;
  label: string;
  /** The `id` of the control that sets this input, so a click can move focus to it. */
  controlId: string;
  lowLabel: string;
  highLabel: string;
  /** The compaction payback turn at each end, or null when it doesn't pay within the horizon. */
  low: number | null;
  high: number | null;
  /** How far apart the two ends land, with "never" counted as just past the horizon. */
  spread: number;
};

type Variation = {
  id: SensitivityId;
  label: string;
  controlId: string;
  low: { label: string; apply: (inputs: ProjectionInputs) => ProjectionInputs };
  high: { label: string; apply: (inputs: ProjectionInputs) => ProjectionInputs };
};

const tokens = (count: number): string => formatTokens(count);

/** A payback that never comes counts as just past the horizon. */
const paybackScore = (payback: number | null): number => payback ?? SENSITIVITY_HORIZON + 1;

/**
 * The models whose compaction payback is the soonest and the latest, found by trying every one.
 * Input price alone doesn't order them once a custom table breaks the default output ratio. Ties
 * go to the cheaper model for the soonest and the dearer one for the latest.
 */
const modelExtremes = (
  inputs: ProjectionInputs,
  models: readonly ModelPrice[],
  ttl: CacheTtl,
): { soonest: ModelPrice; latest: ModelPrice } | null => {
  const byPrice = [...models].sort((first, second) => first.input - second.input);
  const scored = byPrice.map((model) => ({
    model,
    score: paybackScore(
      compactPayback({ ...inputs, rates: ratesFor(model, ttl) }, SENSITIVITY_HORIZON),
    ),
  }));
  let soonest = scored[0];
  let latest = scored[0];

  for (const entry of scored) {
    if (entry.score < soonest.score) soonest = entry;
    if (entry.score >= latest.score) latest = entry;
  }

  return soonest && latest ? { soonest: soonest.model, latest: latest.model } : null;
};

const variations = (
  inputs: ProjectionInputs,
  models: readonly ModelPrice[],
  ttl: CacheTtl,
): Variation[] => {
  const extremes = modelExtremes(inputs, models, ttl);

  const list: Variation[] = [
    {
      id: 'summary',
      label: 'Summary size',
      controlId: 'summary-size',
      low: {
        label: formatPercent(ranges.summaryPercent.min),
        apply: (inputs) => ({ ...inputs, summaryPercent: ranges.summaryPercent.min }),
      },
      high: {
        label: formatPercent(ranges.summaryPercent.max),
        apply: (inputs) => ({ ...inputs, summaryPercent: ranges.summaryPercent.max }),
      },
    },
    {
      id: 'context',
      label: 'Context now',
      controlId: 'context-now',
      low: {
        label: tokens(ranges.contextNow.min),
        apply: (inputs) => ({ ...inputs, contextNow: ranges.contextNow.min }),
      },
      high: {
        label: tokens(ranges.contextNow.max),
        apply: (inputs) => ({ ...inputs, contextNow: ranges.contextNow.max }),
      },
    },
    {
      id: 'reread',
      label: 'Re-read after clear',
      controlId: 'reread-after-clear',
      low: {
        label: tokens(ranges.reread.min),
        apply: (inputs) => ({ ...inputs, reread: ranges.reread.min }),
      },
      high: {
        label: tokens(ranges.reread.max),
        apply: (inputs) => ({ ...inputs, reread: ranges.reread.max }),
      },
    },
    {
      id: 'inputPerTurn',
      label: 'Input per turn',
      controlId: 'input-per-turn',
      low: {
        label: tokens(ranges.inputPerTurn.min),
        apply: (inputs) => ({ ...inputs, inputPerTurn: ranges.inputPerTurn.min }),
      },
      high: {
        label: tokens(ranges.inputPerTurn.max),
        apply: (inputs) => ({ ...inputs, inputPerTurn: ranges.inputPerTurn.max }),
      },
    },
    {
      id: 'outputPerTurn',
      label: 'Output per turn',
      controlId: 'output-per-turn',
      low: {
        label: tokens(ranges.outputPerTurn.min),
        apply: (inputs) => ({ ...inputs, outputPerTurn: ranges.outputPerTurn.min }),
      },
      high: {
        label: tokens(ranges.outputPerTurn.max),
        apply: (inputs) => ({ ...inputs, outputPerTurn: ranges.outputPerTurn.max }),
      },
    },
    {
      id: 'cache',
      label: 'Warm or cold cache',
      controlId: 'cache-warm',
      low: { label: 'Warm', apply: (inputs) => ({ ...inputs, warm: true }) },
      high: { label: 'Cold', apply: (inputs) => ({ ...inputs, warm: false }) },
    },
  ];

  if (extremes) {
    const { soonest, latest } = extremes;

    list.push({
      id: 'model',
      label: 'Model',
      controlId: 'model',
      low: {
        label: soonest.name,
        apply: (inputs) => ({ ...inputs, rates: ratesFor(soonest, ttl) }),
      },
      high: {
        label: latest.name,
        apply: (inputs) => ({ ...inputs, rates: ratesFor(latest, ttl) }),
      },
    });
  }

  return list;
};

/**
 * For each input, the compaction payback turn with that input at its minimum
 * and at its maximum, everything else held where it is. Sorted by how far
 * apart the two land, widest first. A model's minimum and maximum are the
 * models in the price table with the soonest and the latest payback.
 */
export const sensitivityRows = (
  inputs: ProjectionInputs,
  models: readonly ModelPrice[],
  ttl: CacheTtl,
): SensitivityRow[] =>
  variations(inputs, models, ttl)
    .map((variation, order) => {
      const low = compactPayback(variation.low.apply(inputs), SENSITIVITY_HORIZON);
      const high = compactPayback(variation.high.apply(inputs), SENSITIVITY_HORIZON);
      const spread = Math.abs(paybackScore(low) - paybackScore(high));

      return {
        order,
        row: {
          id: variation.id,
          label: variation.label,
          controlId: variation.controlId,
          lowLabel: variation.low.label,
          highLabel: variation.high.label,
          low,
          high,
          spread,
        } satisfies SensitivityRow,
      };
    })
    .sort((first, second) => second.row.spread - first.row.spread || first.order - second.order)
    .map(({ row }) => row);
