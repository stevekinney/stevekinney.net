const wholeFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const twoDecimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A count of lines, such as `1,800`. */
export const formatLines = (lines: number): string => wholeFormatter.format(lines);

/** A signed count of lines, such as `+600` or `−600`, with a real minus sign. */
export const formatSignedLines = (lines: number): string =>
  lines > 0 ? `+${formatLines(lines)}` : lines < 0 ? `−${formatLines(-lines)}` : '0';

/** Minutes to one decimal place at most, such as `180` or `62.8`. */
export const formatMinutes = (minutes: number): string => oneDecimalFormatter.format(minutes);

/** Escaped defects to two decimal places, such as `11.25` or `8.10`. */
export const formatDefects = (defects: number): string => twoDecimalFormatter.format(defects);

/** A rate or factor that may be fractional, such as `2`, `2.5`, or `0.5`. */
export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);

/** Picks the singular or plural form of a noun for a count. */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  count === 1 ? singular : pluralForm;
