/** The authored browser preference, independent of the surrounding website theme. */
export type PlaygroundTheme = 'light' | 'dark' | 'system';

/** Canonical build input extracted once from a Markdown source. */
export type PlaygroundDefinition = {
  sourcePath: string;
  ordinal: number;
  line: number;
  sourceFingerprint: string;
  html: string;
  htmlAttributes: Record<string, string>;
  bodyAttributes: Record<string, string>;
  candidates: string[];
  height: number;
  theme: PlaygroundTheme;
  title: string;
  css: string;
  cssName?: string;
  cssAnchor?: string;
};

export type PlaygroundInputs = { version: 1; examples: PlaygroundDefinition[] };

/** The only playground data needed by the Markdown renderer. */
export type PlaygroundManifestEntry = Pick<
  PlaygroundDefinition,
  'sourcePath' | 'ordinal' | 'sourceFingerprint' | 'height' | 'theme' | 'title' | 'cssAnchor'
> & { src: string; cssSrc: string };

export type PlaygroundManifest = {
  version: 1;
  examples: PlaygroundManifestEntry[];
  /** Relative public filenames mapped to SHA-256 digests of their bytes. */
  files: Record<string, string>;
  configurationCount: number;
};
