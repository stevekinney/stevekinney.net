/**
 * How a typed number is read. `integer` is a whole number with optional digit
 * grouping. `decimal` allows a fraction. `percent` is shown as `6%` and kept
 * as a fraction such as 0.06; the `%` is optional when typing.
 */
export type FieldKind = 'integer' | 'decimal' | 'percent' | 'tokens';

const decimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
const integerFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const parseFieldNumber = (
  text: string,
  kind: Exclude<FieldKind, 'tokens'>,
): number | null => {
  const normalized = text.trim().replace(/[\s,_]/g, '');
  const withoutPercent = kind === 'percent' ? normalized.replace(/%$/, '') : normalized;
  const pattern = kind === 'integer' ? /^\d+$/ : /^(\d+(\.\d*)?|\.\d+)$/;
  if (!pattern.test(withoutPercent)) return null;

  const number = Number(withoutPercent);
  if (!Number.isFinite(number)) return null;

  return kind === 'percent' ? Math.round(number * 1_000) / 100_000 : number;
};

export const formatFieldNumber = (value: number, kind: Exclude<FieldKind, 'tokens'>): string => {
  if (kind === 'percent') return `${decimalFormatter.format(Math.round(value * 100_000) / 1_000)}%`;
  if (kind === 'integer') return integerFormatter.format(value);

  return decimalFormatter.format(value);
};
