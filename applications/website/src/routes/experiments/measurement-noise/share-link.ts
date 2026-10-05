import type { Endpoint } from './analysis';
import { DEFAULT_SEED, MAX_SEED } from './bootstrap';
import { alphaOptions, powerOptions } from './planner';
import { findPreset } from './presets';
import type { PresetId } from './presets';

/** The settings a link carries. Uploaded, pasted, or typed data is never part of it. */
export type LinkSettings = {
  /** The preset on screen, or null when the data is the person’s own. */
  preset: PresetId | null;
  endpoint: Endpoint;
  /** Pair tasks when the data allows it. */
  paired: boolean;
  seed: number;
  alpha: number;
  power: number;
  /** The planner's σ and δ, or null while they follow the data. */
  sigma: number | null;
  delta: number | null;
  /** The speedup the person felt, in percent, or null. */
  felt: number | null;
};

export const defaultSettings: LinkSettings = {
  preset: 'five-unpaired',
  endpoint: 'time',
  paired: true,
  seed: DEFAULT_SEED,
  alpha: 0.05,
  power: 0.8,
  sigma: null,
  delta: null,
  felt: null,
};

/** The largest σ or δ a link may set, in minutes. Anything bigger is a typo or a hostile link. */
export const MAX_PLANNER_VALUE = 10_000;
export const MAX_FELT = 100;

/** Writes the settings as `key=value` pairs for the URL's hash, which never reaches a server. */
export const encodeSettings = (settings: LinkSettings): string => {
  const parameters = new URLSearchParams();

  parameters.set('preset', settings.preset ?? 'own');
  parameters.set('endpoint', settings.endpoint);
  parameters.set('pair', settings.paired ? '1' : '0');
  parameters.set('seed', String(settings.seed));
  parameters.set('alpha', String(settings.alpha));
  parameters.set('power', String(settings.power));
  if (settings.sigma !== null) parameters.set('sigma', String(settings.sigma));
  if (settings.delta !== null) parameters.set('delta', String(settings.delta));
  if (settings.felt !== null) parameters.set('felt', String(settings.felt));

  return parameters.toString();
};

const readNumber = (text: string | null, min: number, max: number): number | null => {
  if (text === null || !/^-?\d+(\.\d+)?$/.test(text)) return null;

  const value = Number(text);

  return value >= min && value <= max ? value : null;
};

const endpoints: readonly Endpoint[] = ['time', 'rework', 'review'];

/**
 * Reads a link's hash back. A field that's missing or invalid falls back to its
 * default. Returns null for a hash that isn't settings at all.
 */
export const decodeSettings = (hash: string): (LinkSettings & { ownData: boolean }) | null => {
  const parameters = new URLSearchParams(hash.replace(/^#/, ''));
  if (!parameters.has('preset') && !parameters.has('endpoint')) return null;

  const presetText = parameters.get('preset');
  const preset = findPreset(presetText)?.id ?? null;
  const endpointText = parameters.get('endpoint') as Endpoint | null;
  const seed = readNumber(parameters.get('seed'), 0, MAX_SEED);
  const alpha = readNumber(parameters.get('alpha'), 0, 1);
  const power = readNumber(parameters.get('power'), 0, 1);
  const sigma = readNumber(parameters.get('sigma'), 0, MAX_PLANNER_VALUE);
  const delta = readNumber(parameters.get('delta'), 0, MAX_PLANNER_VALUE);

  return {
    preset: preset ?? (presetText === 'own' ? null : defaultSettings.preset),
    ownData: presetText === 'own',
    endpoint:
      endpointText && endpoints.includes(endpointText) ? endpointText : defaultSettings.endpoint,
    paired: parameters.get('pair') !== '0',
    seed: seed !== null && Number.isInteger(seed) ? seed : defaultSettings.seed,
    alpha:
      alpha !== null && (alphaOptions as readonly number[]).includes(alpha)
        ? alpha
        : defaultSettings.alpha,
    power:
      power !== null && (powerOptions as readonly number[]).includes(power)
        ? power
        : defaultSettings.power,
    sigma: sigma !== null && sigma > 0 ? sigma : null,
    delta: delta !== null && delta > 0 ? delta : null,
    felt: readNumber(parameters.get('felt'), -MAX_FELT, MAX_FELT),
  };
};
