/** How many approval prompts one round shows. */
export const CARD_COUNT = 20;
/** The earliest and latest position, counting from 1, the dangerous card can take. */
export const DANGER_FIRST = 10;
export const DANGER_LAST = 20;

export type ApprovalCard = {
  /** The tool asking for approval, such as `Bash` or `Read`. */
  tool: string;
  /** What it wants to run or touch, shown in a code block. */
  request: string;
  /** Where the agent is working, so a path one level too high can be spotted. */
  workingDirectory: string;
  dangerous: boolean;
  /** Why the card is dangerous, shown afterward. Empty for a routine card. */
  why: string;
};

export type Decision = 'allow' | 'deny';

export type CardResult = {
  /** Position from 1. */
  position: number;
  decision: Decision;
  /** Milliseconds from the card appearing to the decision. */
  milliseconds: number;
};

const PROJECT = '~/code/acme-web';

const routine: readonly Omit<ApprovalCard, 'dangerous' | 'why' | 'workingDirectory'>[] = [
  { tool: 'Bash', request: 'bun test src/cart/cart.test.ts' },
  { tool: 'Bash', request: 'git status --short' },
  { tool: 'Read', request: 'src/cart/cart.ts' },
  { tool: 'Edit', request: 'src/cart/cart.ts (12 lines changed)' },
  { tool: 'Bash', request: 'bun run lint -- src/cart' },
  { tool: 'Bash', request: 'git diff --stat' },
  { tool: 'Read', request: 'package.json' },
  { tool: 'Bash', request: 'rg "applyDiscount" src' },
  { tool: 'Edit', request: 'src/cart/discount.ts (4 lines changed)' },
  { tool: 'Bash', request: 'bun run check' },
  { tool: 'Write', request: 'src/cart/discount.test.ts (new file, 48 lines)' },
  { tool: 'Bash', request: 'git add src/cart && git commit -m "Apply discounts per line item"' },
  { tool: 'Read', request: 'README.md' },
  { tool: 'Bash', request: 'ls src/cart' },
  { tool: 'Bash', request: 'rm -rf ./dist' },
  { tool: 'WebFetch', request: 'https://developer.mozilla.org/en-US/docs/Web/API/Intl' },
  { tool: 'Bash', request: 'git push origin steve/cart-discounts' },
  { tool: 'Edit', request: 'src/cart/totals.ts (7 lines changed)' },
  { tool: 'Bash', request: 'bun test' },
  { tool: 'Read', request: 'src/cart/totals.ts' },
  { tool: 'Bash', request: 'git log --oneline -5' },
  { tool: 'Bash', request: 'gh pr view 214 --json title,state' },
];

const dangerous: readonly Omit<ApprovalCard, 'dangerous' | 'workingDirectory'>[] = [
  {
    tool: 'Bash',
    request: 'git push --force origin main',
    why: 'A force push to main rewrites history everyone else has pulled.',
  },
  {
    tool: 'Read',
    request: 'src/cart/../../.env.production',
    why: 'That path climbs out of the source folder to read production secrets.',
  },
  {
    tool: 'Bash',
    request: 'rm -rf ../dist',
    why: 'One directory too high: this deletes a sibling of the project, not its build output.',
  },
  {
    tool: 'Bash',
    request: 'gh issue comment 88 --repo acme/public-sdk --body-file debug.log',
    why: 'This posts a debug log, and whatever is in it, to a public issue.',
  },
];

/**
 * A small seeded generator (mulberry32). The game's only source of randomness,
 * so the same seed always deals the same round.
 */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const pick = (random: () => number, count: number): number => Math.floor(random() * count);

/** The position, from 1, of the dangerous card for a seed: always within 10–20. */
export const dangerousPosition = (seed: number): number =>
  DANGER_FIRST + pick(seededRandom(seed), DANGER_LAST - DANGER_FIRST + 1);

/** Deals a round of 20 cards for a seed. Exactly one is dangerous. */
export const dealCards = (seed: number): ApprovalCard[] => {
  const random = seededRandom(seed);
  // The first draw is the position, so `dangerousPosition` agrees with the deal.
  const position = DANGER_FIRST + pick(random, DANGER_LAST - DANGER_FIRST + 1);
  const threat = dangerous[pick(random, dangerous.length)];

  const pool = [...routine];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = pick(random, index + 1);
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }

  const cards: ApprovalCard[] = pool
    .slice(0, CARD_COUNT - 1)
    .map((card) => ({ ...card, workingDirectory: PROJECT, dangerous: false, why: '' }));
  cards.splice(position - 1, 0, { ...threat, workingDirectory: PROJECT, dangerous: true });

  return cards;
};

/** A seed typed by a person: a whole number from 0 to 4,294,967,295. */
export const parseSeed = (text: string): number | null => {
  const normalized = text.trim().replace(/,/g, '');
  if (!/^\d{1,10}$/.test(normalized)) return null;

  const seed = Number(normalized);

  return seed <= 0xffff_ffff ? seed : null;
};

export type RoundSummary = {
  dangerousPosition: number;
  caught: boolean;
  /** Routine cards you denied. */
  falseAlarms: number;
  medianFirstHalf: number;
  medianSecondHalf: number;
  dangerousMilliseconds: number;
};

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

/** What a finished round shows: whether you caught it, and how your pace changed. */
export const summarizeRound = (
  cards: readonly ApprovalCard[],
  results: readonly CardResult[],
): RoundSummary => {
  const position = cards.findIndex((card) => card.dangerous) + 1;
  const threat = results.find((result) => result.position === position);
  const half = Math.floor(CARD_COUNT / 2);

  return {
    dangerousPosition: position,
    caught: threat?.decision === 'deny',
    falseAlarms: results.filter(
      (result) => result.decision === 'deny' && result.position !== position,
    ).length,
    medianFirstHalf: median(
      results.filter((result) => result.position <= half).map((result) => result.milliseconds),
    ),
    medianSecondHalf: median(
      results.filter((result) => result.position > half).map((result) => result.milliseconds),
    ),
    dangerousMilliseconds: threat?.milliseconds ?? 0,
  };
};

/** Seconds to one decimal place, such as `1.4 s`. */
export const formatSeconds = (milliseconds: number): string =>
  `${(milliseconds / 1000).toFixed(1)} s`;
