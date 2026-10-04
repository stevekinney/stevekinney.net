import { maximumTokenCount, termKeys } from './budget';
import type { Scenario } from './budget';
import { findPreset } from './presets';

export type SharedState = {
  scenario: Scenario;
  presetId: string | null;
  pinned: Scenario | null;
};

const shortKeys = {
  capacity: 'c',
  instructions: 'i',
  history: 'h',
  tools: 't',
  generation: 'g',
  margin: 'm',
} as const;

const scenarioKeys = ['capacity', ...termKeys] as const;

const encodeScenario = (scenario: Scenario): string =>
  scenarioKeys.map((key) => scenario[key]).join(',');

const readCount = (text: string | null): number | null => {
  if (text === null || !/^\d{1,11}$/.test(text)) return null;

  const count = Number(text);

  return count <= maximumTokenCount ? count : null;
};

const decodeScenario = (text: string | null): Scenario | null => {
  if (text === null) return null;

  const parts = text.split(',');
  if (parts.length !== scenarioKeys.length) return null;

  const counts = parts.map(readCount);
  if (counts.some((count) => count === null) || (counts[0] as number) < 1) return null;

  return Object.fromEntries(scenarioKeys.map((key, index) => [key, counts[index]])) as Scenario;
};

/**
 * Writes the capacity, the five terms, and the pinned scenario, and nothing
 * else, as `key=value` pairs for the URL's hash, which never reaches a server.
 * A pasted readout or a list of files never goes in a link.
 */
export const encodeState = ({ scenario, presetId, pinned }: SharedState): string => {
  const parameters = new URLSearchParams();

  for (const key of scenarioKeys) parameters.set(shortKeys[key], String(scenario[key]));
  if (presetId) parameters.set('preset', presetId);
  if (pinned) parameters.set('a', encodeScenario(pinned));

  return parameters.toString();
};

/** Reads a shared state back. Returns null unless the link carries a complete scenario. */
export const decodeState = (query: string): SharedState | null => {
  const parameters = new URLSearchParams(query);
  const counts = scenarioKeys.map((key) => readCount(parameters.get(shortKeys[key])));

  if (counts.some((count) => count === null) || (counts[0] as number) < 1) return null;

  const scenario = Object.fromEntries(
    scenarioKeys.map((key, index) => [key, counts[index]]),
  ) as Scenario;
  const presetId = parameters.get('preset');

  return {
    scenario,
    presetId: findPreset(presetId) ? presetId : null,
    pinned: decodeScenario(parameters.get('a')),
  };
};
