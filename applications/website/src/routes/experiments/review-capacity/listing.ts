/**
 * Reads the JSON a pull-request listing prints, such as
 * `gh pr list --state merged --limit 200 --json number,additions,deletions,createdAt,mergedAt,author`,
 * and measures what it says about your real throughput. Everything here runs
 * in the browser on text the person pasted or chose.
 */

export const LISTING_COMMAND =
  'gh pr list --state merged --limit 200 --json number,additions,deletions,createdAt,mergedAt,author';

export type PullRequest = {
  /** The pull request's number, or its position in the listing when it has none. */
  number: number;
  login: string;
  /** What GitHub reports as `author.is_bot`. */
  isBot: boolean;
  /** Additions plus deletions. */
  lines: number;
  createdAt: Date | null;
  mergedAt: Date | null;
};

export type SkippedEntry = { position: number; reason: string };

export type ParsedListing = {
  pullRequests: PullRequest[];
  skipped: SkippedEntry[];
};

export type ListingError = { error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

/** More lines than this in additions or deletions is a mistake, not a pull request. */
export const MAX_LINES = 10_000_000;

const date = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value === '') return null;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** The listing caps how much it reads, so a pasted file can't freeze the tab. */
export const MAX_LISTING_CHARACTERS = 5_000_000;

/** A listing whose merges span longer than this is a mistake, not a team's history. */
export const MAX_SPAN_YEARS = 20;

const mergeSpan = (pullRequests: readonly PullRequest[]): { first: Date; last: Date } | null => {
  let span: { first: Date; last: Date } | null = null;
  for (const { mergedAt } of pullRequests) {
    if (!mergedAt) continue;
    if (!span) span = { first: mergedAt, last: mergedAt };
    else if (mergedAt < span.first) span.first = mergedAt;
    else if (mergedAt > span.last) span.last = mergedAt;
  }

  return span;
};

/** `YYYY-MM-DD` in UTC, with the sign and six digits ISO uses for a year past 9999. */
const calendarDay = (date: Date): string => date.toISOString().split('T')[0];

/**
 * Parses a listing defensively. An entry without whole, non-negative
 * `additions` and `deletions` is skipped and reported. A missing author or
 * date doesn't skip the entry: it still counts toward sizes, just not toward
 * timing. A listing whose merges span more than `MAX_SPAN_YEARS` is rejected.
 */
export const parseListing = (text: string): ParsedListing | ListingError => {
  if (text.trim() === '') return { error: 'Paste the JSON your pull-request listing printed.' };
  if (text.length > MAX_LISTING_CHARACTERS) {
    return { error: 'That listing is over 5 MB. Ask for fewer pull requests with --limit.' };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'That isn’t valid JSON. Paste the whole output, from [ to ].' };
  }

  if (!Array.isArray(data)) {
    return {
      error: 'Expected a JSON array of pull requests, the way gh pr list --json prints it.',
    };
  }

  const pullRequests: PullRequest[] = [];
  const skipped: SkippedEntry[] = [];

  data.forEach((entry: unknown, index) => {
    const position = index + 1;
    if (!isRecord(entry)) {
      skipped.push({ position, reason: 'not an object' });
      return;
    }

    const additions = count(entry.additions);
    const deletions = count(entry.deletions);
    if (additions === null || deletions === null) {
      const missing = [
        additions === null ? 'additions' : null,
        deletions === null ? 'deletions' : null,
      ]
        .filter(Boolean)
        .join(' and ');
      skipped.push({ position, reason: `no usable ${missing}` });
      return;
    }

    const tooLarge = [
      additions > MAX_LINES ? 'additions' : null,
      deletions > MAX_LINES ? 'deletions' : null,
    ]
      .filter(Boolean)
      .join(' and ');
    // The bound keeps both safe integers, and their sum finite.
    const lines = additions + deletions;
    if (tooLarge !== '' || !Number.isSafeInteger(lines)) {
      skipped.push({
        position,
        reason: `${tooLarge || 'additions and deletions'} over ${MAX_LINES.toLocaleString('en-US')} lines`,
      });
      return;
    }

    const author = isRecord(entry.author) ? entry.author : {};
    const login =
      typeof author.login === 'string' && author.login.trim() !== ''
        ? author.login.trim()
        : 'unknown';

    const pullRequestNumber = count(entry.number);
    pullRequests.push({
      number:
        pullRequestNumber !== null && Number.isSafeInteger(pullRequestNumber)
          ? pullRequestNumber
          : position,
      login: login.slice(0, 100),
      isBot: author.is_bot === true,
      lines,
      createdAt: date(entry.createdAt),
      mergedAt: date(entry.mergedAt),
    });
  });

  const span = mergeSpan(pullRequests);
  if (span) {
    const limit = new Date(span.first);
    limit.setUTCFullYear(limit.getUTCFullYear() + MAX_SPAN_YEARS);
    if (span.last > limit) {
      return {
        error: `Those merge dates span more than ${MAX_SPAN_YEARS} years, from ${calendarDay(span.first)} to ${calendarDay(span.last)}. Check the mergedAt values in the listing.`,
      };
    }
  }

  return { pullRequests, skipped };
};

