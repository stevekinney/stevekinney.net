import {
  marginForCapacity,
  marginFromPercent,
  marginFromThreshold,
  marginShareOf,
} from './autocompact';
import { capacityOptions, findTerm, maximumTokenCount, scenariosEqual } from './budget';
import type { Scenario, TermKey } from './budget';
import { findPreset, presetMatching, presets } from './presets';
import type { AppliedReadout } from './readout-parser';

/** A value the readout filled, which stays marked until the person edits it. */
export type Mark = 'capacity' | TermKey;

/**
 * Everything the calculation and the page need, in one place. Each function
 * below returns the next state and never changes the one it is given.
 */
export type BudgetState = {
  scenario: Scenario;
  /** The margin as a share of the capacity, kept so resizing the window holds the threshold percentage. */
  marginShare: number;
  presetId: string | null;
  /** The capacity dropdown shows Custom… even when the number happens to match a listed size. */
  customCapacity: boolean;
  pinned: Scenario | null;
  fromReadout: readonly Mark[];
  /** Everything the current readout has filled, including values edited since. */
  readoutKeys: readonly Mark[];
  /** The scenario as it was before a readout filled it in, for Discard. */
  beforeReadout: Scenario | null;
  presetBeforeReadout: string | null;
};

export const isCustomCapacity = (capacity: number): boolean =>
  !capacityOptions.some((option) => option.value === capacity);

const clampCount = (count: number, maximum = maximumTokenCount): number =>
  Math.min(Math.max(Math.round(count), 0), maximum);

export const initialState = (): BudgetState => {
  const first = presets[0];

  return {
    scenario: { ...first.scenario },
    marginShare: marginShareOf(first.scenario.capacity, first.scenario.margin),
    presetId: first.id,
    customCapacity: false,
    pinned: null,
    fromReadout: [],
    readoutKeys: [],
    beforeReadout: null,
    presetBeforeReadout: null,
  };
};

const without = (marks: readonly Mark[], ...removed: Mark[]): Mark[] =>
  marks.filter((mark) => !removed.includes(mark));

/** Replaces the scenario wholesale, as loading a preset, a link, or the pinned scenario does. */
export const loadScenario = (
  state: BudgetState,
  scenario: Scenario,
  presetId: string | null,
): BudgetState => ({
  ...state,
  scenario: { ...scenario },
  marginShare: marginShareOf(scenario.capacity, scenario.margin),
  presetId,
  customCapacity: isCustomCapacity(scenario.capacity),
  fromReadout: [],
  readoutKeys: [],
  beforeReadout: null,
  presetBeforeReadout: null,
});

export const selectPreset = (state: BudgetState, id: string): BudgetState => {
  const preset = findPreset(id);

  return preset ? loadScenario(state, preset.scenario, preset.id) : state;
};

/** Sets one term. Any manual change deselects the preset. */
export const setTerm = (state: BudgetState, key: TermKey, value: number): BudgetState => {
  const count = clampCount(value);
  const scenario = { ...state.scenario, [key]: count };

  return {
    ...state,
    scenario,
    marginShare: key === 'margin' ? marginShareOf(scenario.capacity, count) : state.marginShare,
    presetId: null,
    fromReadout: without(state.fromReadout, key),
  };
};

/**
 * Sets the capacity and moves the margin with it, so the autocompact
 * threshold keeps its percentage of the window. Every other term keeps its
 * tokens, which is how a window that shrinks can leave the claims over it.
 */
export const setCapacity = (state: BudgetState, capacity: number): BudgetState => {
  const next = Math.min(Math.max(Math.round(capacity), 1), maximumTokenCount);

  return {
    ...state,
    scenario: {
      ...state.scenario,
      capacity: next,
      margin: marginForCapacity(next, state.marginShare),
    },
    presetId: null,
    fromReadout: without(state.fromReadout, 'capacity', 'margin'),
  };
};

/** The dropdown's choice: one of the listed sizes, or `custom`, which keeps the capacity as it is. */
export const chooseCapacity = (state: BudgetState, choice: number | 'custom'): BudgetState =>
  choice === 'custom'
    ? { ...state, customCapacity: true }
    : { ...setCapacity(state, choice), customCapacity: false };

/** Autocompact at a number of tokens. Returns the state unchanged if that is outside the window. */
export const setThresholdTokens = (state: BudgetState, threshold: number): BudgetState => {
  const margin = marginFromThreshold(state.scenario.capacity, threshold);

  return margin === null ? state : setTerm(state, 'margin', margin);
};

/** Autocompact at a percentage of the window. Returns the state unchanged if that is outside 0 to 100. */
export const setThresholdPercent = (state: BudgetState, percent: number): BudgetState => {
  const margin = marginFromPercent(state.scenario.capacity, percent);

  return margin === null ? state : setTerm(state, 'margin', margin);
};

