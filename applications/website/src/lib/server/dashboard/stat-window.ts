import type { DashboardStatWindow } from '$lib/dashboard-types';

/**
 * Builds the rolling one-year window ending at `now`. When `now` is a UTC
 * leap day, `setUTCFullYear` would roll the nonexistent Feb 29 forward into
 * March in the target year, silently dropping a day from the window — so the
 * start is clamped back to the last day of February instead.
 */
export const lastYearWindow = (now: Date): DashboardStatWindow => {
  const from = new Date(now);
  const dayOfMonth = from.getUTCDate();

  from.setUTCFullYear(from.getUTCFullYear() - 1);

  if (from.getUTCDate() !== dayOfMonth) from.setUTCDate(0);

  return { from: from.toISOString(), to: now.toISOString() };
};
