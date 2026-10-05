import { describe, expect, it } from 'vitest';

import { thresholdPercent } from './autocompact';
import { usable } from './budget';
import {
  chooseCapacity,
  clearPin,
  discardReadout,
  fillFromReadout,
  initialState,
  loadScenario,
  pinCurrent,
  selectPreset,
  setCapacity,
  setTerm,
  setThresholdPercent,
  setThresholdTokens,
  sliderValue,
  swapWithPinned,
} from './budget-state';
import { applyReadout, defaultMapping, parseReadout } from './readout-parser';

describe('starting state', () => {
  it('opens on the lean preset', () => {
    const state = initialState();

    expect(state.presetId).toBe('lean');
    expect(usable(state.scenario)).toBe(810_000);
    expect(state.pinned).toBeNull();
  });
});

describe('manual changes', () => {
  it('deselect the preset', () => {
    const state = setTerm(initialState(), 'history', 41_000);

    expect(state.presetId).toBeNull();
    expect(state.scenario.history).toBe(41_000);
  });

  it('never change the state they were given', () => {
    const state = initialState();
    setTerm(state, 'history', 41_000);

    expect(state.scenario.history).toBe(40_000);
    expect(state.presetId).toBe('lean');
  });

  it('setting history to 900K on the lean preset gives usable −50K', () => {
    const state = setTerm(selectPreset(initialState(), 'lean'), 'history', 900_000);

    expect(usable(state.scenario)).toBe(-50_000);
  });

  it('accepts a term larger than its slider’s maximum, and the slider shows its end', () => {
    const state = setTerm(initialState(), 'instructions', 500_000);

    expect(state.scenario.instructions).toBe(500_000);
    expect(sliderValue('instructions', 500_000)).toBe(200_000);
  });

  it('caps a term at a sane maximum and never goes negative', () => {
    expect(setTerm(initialState(), 'history', -5).scenario.history).toBe(0);
    expect(setTerm(initialState(), 'history', 1e15).scenario.history).toBe(10_000_000_000);
  });
});

describe('capacity and the autocompact threshold', () => {
  it('sets margin to 100K at 90% on 1M, and keeps 90% at 200K for a 20K margin', () => {
    let state = setThresholdPercent(initialState(), 90);
    expect(state.scenario.margin).toBe(100_000);

    state = chooseCapacity(state, 200_000);
    expect(state.scenario.capacity).toBe(200_000);
    expect(state.scenario.margin).toBe(20_000);
    expect(thresholdPercent(state.scenario.capacity, state.scenario.margin)).toBe(90);
  });

  it('keeps the percentage when the margin was set another way', () => {
    let state = setTerm(initialState(), 'margin', 150_000);
    state = chooseCapacity(state, 200_000);

    expect(state.scenario.margin).toBe(30_000);
  });

  it('links the token input to the margin in both directions', () => {
    const state = setThresholdTokens(initialState(), 850_000);

    expect(state.scenario.margin).toBe(150_000);
    expect(thresholdPercent(state.scenario.capacity, state.scenario.margin)).toBe(85);
  });

  it('ignores a threshold outside the window', () => {
    const state = initialState();

    expect(setThresholdTokens(state, 2_000_000)).toBe(state);
    expect(setThresholdPercent(state, 120)).toBe(state);
  });

  it('keeps the percentage through typing a custom capacity one digit at a time', () => {
    let state = chooseCapacity(initialState(), 'custom');
    for (const capacity of [4, 40, 400, 4_000, 40_000, 400_000])
      state = setCapacity(state, capacity);

    expect(state.customCapacity).toBe(true);
    expect(state.scenario.capacity).toBe(400_000);
    expect(state.scenario.margin).toBe(40_000);
  });

  it('shows the over-committed state when 200K cannot hold the terms', () => {
    const deep = selectPreset(initialState(), 'deep');
    const small = chooseCapacity(deep, 200_000);

    expect(usable(small.scenario)).toBeLessThan(0);
    expect(small.presetId).toBeNull();
  });

  it('supports custom windows such as 400K and 2M', () => {
    const lean = initialState();

    expect(usable(setCapacity(lean, 400_000).scenario)).toBe(400_000 - 90_000 - 40_000);
    expect(usable(setCapacity(lean, 2_000_000).scenario)).toBe(2_000_000 - 90_000 - 200_000);
  });

  it('stays in custom mode for a custom value that equals a listed size', () => {
    const state = setCapacity(chooseCapacity(initialState(), 'custom'), 200_000);

    expect(state.customCapacity).toBe(true);
  });

  it('chooses a listed size without custom mode', () => {
    const state = chooseCapacity(chooseCapacity(initialState(), 'custom'), 200_000);

    expect(state.customCapacity).toBe(false);
  });
});

