/** What the sessions cost and how well they used the cache. Pure; the page only draws it. */
import type { AuditResponse, AuditSession } from './audit-data';
import { billedTokens, cacheHitRatio, costUnits, matchPrice, toDollars } from './pricing';
import type { PriceRow } from './pricing';
import { dayOf } from './timeline';

export type SessionCost = {
  sessionId: string;
  start: string | null;
  cwd: string | null;
  gitBranch: string | null;
  /** Dollars for the priced responses. */
  cost: number;
  /** Responses, subagent responses included. */
  turns: number;
  unpricedTurns: number;
};

export type ModelCost = {
  model: string;
  /** The price row's name, or `null` when the model is unpriced. */
  priceName: string | null;
  turns: number;
  cost: number | null;
};

export type CacheDay = {
  day: string;
  ratio: number | null;
  promptTokens: number;
};

export type CostSummary = {
  cost: number;
  unpricedTurns: number;
  unpricedModels: string[];
  /** Responses with cache writes that had no recorded lifetime, billed as five-minute writes. */
  assumedFiveMinuteTurns: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cacheHitRatio: number | null;
  sessions: SessionCost[];
  byModel: ModelCost[];
  cacheByDay: CacheDay[];
};

type Totals = { input: number; read: number; write: number };

export const summarizeCost = (
  responses: readonly AuditResponse[],
  sessions: readonly AuditSession[],
  prices: readonly PriceRow[],
): CostSummary => {
  const priceCache = new Map<string, PriceRow | null>();
  const priceFor = (model: string): PriceRow | null => {
    if (!priceCache.has(model)) priceCache.set(model, matchPrice(model, prices));

    return priceCache.get(model) ?? null;
  };

  const sessionUnits = new Map<string, { units: number; turns: number; unpriced: number }>();
  const modelUnits = new Map<string, { units: number; turns: number; priced: boolean }>();
  const dayTotals = new Map<string, Totals>();
  const totals: Totals = { input: 0, read: 0, write: 0 };
  let units = 0;
  let unpricedTurns = 0;
  let assumedFiveMinuteTurns = 0;

  for (const response of responses) {
    const { usage } = response;
    const row = priceFor(response.model);
    const tokens = billedTokens(usage);
    const responseUnits = row ? costUnits(tokens, row) : 0;

    if (row) units += responseUnits;
    else unpricedTurns += 1;
    if (tokens.assumedFiveMinute) assumedFiveMinuteTurns += 1;

    const session = sessionUnits.get(response.sessionId) ?? { units: 0, turns: 0, unpriced: 0 };
    session.units += responseUnits;
    session.turns += 1;
    if (!row) session.unpriced += 1;
    sessionUnits.set(response.sessionId, session);

    const model = modelUnits.get(response.model) ?? { units: 0, turns: 0, priced: row !== null };
    model.units += responseUnits;
    model.turns += 1;
    modelUnits.set(response.model, model);

    totals.input += usage.inputTokens;
    totals.read += usage.cacheReadTokens;
    totals.write += usage.cacheWriteTokens;

    const day = dayOf(response.timestamp);
    if (day) {
      const dayTotal = dayTotals.get(day) ?? { input: 0, read: 0, write: 0 };
      dayTotal.input += usage.inputTokens;
      dayTotal.read += usage.cacheReadTokens;
      dayTotal.write += usage.cacheWriteTokens;
      dayTotals.set(day, dayTotal);
    }
  }

  const sessionCosts: SessionCost[] = sessions
    .filter((session) => sessionUnits.has(session.id))
    .map((session) => {
      const entry = sessionUnits.get(session.id) ?? { units: 0, turns: 0, unpriced: 0 };

      return {
        sessionId: session.id,
        start: session.start,
        cwd: session.cwd,
        gitBranch: session.gitBranch,
        cost: toDollars(entry.units),
        turns: entry.turns,
        unpricedTurns: entry.unpriced,
      };
    });

  return {
    cost: toDollars(units),
    unpricedTurns,
    unpricedModels: [...modelUnits.entries()]
      .filter(([, entry]) => !entry.priced)
      .map(([model]) => model)
      .sort(),
    assumedFiveMinuteTurns,
    inputTokens: totals.input,
    cacheReadTokens: totals.read,
    cacheWriteTokens: totals.write,
    cacheHitRatio: cacheHitRatio(totals.input, totals.read, totals.write),
    sessions: sessionCosts,
    byModel: [...modelUnits.entries()]
      .map(([model, entry]) => ({
        model,
        priceName: priceFor(model)?.name ?? null,
        turns: entry.turns,
        cost: entry.priced ? toDollars(entry.units) : null,
      }))
      .sort(
        (first, second) => (second.cost ?? -1) - (first.cost ?? -1) || second.turns - first.turns,
      ),
    cacheByDay: [...dayTotals.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([day, total]) => ({
        day,
        ratio: cacheHitRatio(total.input, total.read, total.write),
        promptTokens: total.input + total.read + total.write,
      })),
  };
};

/** The costliest sessions first. */
export const costliestSessions = (sessions: readonly SessionCost[], count = 10): SessionCost[] =>
  [...sessions].sort((first, second) => second.cost - first.cost).slice(0, count);

export type HistogramBin = { from: number; to: number; count: number };

/** A step of 1, 2, or 5 times a power of ten that splits `maximum` into about `bins` bins. */
const niceStep = (maximum: number, bins: number): number => {
  const raw = maximum / bins;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((factor) => factor * power >= raw) ?? 10;

  return step * power;
};

/** Sessions per cost bracket, from $0 to just past the costliest session. */
export const costHistogram = (costs: readonly number[], bins = 8): HistogramBin[] => {
  if (costs.length === 0) return [];

  // Reduced rather than spread: thousands of sessions can exceed the engine's argument limit.
  const maximum = costs.reduce((high, cost) => Math.max(high, cost), Number.NEGATIVE_INFINITY);
  if (maximum <= 0) return [{ from: 0, to: 0, count: costs.length }];

  const step = niceStep(maximum, bins);
  const count = Math.floor(maximum / step) + 1;
  const histogram = Array.from({ length: count }, (_, index) => ({
    from: index * step,
    to: (index + 1) * step,
    count: 0,
  }));

  for (const cost of costs) histogram[Math.min(count - 1, Math.floor(cost / step))].count += 1;

  return histogram;
};
