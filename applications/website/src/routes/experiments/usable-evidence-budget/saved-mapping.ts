import { destinations } from './readout-parser';
import type { Destination, LabelMapping } from './readout-parser';

const storageKey = 'usable-evidence-budget:label-mapping';

const isDestination = (value: unknown): value is Destination =>
  typeof value === 'string' && (destinations as readonly string[]).includes(value);

/** Keeps only entries that are a label and a destination this page knows. */
export const sanitizeMapping = (value: unknown): LabelMapping => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      ([label, destination]) =>
        label.length > 0 && label.length <= 80 && isDestination(destination),
    ),
  ) as LabelMapping;
};

/** The label assignments the person made on an earlier visit. Browser storage is a convenience, so any failure gives nothing. */
export const loadSavedMapping = (): LabelMapping => {
  try {
    const stored = window.localStorage.getItem(storageKey);

    return stored ? sanitizeMapping(JSON.parse(stored)) : {};
  } catch {
    return {};
  }
};

export const saveMapping = (mapping: LabelMapping): void => {
  try {
    if (Object.keys(mapping).length === 0) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, JSON.stringify(mapping));
  } catch {
    // Storage can be blocked or full. The assignments still work for this visit.
  }
};
