import { isSeed } from './deal';

export const modes = ['map', 'sort', 'lint'] as const;
export type Mode = (typeof modes)[number];

export const isMode = (value: unknown): value is Mode =>
  typeof value === 'string' && (modes as readonly string[]).includes(value);

export type SharedView = { mode: Mode; seed: number | null };

/**
 * The mode, and for the game its seed, as `key=value` pairs for the URL's
 * hash, which never reaches a server. Pasted or uploaded instructions and
 * custom cards never go in a link.
 */
export const encodeView = ({ mode, seed }: SharedView): string => {
  const parameters = new URLSearchParams({ mode });
  if (mode === 'sort' && seed !== null) parameters.set('seed', String(seed));

  return parameters.toString();
};

/** Reads a shared view back, keeping only what's valid. Returns null when nothing applies. */
export const decodeView = (query: string): SharedView | null => {
  const parameters = new URLSearchParams(query);
  const mode = parameters.get('mode');
  if (!isMode(mode)) return null;

  const text = parameters.get('seed');
  const seed = text !== null && /^\d{1,10}$/.test(text) ? Number(text) : null;

  return { mode, seed: mode === 'sort' && seed !== null && isSeed(seed) ? seed : null };
};
