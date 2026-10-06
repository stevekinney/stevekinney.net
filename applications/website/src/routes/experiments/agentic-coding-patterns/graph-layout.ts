export type Point = { x: number; y: number };

export type LayoutOptions = {
  width?: number;
  height?: number;
  iterations?: number;
};

/** A small seeded generator, so the layout is the same on every visit. */
const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const DEFAULT_ITERATIONS = 300;
const MINIMUM_ITERATIONS = 1;
/** The most pair interactions the layout spends in total, about a second on a slow laptop. */
const PAIR_STEP_BUDGET = 20_000_000;

/**
 * How many steps to run for `count` nodes. Every step compares every pair, so the cost grows with
 * the square of the node count. The bundled library of 118 nodes gets the full 300 steps. A folder
 * of thousands of notes gets fewer, so opening the graph stays responsive instead of hanging.
 */
export const iterationsFor = (count: number): number => {
  const pairs = (count * (count - 1)) / 2;
  if (pairs === 0) return DEFAULT_ITERATIONS;

  return Math.max(
    MINIMUM_ITERATIONS,
    Math.min(DEFAULT_ITERATIONS, Math.floor(PAIR_STEP_BUDGET / pairs)),
  );
};

/**
 * Places nodes with a force simulation: every pair pushes apart, every edge
 * pulls together, and a weak pull toward the center keeps unconnected nodes in
 * view. It runs a fixed number of steps up front instead of animating, so the
 * graph appears already settled, which also means reduced motion needs no
 * special case. Nodes start on a circle in the order given and the generator
 * is seeded, so the same input always gives the same picture.
 */
export const layoutGraph = (
  ids: readonly string[],
  edges: readonly { source: string; target: string }[],
  { width = 1000, height = 700, iterations: requestedIterations }: LayoutOptions = {},
): Map<string, Point> => {
  const count = ids.length;
  const iterations = requestedIterations ?? iterationsFor(count);
  const positions = new Map<string, Point>();
  if (count === 0) return positions;

  const random = seededRandom(count * 7919 + edges.length);
  const indexOf = new Map(ids.map((id, index) => [id, index]));
  const x = new Float64Array(count);
  const y = new Float64Array(count);

  ids.forEach((_, index) => {
    const angle = (index / count) * Math.PI * 2;
    x[index] = width / 2 + Math.cos(angle) * (width / 3) + (random() - 0.5) * 20;
    y[index] = height / 2 + Math.sin(angle) * (height / 3) + (random() - 0.5) * 20;
  });

  const links = edges.flatMap(({ source, target }) => {
    const from = indexOf.get(source);
    const to = indexOf.get(target);

    return from === undefined || to === undefined || from === to ? [] : [[from, to] as const];
  });

  const idealLength = Math.sqrt((width * height) / count);
  const displacementX = new Float64Array(count);
  const displacementY = new Float64Array(count);

  for (let step = 0; step < iterations; step += 1) {
    const temperature = (width / 10) * (1 - step / iterations);
    displacementX.fill(0);
    displacementY.fill(0);

    for (let first = 0; first < count; first += 1) {
      for (let second = first + 1; second < count; second += 1) {
        let dx = (x[first] ?? 0) - (x[second] ?? 0);
        let dy = (y[first] ?? 0) - (y[second] ?? 0);
        let distance = Math.hypot(dx, dy);

        if (distance < 0.01) {
          dx = random() - 0.5;
          dy = random() - 0.5;
          distance = Math.hypot(dx, dy) || 0.01;
        }

        const push = (idealLength * idealLength) / distance;
        displacementX[first] = (displacementX[first] ?? 0) + (dx / distance) * push;
        displacementY[first] = (displacementY[first] ?? 0) + (dy / distance) * push;
        displacementX[second] = (displacementX[second] ?? 0) - (dx / distance) * push;
        displacementY[second] = (displacementY[second] ?? 0) - (dy / distance) * push;
      }
    }

    for (const [from, to] of links) {
      const dx = (x[from] ?? 0) - (x[to] ?? 0);
      const dy = (y[from] ?? 0) - (y[to] ?? 0);
      const distance = Math.hypot(dx, dy) || 0.01;
      const pull = (distance * distance) / idealLength;

      displacementX[from] = (displacementX[from] ?? 0) - (dx / distance) * pull;
      displacementY[from] = (displacementY[from] ?? 0) - (dy / distance) * pull;
      displacementX[to] = (displacementX[to] ?? 0) + (dx / distance) * pull;
      displacementY[to] = (displacementY[to] ?? 0) + (dy / distance) * pull;
    }

    for (let index = 0; index < count; index += 1) {
      // A weak pull toward the middle.
      displacementX[index] = (displacementX[index] ?? 0) + (width / 2 - (x[index] ?? 0)) * 0.6;
      displacementY[index] = (displacementY[index] ?? 0) + (height / 2 - (y[index] ?? 0)) * 0.6;

      const length = Math.hypot(displacementX[index] ?? 0, displacementY[index] ?? 0) || 1;
      const move = Math.min(length, temperature);

      x[index] = (x[index] ?? 0) + ((displacementX[index] ?? 0) / length) * move;
      y[index] = (y[index] ?? 0) + ((displacementY[index] ?? 0) / length) * move;
    }
  }

  ids.forEach((id, index) => positions.set(id, { x: x[index] ?? 0, y: y[index] ?? 0 }));

  return positions;
};

/** The box that holds every point, grown by a margin. */
export const boundsOf = (
  points: Iterable<Point>,
  margin = 0,
): { x: number; y: number; width: number; height: number } => {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const { x, y } of points) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }

  if (!Number.isFinite(left)) return { x: 0, y: 0, width: 1, height: 1 };

  return {
    x: left - margin,
    y: top - margin,
    width: Math.max(1, right - left + margin * 2),
    height: Math.max(1, bottom - top + margin * 2),
  };
};

/** Places a center node with its neighbors around an ellipse, for the small graph in an entry. */
export const radialLayout = (
  centerId: string,
  neighborIds: readonly string[],
  { width = 520, height = 320 }: LayoutOptions = {},
): Map<string, Point> => {
  const positions = new Map<string, Point>([[centerId, { x: width / 2, y: height / 2 }]]);

  neighborIds.forEach((id, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, neighborIds.length)) * Math.PI * 2;
    positions.set(id, {
      x: width / 2 + Math.cos(angle) * (width / 2 - 90),
      y: height / 2 + Math.sin(angle) * (height / 2 - 28),
    });
  });

  return positions;
};
