import { clampTo, cloneConfig, defaultConfig, markerIds, markers, ranges } from './loop-config';
import type { Config, Governors, MarkerId, Range } from './loop-config';

/**
 * Writes a configuration, its seed, and the pinned comparison into the URL's
 * hash, which never reaches a server. A replayed log never goes in a link.
 */

const governorLetters: Record<keyof Governors, string> = {
  maxIterations: 'm',
  budget: 'b',
  stall: 's',
  repeatedFailure: 'r',
  stopFile: 'x',
};

const numberKeys = {
  p: ['p', ranges.p],
  k: ['k', ranges.k],
  e: ['e', ranges.e],
  c0: ['c0', ranges.c0],
  r: ['r', ranges.r],
  g: ['g', ranges.g],
  maxIterations: ['mi', ranges.maxIterations],
  budget: ['b', ranges.budget],
  stallM: ['sm', ranges.stallM],
  repeatChance: ['rc', ranges.repeatChance],
  cheatWithout: ['cn', ranges.cheat],
  cheatWith: ['cw', ranges.cheat],
  runs: ['n', ranges.runs],
  seed: ['s', ranges.seed],
} as const satisfies Partial<Record<keyof Config, readonly [string, Range]>>;

const short = (value: number): string => String(Number(value.toFixed(6)));

export const encodeConfig = (config: Config): string => {
  const parameters = new URLSearchParams();

  for (const [field, [key]] of Object.entries(numberKeys)) {
    parameters.set(key, short(config[field as keyof typeof numberKeys]));
  }
  parameters.set('m', config.marker);
  parameters.set(
    'gv',
    (Object.keys(governorLetters) as (keyof Governors)[])
      .filter((id) => config.governors[id])
      .map((id) => governorLetters[id])
      .join(''),
  );

  const flags = [
    config.dual ? 'd' : '',
    config.failureMode === 'closed' ? 'c' : '',
    config.context === 'accumulating' ? 'a' : '',
    config.impossible ? 'i' : '',
    config.honestWayOut ? 'h' : '',
  ].join('');
  if (flags) parameters.set('f', flags);

  const defaults = defaultConfig().ladder;
  if (markerIds.some((id) => config.ladder[id] !== defaults[id])) {
    parameters.set('q', markerIds.map((id) => short(config.ladder[id])).join(','));
  }

  return parameters.toString();
};

const readNumber = (text: string | null, range: Range): number | null => {
  if (text === null || text.trim() === '') return null;

  const value = Number(text);

  return Number.isFinite(value) ? clampTo(range, value) : null;
};

/** Reads a configuration back. Missing or broken values fall back to the defaults. */
export const decodeConfig = (query: string): Config | null => {
  const parameters = new URLSearchParams(query);
  if (!parameters.has('p') && !parameters.has('m')) return null;

  const config = cloneConfig(defaultConfig());

  for (const [field, [key, range]] of Object.entries(numberKeys)) {
    const value = readNumber(parameters.get(key), range);
    if (value !== null) config[field as keyof typeof numberKeys] = value;
  }

  const marker = parameters.get('m');
  if (marker && (markerIds as string[]).includes(marker)) config.marker = marker as MarkerId;

  const letters = parameters.get('gv') ?? '';
  for (const [id, letter] of Object.entries(governorLetters)) {
    config.governors[id as keyof Governors] = letters.includes(letter);
  }

  const flags = parameters.get('f') ?? '';
  config.dual = flags.includes('d');
  config.failureMode = flags.includes('c') ? 'closed' : 'open';
  config.context = flags.includes('a') ? 'accumulating' : 'fresh';
  config.impossible = flags.includes('i');
  config.honestWayOut = flags.includes('h');
  if (config.impossible) config.p = 0;

  const ladder = parameters.get('q')?.split(',') ?? [];
  if (ladder.length === markers.length) {
    markers.forEach((marker, index) => {
      const value = readNumber(ladder[index], ranges.q);
      if (value !== null) config.ladder[marker.id] = value;
    });
  }

  return config;
};

export type SharedState = { config: Config; pinned: Config | null };

export const encodeState = ({ config, pinned }: SharedState): string => {
  const parameters = new URLSearchParams(encodeConfig(config));
  if (pinned) parameters.set('a', encodeConfig(pinned));

  return parameters.toString();
};

export const decodeState = (query: string): SharedState | null => {
  const config = decodeConfig(query);
  if (!config) return null;

  const pinned = new URLSearchParams(query).get('a');

  return { config, pinned: pinned ? decodeConfig(pinned) : null };
};
