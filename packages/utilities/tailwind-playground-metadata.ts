import { createHash } from 'node:crypto';

import type { PlaygroundTheme } from './tailwind-playground-types.ts';

export type TailwindPlaygroundMetadata = {
  height: number;
  css?: string;
  theme: PlaygroundTheme;
  title?: string;
};

export type TailwindPlaygroundFingerprintContext = {
  css?: string;
  title?: string;
};
const optionPattern =
  /(?:^|\s)([a-z][a-z-]*)=(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s'"]+))/g;
const knownOptions = new Set(['height', 'css', 'theme', 'title']);
const parseOptions = (meta: string, allowed = knownOptions): Map<string, string> => {
  const options = new Map<string, string>();
  const remainder = meta.replace(
    optionPattern,
    (_, key: string, doubleValue?: string, singleValue?: string, bareValue?: string) => {
      if (!allowed.has(key) || options.has(key))
        throw new Error(`Unknown or duplicate playground option '${key}'.`);
      options.set(
        key,
        (doubleValue ?? singleValue ?? bareValue ?? '').replace(/\\([\\"'])/g, '$1'),
      );
      return '';
    },
  );
  if (
    remainder
      .trim()
      .replace(/^\{\s*\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*\s*\}\s*/, '')
      .trim()
  )
    throw new Error(`Invalid playground metadata '${meta}'.`);
  return options;
};

/** Parse the exact standalone `tailwind` marker and its options. */
export const parseTailwindPlaygroundMetadata = (
  meta?: string,
): TailwindPlaygroundMetadata | null => {
  if (!meta) return null;
  const masked = meta.replace(optionPattern, (match) => ' '.repeat(match.length));
  const tokens = masked.trim().split(/\s+/);
  if (!tokens.includes('tailwind')) return null;
  if (tokens.filter((token) => token === 'tailwind').length !== 1)
    throw new Error('Duplicate tailwind marker.');
  const marker = /(?:^|\s)tailwind(?=\s|$)/.exec(masked);
  if (!marker) return null;
  const markerStart = marker.index + marker[0].length - 'tailwind'.length;
  const options = parseOptions(
    `${meta.slice(0, markerStart)} ${meta.slice(markerStart + 'tailwind'.length)}`,
  );
  const heightText = options.get('height');
  const height = Number(heightText);
  if (!heightText || !/^\d+$/.test(heightText))
    throw new Error('Playground height must contain digits only.');
  if (!Number.isSafeInteger(height) || height <= 0)
    throw new Error('Playground height must be a positive safe integer.');
  const theme = options.get('theme') ?? 'light';
  if (theme !== 'light' && theme !== 'dark' && theme !== 'system')
    throw new Error(`Invalid playground theme '${theme}'.`);
  const css = options.get('css');
  if (css !== undefined && !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(css))
    throw new Error('CSS playground names must be kebab-case.');
  const title = options.get('title');
  if (title !== undefined && !title.trim()) throw new Error('Playground title cannot be empty.');
  return { height, css, theme, title };
};

/** Parse a named CSS fence's metadata, without its language prefix. */
export const parseTailwindPlaygroundStyleMetadata = (meta?: string): { name: string } | null => {
  if (!meta) return null;
  if (
    !/playground\s*=/.test(meta) &&
    ![...meta.matchAll(optionPattern)].some((match) => match[1] === 'playground')
  )
    return null;
  const values = parseOptions(meta, new Set(['playground']));
  const name = values.get('playground') ?? '';
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name))
    throw new Error('CSS playground names must be kebab-case.');
  return { name };
};

export const resolveTailwindPlaygroundTitle = (
  authoredTitle: string | undefined,
  heading: string | undefined,
  ordinal: number,
): string =>
  authoredTitle ?? (heading ? `${heading} — Example ${ordinal + 1}` : `Example ${ordinal + 1}`);

export const playgroundFingerprint = (
  html: string,
  meta?: string,
  context: TailwindPlaygroundFingerprintContext = {},
): string =>
  createHash('sha256')
    .update(`${html}\0${meta ?? ''}\0${context.css ?? ''}\0${context.title ?? ''}`)
    .digest('hex');
