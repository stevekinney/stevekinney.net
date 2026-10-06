const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

/** A count of lines, such as `1,800`. */
export const formatLines = (lines: number): string => wholeFormatter.format(lines);

/** A rate that may be fractional, such as `2` or `2.5`. */
export const formatNumber = (value: number): string => decimalFormatter.format(value);

/** Picks the singular or plural form of a noun for a count. */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  count === 1 ? singular : pluralForm;