export type AgentRules = {
  /** Count accounts GitHub marks as bots (`is_bot`) as agents. */
  useBotFlag: boolean;
  /**
   * Logins and patterns, separated by commas or new lines. `*` matches any
   * run of characters, so `app/*` matches `app/dependabot`. Matching ignores case.
   */
  patterns: string;
};

/**
 * GitHub's CLI prints a bot as `app/<name>` with `is_bot: true`, while the
 * REST API and the web show `<name>[bot]`. Both are covered. A bare `bot`
 * substring isn't, because people have logins like that too.
 */
export const defaultAgentRules: AgentRules = { useBotFlag: true, patterns: 'app/*, *[bot]' };

const toPattern = (token: string): RegExp =>
  new RegExp(
    `^${token
      .split('*')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
      .join('.*')}$`,
    'i',
  );

export const compileAgentRules = (rules: AgentRules): ((pr: PullRequest) => boolean) => {
  const patterns = rules.patterns
    .split(/[,\n]/)
    .map((token) => token.trim())
    .filter((token) => token !== '')
    .map(toPattern);

  return (pr) =>
    (rules.useBotFlag && pr.isBot) || patterns.some((pattern) => pattern.test(pr.login));
};

const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

/** The value at a percentile, by the nearest-rank method. */
const percentile = (values: readonly number[], share: number): number | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((first, second) => first - second);

  return sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)];
};

const DAY = 86_400_000;

const utcDay = (moment: Date): number => Math.floor(moment.getTime() / DAY);

/**
 * Weekdays from the first merge to the last, both included, counted in UTC.
 * The simulator counts working days, so a weekend in the span doesn't dilute
 * the rate. A span with no weekdays, such as one Saturday, counts as one day.
 */
export const workingDaysSpanned = (dates: readonly Date[]): number => {
  if (dates.length === 0) return 0;

  let first = Infinity;
  let last = -Infinity;
  for (const date of dates) {
    const day = utcDay(date);
    if (day < first) first = day;
    if (day > last) last = day;
  }

  // Whole weeks hold five weekdays each; walk only the zero to six days left over.
  const total = last - first + 1;
  const remainder = total % 7;
  let weekdays = Math.floor(total / 7) * 5;
  for (let day = last - remainder + 1; day <= last; day += 1) {
    // Day 0 of the epoch was a Thursday, so the weekday is 0 on Sunday and 6 on Saturday.
    const weekday = (((day + 4) % 7) + 7) % 7;
    if (weekday !== 0 && weekday !== 6) weekdays += 1;
  }

  return Math.max(1, weekdays);
};

export type GroupStats = {
  count: number;
  medianLines: number | null;
  totalLines: number;
  /** Pull requests that need more than one effective sitting. */
  overOneSitting: number;
  /** Merged pull requests per working day, or null without merge dates. */
  perDay: number | null;
  linesPerDay: number | null;
  medianHoursToMerge: number | null;
};

export type HistogramBin = {
  label: string;
  /** Inclusive lower and exclusive upper bound in lines; the last bin has no upper bound. */
  from: number;
  to: number | null;
  count: number;
  /** Whether a pull request in this bin needs more than one effective sitting. */
  overOneSitting: boolean;
};

export type ThroughputReport = {
  all: GroupStats;
  agents: GroupStats;
  humans: GroupStats;
  /** Pull requests over one sitting, as a share of all of them, from 0 to 1. */
  shareOverOneSitting: number;
  workingDays: number;
  p90HoursToMerge: number | null;
  /** Entries without a usable merge date, which count toward sizes but not timing. */
  undated: number;
  histogram: HistogramBin[];
  authors: { login: string; agent: boolean; count: number; medianLines: number }[];
};

/** Whether a pull request needs more than one effective sitting to review. */
export const needsMoreThanOneSitting = (lines: number, linesPerSitting: number): boolean =>
  lines > linesPerSitting;