export const pinCurrent = (state: BudgetState): BudgetState => ({
  ...state,
  pinned: { ...state.scenario },
});

export const clearPin = (state: BudgetState): BudgetState => ({ ...state, pinned: null });

/** Trades the current scenario for the pinned one, which takes the current one's place as A. */
export const swapWithPinned = (state: BudgetState): BudgetState => {
  if (!state.pinned) return state;

  const swapped = loadScenario(state, state.pinned, presetMatching(state.pinned)?.id ?? null);

  return { ...swapped, pinned: { ...state.scenario } };
};

/**
 * Fills the terms a readout reports and marks them "from your readout".
 * Generation is never touched, because the readout does not report it. A
 * refill, which runs when the person changes how a row maps, skips anything
 * they have edited since the last fill.
 */
export const fillFromReadout = (
  state: BudgetState,
  applied: AppliedReadout,
  { refill = false }: { refill?: boolean } = {},
): BudgetState => {
  const edited = refill ? state.readoutKeys.filter((key) => !state.fromReadout.includes(key)) : [];
  // A field the person edited after an earlier fill is theirs, so the backup takes its value and
  // Discard won't roll it back to something older.
  const before = { ...(state.beforeReadout ?? state.scenario) };
  let backupEdited = false;
  if (state.beforeReadout) {
    for (const key of state.readoutKeys) {
      if (!state.fromReadout.includes(key) && before[key] !== state.scenario[key]) {
        before[key] = state.scenario[key];
        backupEdited = true;
      }
    }
  }
  // A backup that now holds the person's own numbers no longer matches the preset it came from.
  const presetBefore = state.beforeReadout
    ? backupEdited
      ? null
      : state.presetBeforeReadout
    : state.presetId;
  const scenario = { ...state.scenario };
  const filled: Mark[] = [];
  let marginShare = state.marginShare;

  if (applied.capacityFromHeader && !edited.includes('capacity')) {
    scenario.capacity = applied.capacity;
    scenario.margin = marginForCapacity(applied.capacity, marginShare);
    filled.push('capacity');
    // The margin follows the capacity, so discarding has to put it back along with the capacity.
    if (scenario.margin !== state.scenario.margin) filled.push('margin');
  }

  // A mapping change can move a row away from a term. That term goes back to what it was before
  // the readout, or the row's tokens would count in the old place and the new one.
  const stale = refill
    ? state.fromReadout.filter(
        (mark): mark is TermKey =>
          mark !== 'capacity' &&
          !(mark in applied.values) &&
          !(mark === 'margin' && applied.capacityFromHeader),
      )
    : [];
  for (const key of stale) scenario[key] = before[key];

  for (const [key, value] of Object.entries(applied.values) as [TermKey, number][]) {
    if (edited.includes(key)) continue;

    scenario[key] = clampCount(value);
    filled.push(key);
  }

  if (filled.includes('margin') || filled.includes('capacity')) {
    marginShare = marginShareOf(scenario.capacity, scenario.margin);
  }

  // A row the new readout leaves out keeps its number, so it keeps its mark and stays discardable.
  const marks = [...new Set([...state.fromReadout, ...filled])].filter(
    (mark) => !stale.includes(mark as TermKey),
  );

  return {
    ...state,
    scenario,
    marginShare,
    presetId: filled.length > 0 ? null : state.presetId,
    customCapacity: filled.includes('capacity')
      ? isCustomCapacity(scenario.capacity)
      : state.customCapacity,
    fromReadout: marks,
    readoutKeys: [...new Set([...state.readoutKeys, ...filled])].filter(
      (key) => !stale.includes(key as TermKey),
    ),
    beforeReadout: filled.length > 0 || refill ? before : state.beforeReadout,
    presetBeforeReadout: filled.length > 0 || refill ? presetBefore : state.presetBeforeReadout,
  };
};

/** Puts back what the readout filled in, except for anything edited since. */
export const discardReadout = (state: BudgetState): BudgetState => {
  const before = state.beforeReadout;
  if (!before) {
    return {
      ...state,
      fromReadout: [],
      readoutKeys: [],
      beforeReadout: null,
      presetBeforeReadout: null,
    };
  }

  const scenario = { ...state.scenario };
  for (const mark of state.fromReadout) scenario[mark] = before[mark];

  return {
    ...state,
    scenario,
    marginShare: marginShareOf(scenario.capacity, scenario.margin),
    presetId: scenariosEqual(scenario, before) ? state.presetBeforeReadout : null,
    customCapacity: isCustomCapacity(scenario.capacity),
    fromReadout: [],
    readoutKeys: [],
    beforeReadout: null,
    presetBeforeReadout: null,
  };
};

/** The most a slider can show for a term; the text box accepts more. */
export const sliderValue = (key: TermKey, value: number): number =>
  Math.min(value, findTerm(key).sliderMax);