describe('presets', () => {
  it('load every number and leave a pin alone', () => {
    const pinned = pinCurrent(initialState());
    const state = selectPreset(pinned, 'deep');

    expect(state.presetId).toBe('deep');
    expect(state.scenario.history).toBe(600_000);
    expect(state.pinned).toEqual(pinned.pinned);
  });

  it('open a window of a custom size in custom mode only when needed', () => {
    expect(selectPreset(initialState(), 'small-window').customCapacity).toBe(false);
    expect(
      loadScenario(initialState(), { ...initialState().scenario, capacity: 400_000 }, null)
        .customCapacity,
    ).toBe(true);
  });
});

describe('A/B comparison', () => {
  it('pins MCP-off as A, loads MCP-on, and moves usable by +172K with only tools changed', () => {
    let state = selectPreset(initialState(), 'mcp-heavy');
    state = pinCurrent(state);
    state = selectPreset(state, 'tool-search');

    expect(usable(state.scenario) - usable(state.pinned!)).toBe(172_000);
    expect(state.pinned!.tools).toBe(180_000);
    expect(state.scenario.tools).toBe(8_000);
  });

  it('swaps the current scenario with A, then back', () => {
    let state = selectPreset(initialState(), 'mcp-heavy');
    state = selectPreset(pinCurrent(state), 'tool-search');

    const swapped = swapWithPinned(state);
    expect(swapped.scenario.tools).toBe(180_000);
    expect(swapped.pinned!.tools).toBe(8_000);
    expect(swapped.presetId).toBe('mcp-heavy');

    const back = swapWithPinned(swapped);
    expect(back.scenario.tools).toBe(8_000);
    expect(back.presetId).toBe('tool-search');
  });

  it('has nothing to swap without a pin, and clears one', () => {
    const state = initialState();

    expect(swapWithPinned(state)).toBe(state);
    expect(clearPin(pinCurrent(state)).pinned).toBeNull();
  });

  it('keeps A as a copy, so editing the current scenario does not change it', () => {
    const state = setTerm(pinCurrent(initialState()), 'history', 500_000);

    expect(state.pinned!.history).toBe(40_000);
  });
});