const groupStats = (
  pullRequests: readonly PullRequest[],
  linesPerSitting: number,
  workingDays: number,
): GroupStats => {
  const merged = pullRequests.filter((pr) => pr.mergedAt !== null);
  const hours = merged.flatMap((pr) =>
    pr.createdAt && pr.mergedAt && pr.mergedAt >= pr.createdAt
      ? [(pr.mergedAt.getTime() - pr.createdAt.getTime()) / 3_600_000]
      : [],
  );
  const mergedLines = merged.reduce((sum, pr) => sum + pr.lines, 0);

  return {
    count: pullRequests.length,
    medianLines: median(pullRequests.map((pr) => pr.lines)),
    totalLines: pullRequests.reduce((sum, pr) => sum + pr.lines, 0),
    overOneSitting: pullRequests.filter((pr) => needsMoreThanOneSitting(pr.lines, linesPerSitting))
      .length,
    perDay: workingDays > 0 ? merged.length / workingDays : null,
    linesPerDay: workingDays > 0 ? mergedLines / workingDays : null,
    medianHoursToMerge: median(hours),
  };
};

/** Histogram bins sized in effective sittings, so the one-sitting line is always a bin edge. */
export const histogramBins = (
  pullRequests: readonly PullRequest[],
  linesPerSitting: number,
): HistogramBin[] => {
  const edges = [0, 0.25, 0.5, 1, 2, 4].map((share) => Math.round(share * linesPerSitting));

  return edges.map((from, index) => {
    const to = edges[index + 1] ?? null;
    const inBin = (lines: number): boolean =>
      index === 0 ? lines <= (to ?? Infinity) : lines > from && (to === null || lines <= to);

    return {
      label: to === null ? `over ${from}` : index === 0 ? `0–${to}` : `${from + 1}–${to}`,
      from,
      to,
      count: pullRequests.filter((pr) => inBin(pr.lines)).length,
      overOneSitting: from >= linesPerSitting,
    };
  });
};

export const measureThroughput = (
  pullRequests: readonly PullRequest[],
  rules: AgentRules,
  linesPerSitting: number,
): ThroughputReport => {
  const isAgent = compileAgentRules(rules);
  const mergedDates = pullRequests.flatMap((pr) => (pr.mergedAt ? [pr.mergedAt] : []));
  const workingDays = workingDaysSpanned(mergedDates);
  const agentPrs = pullRequests.filter(isAgent);
  const humanPrs = pullRequests.filter((pr) => !isAgent(pr));
  const all = groupStats(pullRequests, linesPerSitting, workingDays);

  const byLogin = new Map<string, PullRequest[]>();
  for (const pr of pullRequests) byLogin.set(pr.login, [...(byLogin.get(pr.login) ?? []), pr]);

  const hours = pullRequests.flatMap((pr) =>
    pr.createdAt && pr.mergedAt && pr.mergedAt >= pr.createdAt
      ? [(pr.mergedAt.getTime() - pr.createdAt.getTime()) / 3_600_000]
      : [],
  );

  return {
    all,
    agents: groupStats(agentPrs, linesPerSitting, workingDays),
    humans: groupStats(humanPrs, linesPerSitting, workingDays),
    shareOverOneSitting: pullRequests.length > 0 ? all.overOneSitting / pullRequests.length : 0,
    workingDays,
    p90HoursToMerge: percentile(hours, 0.9),
    undated: pullRequests.length - mergedDates.length,
    histogram: histogramBins(pullRequests, linesPerSitting),
    authors: [...byLogin.entries()]
      .map(([login, prs]) => ({
        login,
        agent: isAgent(prs[0]),
        count: prs.length,
        medianLines: median(prs.map((pr) => pr.lines)) ?? 0,
      }))
      .sort(
        (first, second) => second.count - first.count || first.login.localeCompare(second.login),
      ),
  };
};

export type MeasuredInputs = {
  linesPerPr: number;
  prsPerAgent: number;
  /** Whether the numbers come from agent pull requests or, with none found, from all of them. */
  source: 'agents' | 'all';
};

/**
 * Numbers to load into the simulator: the median size of an agent pull request,
 * and the agent rate per working day shared across your current number of
 * agents. With no agent pull requests found, it uses all of them.
 */
export const measuredInputs = (report: ThroughputReport, agents: number): MeasuredInputs | null => {
  const source = report.agents.count > 0 ? 'agents' : 'all';
  const group = report[source];
  if (group.medianLines === null || group.perDay === null || group.count === 0) return null;

  const share = agents > 0 ? group.perDay / agents : group.perDay;

  return {
    linesPerPr: Math.max(1, Math.round(group.medianLines)),
    prsPerAgent: Math.min(20, Math.round(share * 10) / 10),
    source,
  };
};
