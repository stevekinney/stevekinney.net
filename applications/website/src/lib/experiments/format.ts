const tokenCountFormatter = new Intl.NumberFormat('en-US');

// The pricing table quotes prices like $0.206 and $4.951, so prices keep up to three decimals.
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fractionalCentFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 2,
});

// Pinned to UTC: the date is a calendar date, and this page renders in the
// browser, where a local time zone west of UTC would show the day before.
const calendarDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export const formatTokenCount = (count: number): string => tokenCountFormatter.format(count);

/** Short form to three significant digits, such as `313K`, `1.25M`, or `18.9K`. */
export const formatCompactTokenCount = (count: number): string => {
  if (count < 1_000) return String(Math.round(count));

  const inMillions = count >= 1_000_000;
  const rounded = Number((count / (inMillions ? 1_000_000 : 1_000)).toPrecision(3));

  // 999,600 rounds to 1000K, which reads better as 1M.
  if (!inMillions && rounded >= 1_000) return '1M';

  return `${rounded}${inMillions ? 'M' : 'K'}`;
};

/** A price per million tokens. */
export const formatPrice = (price: number): string => priceFormatter.format(price);

/** A cost in dollars. Amounts under a cent keep two significant digits instead of rounding to zero. */
export const formatCost = (cost: number): string =>
  cost > 0 && cost < 0.01 ? fractionalCentFormatter.format(cost) : costFormatter.format(cost);

/** Formats a `YYYY-MM-DD` date, such as `2026-10-04`, as `October 4, 2026`. */
export const formatCalendarDate = (date: string): string =>
  calendarDateFormatter.format(new Date(`${date}T00:00:00Z`));

const MULTIPLIERS: Record<string, number> = { k: 1_000, m: 1_000_000, b: 1_000_000_000 };

/**
 * Parses a token count typed by a person. Accepts digit grouping (`1,500,000`)
 * and shorthand (`250k`, `1.5M`, `2b`). An empty field means zero. Returns
 * `null` for anything else.
 */
export const parseTokenCount = (text: string): number | null => {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[\s,_]/g, '');
  if (normalized === '') return 0;

  const match = /^(\d+(?:\.\d*)?|\.\d+)([kmb])?$/.exec(normalized);
  if (!match) return null;

  const count = Math.round(Number(match[1]) * (match[2] ? MULTIPLIERS[match[2]] : 1));

  return Number.isSafeInteger(count) ? count : null;
};
