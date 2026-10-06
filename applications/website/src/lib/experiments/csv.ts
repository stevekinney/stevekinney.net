/** A spreadsheet would run a cell that starts with one of these as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV cell. A string a spreadsheet would run as a formula gets a leading
 * single quote, and a cell with a comma, quote, or line break is quoted.
 * Numbers are left alone, so a negative number stays a number.
 */
export const csvCell = (value: string | number | null): string => {
  if (value === null) return '';

  const text = String(value);
  const safe = typeof value === 'string' && FORMULA_START.test(text) ? `'${text}` : text;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
