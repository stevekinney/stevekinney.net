import type { DashboardSection } from '$lib/dashboard-types';

/** Overall lifecycle of the client-side `/api/dashboard` fetch. */
export type DashboardPageState = 'loading' | 'loaded' | 'failed';

/**
 * View-model for a single section: it mirrors the fetch lifecycle, not just
 * the resolved `DashboardSection`, so a section component can render a
 * skeleton before the request settles and a quiet notice if it never does.
 */
export type SectionState<T> = { kind: 'loading' } | { kind: 'ok'; data: T } | { kind: 'error' };

/**
 * Converts the page's fetch lifecycle plus an optional resolved
 * `DashboardSection` into the `SectionState` a section component renders.
 * The upstream `section.error` message is intentionally dropped — sections
 * show their own friendly, static notice instead of surfacing server errors.
 */
export function toSectionState<T>(
  pageState: DashboardPageState,
  section: DashboardSection<T> | undefined,
): SectionState<T> {
  if (pageState === 'loading') return { kind: 'loading' };

  if (pageState === 'failed' || !section) return { kind: 'error' };

  if (section.status === 'ok') return { kind: 'ok', data: section.data };

  return { kind: 'error' };
}