describe('filling from a readout', () => {
  const readout = [
    '190k/1000k tokens (19%)',
    'System prompt: 18k tokens',
    'System tools: 12.5k tokens',
    'Messages: 40k tokens',
    'Autocompact buffer: 119.5k tokens',
    'Free space: 810k',
  ].join('\n');
  const applied = applyReadout(parseReadout(readout), defaultMapping, 1_000_000);

  it('fills the reported terms, marks them, and leaves generation alone', () => {
    const start = selectPreset(initialState(), 'deep');
    const state = fillFromReadout(start, applied);

    expect(state.scenario).toMatchObject({
      capacity: 1_000_000,
      instructions: 18_000,
      tools: 12_500,
      history: 40_000,
      margin: 119_500,
      generation: 32_000,
    });
    expect([...state.fromReadout].sort()).toEqual([
      'capacity',
      'history',
      'instructions',
      'margin',
      'tools',
    ]);
    expect(state.presetId).toBeNull();
  });

  it('clears a mark when the person edits that value', () => {
    const state = setTerm(fillFromReadout(initialState(), applied), 'history', 50_000);

    expect(state.fromReadout).not.toContain('history');
    expect(state.fromReadout).toContain('instructions');
  });

  it('takes capacity from the header and keeps the current one without it', () => {
    const noHeader = applyReadout(
      parseReadout('System prompt: 18k tokens'),
      defaultMapping,
      200_000,
    );
    const state = fillFromReadout(chooseCapacity(initialState(), 200_000), noHeader);

    expect(state.scenario.capacity).toBe(200_000);
    expect(state.fromReadout).toEqual(['instructions']);
  });

  it('fills a window of a custom size from the header', () => {
    const custom = applyReadout(
      parseReadout('10k/400k tokens\nMessages: 10k tokens'),
      defaultMapping,
      1_000_000,
    );
    const state = fillFromReadout(initialState(), custom);

    expect(state.scenario.capacity).toBe(400_000);
    expect(state.customCapacity).toBe(true);
  });

  it('discards the fill and restores the preset', () => {
    const start = initialState();
    const filled = fillFromReadout(start, applied);
    const discarded = discardReadout(filled);

    expect(discarded.scenario).toEqual(start.scenario);
    expect(discarded.presetId).toBe('lean');
    expect(discarded.fromReadout).toEqual([]);
    expect(discarded.beforeReadout).toBeNull();
  });

  it('puts the margin back too when a readout changed the capacity without an autocompact row', () => {
    const readout = applyReadout(
      parseReadout('claude-opus-5 · 100k/400k tokens (25%)\nSystem prompt: 18k tokens'),
      defaultMapping,
      400_000,
    );
    const start = initialState();
    const filled = fillFromReadout(start, readout);

    expect(filled.scenario.capacity).toBe(400_000);
    expect(filled.scenario.margin).not.toBe(start.scenario.margin);
    expect(filled.fromReadout).toContain('margin');

    const discarded = discardReadout(filled);

    expect(discarded.scenario.capacity).toBe(start.scenario.capacity);
    expect(discarded.scenario.margin).toBe(start.scenario.margin);
  });

  it('keeps edits when discarding, and drops the preset', () => {
    const edited = setTerm(fillFromReadout(initialState(), applied), 'history', 50_000);
    const discarded = discardReadout(edited);

    expect(discarded.scenario.history).toBe(50_000);
    expect(discarded.scenario.instructions).toBe(18_000);
    expect(discarded.presetId).toBeNull();
  });

  it('fills again from a second paste without losing the original to restore', () => {
    const first = fillFromReadout(initialState(), applied);
    const second = fillFromReadout(first, applied);

    expect(discardReadout(second).scenario).toEqual(initialState().scenario);
  });

  it('skips values edited since the last fill when a mapping change fills again', () => {
    const edited = setTerm(fillFromReadout(initialState(), applied), 'history', 50_000);
    const refilled = fillFromReadout(edited, applied, { refill: true });

    expect(refilled.scenario.history).toBe(50_000);
    expect(refilled.fromReadout).not.toContain('history');
    expect(discardReadout(refilled).scenario.history).toBe(50_000);
  });

  it('keeps the marks of rows a replacement readout leaves out, so they stay discardable', () => {
    const first = fillFromReadout(initialState(), applied);
    const partial = applyReadout(
      parseReadout('System prompt: 20k tokens'),
      defaultMapping,
      1_000_000,
    );
    const replaced = fillFromReadout(first, partial);

    expect(replaced.scenario.instructions).toBe(20_000);
    expect(replaced.fromReadout).toContain('history');
    expect(discardReadout(replaced).scenario).toEqual(initialState().scenario);
  });

  it('keeps the earlier marks when a refill adds a term', () => {
    const partial = applyReadout(
      parseReadout('System prompt: 18k tokens'),
      defaultMapping,
      1_000_000,
    );
    const first = fillFromReadout(initialState(), partial);
    const refilled = fillFromReadout(first, applied, { refill: true });

    expect(refilled.fromReadout).toContain('instructions');
    expect(refilled.fromReadout).toContain('history');
  });
});
