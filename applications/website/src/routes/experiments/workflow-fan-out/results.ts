import type { ResultsHandling } from './config';
import type { ItemResult, RunFailure } from './schedule';

const numberFormatter = new Intl.NumberFormat('en-US');
const count = (value: number): string => numberFormatter.format(value);

export type ResultsSummary = {
  /** The array the script ends up with: every slot, or only the values after `.filter(Boolean)`. */
  received: ItemResult[];
  length: number;
  items: number;
  nulls: number;
  /** What the page says happened. */
  headline: string;
  /** What the run itself reports, which is all a person sees without this page. */
  reported: string;
};

/** The completion message a run shows, whatever it dropped. */
export const completedMessage = (length: number): string =>
  `Run completed — ${count(length)} ${length === 1 ? 'result' : 'results'}`;

/**
 * What the script receives with each way of handling results. Keeping nulls
 * leaves every slot in place. `.filter(Boolean)` drops them, and the run
 * still reports success, with a count that hides the drops.
 */
export const summarizeResults = (
  results: readonly ItemResult[],
  handling: ResultsHandling,
): ResultsSummary => {
  const nulls = results.filter((result) => result.value === 'null').length;
  const received =
    handling === 'filter' ? results.filter((result) => result.value !== 'null') : [...results];
  const reported = completedMessage(received.length);

  let headline = reported;
  if (nulls > 0 && handling === 'filter') {
    headline = `${count(received.length)} of ${count(results.length)} items (${count(nulls)} dropped silently)`;
  } else if (nulls > 0) {
    headline = `${reported} (${count(nulls)} ${nulls === 1 ? 'is' : 'are'} null)`;
  }

  return { received, length: received.length, items: results.length, nulls, headline, reported };
};

/** What an uncaught error does to the run, in one sentence. */
export const describeFailure = (failure: RunFailure, stageName: string): string =>
  `Run failed at ${formatMinutes(failure.time)}: item ${failure.item + 1}’s ${stageName} agent threw, nothing caught it, and the script never received a results array.`;

const minutesFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** Minutes to a tenth, such as `11 min` or `4.5 min`. */
export const formatMinutes = (minutes: number): string => `${minutesFormatter.format(minutes)} min`;
