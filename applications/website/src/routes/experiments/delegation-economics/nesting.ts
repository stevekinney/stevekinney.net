/** Claude Code runs at most this many subagents at once, per the course outline. */
export const CONCURRENCY_LIMIT = 20;

/** Subagents nest three layers deep by default, per the course outline. */
export const DEFAULT_LAYER_LIMIT = 3;

export const nestingRanges = {
  children: { min: 1, max: 10 },
  layers: { min: 1, max: 6 },
};

export type Nesting = {
  /** Workers in each layer: `k`, `k²`, `k³`, and so on. */
  perLayer: number[];
  /** Every worker across every layer. */
  total: number;
  /** How many more than the concurrency limit there are, which would wait their turn. */
  overLimit: number;
  /** Whether the tree is deeper than the default nesting limit. */
  deeperThanDefault: boolean;
};

const whole = (value: number, minimum: number, maximum: number): number =>
  Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.round(value))) : minimum;

/** `k` children per node across `L` layers: `k + k² + … + k^L` workers. */
export const nesting = (children: number, layers: number): Nesting => {
  const k = whole(children, nestingRanges.children.min, nestingRanges.children.max);
  const depth = whole(layers, nestingRanges.layers.min, nestingRanges.layers.max);
  const perLayer = Array.from({ length: depth }, (_, index) => k ** (index + 1));
  const total = perLayer.reduce((sum, count) => sum + count, 0);

  return {
    perLayer,
    total,
    overLimit: Math.max(0, total - CONCURRENCY_LIMIT),
    deeperThanDefault: depth > DEFAULT_LAYER_LIMIT,
  };
};
