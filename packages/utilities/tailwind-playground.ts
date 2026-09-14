import { JSDOM } from 'jsdom';
import postcss from 'postcss';
import { SAXParser } from 'parse5-sax-parser';

import type { PlaygroundDefinition } from './tailwind-playground-types.ts';
import {
  parseTailwindPlaygroundMetadata,
  parseTailwindPlaygroundStyleMetadata,
  playgroundFingerprint,
  resolveTailwindPlaygroundTitle,
} from './tailwind-playground-metadata.ts';

const forbiddenTags = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'base',
  'meta',
  'link',
  'style',
  'frame',
  'frameset',
  'portal',
  'fencedframe',
]);
const forbiddenAtRules = new Set(['import', 'source', 'config', 'plugin', 'reference']);
const playgroundDom = new JSDOM('', { runScripts: 'outside-only' });
const playgroundParser = new playgroundDom.window.DOMParser();
const attributes = (element: Element): Record<string, string> =>
  Object.fromEntries([...element.attributes].map((attribute) => [attribute.name, attribute.value]));
const normalizeClasses = (document: Document): string[] =>
  [
    ...new Set(
      [...document.querySelectorAll('[class]')]
        .flatMap((element) => [...element.classList])
        .filter(Boolean),
    ),
  ].sort();

/** Extract decoded class tokens from a raw Markdown HTML fragment. */
export const extractTailwindCandidatesFromHtml = (html: string): string[] =>
  normalizeClasses(playgroundParser.parseFromString(`<body>${html}</body>`, 'text/html'));

const validateHtml = (document: Document): void => {
  const inspect = (root: ParentNode): void => {
    for (const element of root.querySelectorAll('*')) {
      if (forbiddenTags.has(element.localName))
        throw new Error(`Forbidden HTML element <${element.localName}>.`);
      for (const attribute of [...element.attributes]) {
        if (/^on/i.test(attribute.name))
          throw new Error(`Event handler attribute '${attribute.name}' is forbidden.`);
        if (/^(href|src|action|formaction|xlink:href)$/i.test(attribute.name)) {
          const compact = [...attribute.value]
            .filter((character) => character.charCodeAt(0) > 32)
            .join('')
            .toLowerCase();
          if (
            /^(?:javascript|vbscript|file):/.test(compact) ||
            /^data:text\/html(?:[;,]|$)/.test(compact)
          )
            throw new Error(`Executable URL in '${attribute.name}' is forbidden.`);
        }
      }
      if (element.localName === 'template') inspect((element as HTMLTemplateElement).content);
    }
  };
  inspect(document);
  if (document.head.children.length > 0)
    throw new Error('Head elements are forbidden in a playground.');
};

/** Parse and validate authored HTML at build time. */
export const extractTailwindPlaygroundHtml = (
  html: string,
): Pick<PlaygroundDefinition, 'html' | 'htmlAttributes' | 'bodyAttributes' | 'candidates'> => {
  const explicit: string[] = [];
  const tokenizer = new SAXParser();
  tokenizer.on('startTag', (token) => {
    if (forbiddenTags.has(token.tagName))
      throw new Error(`Forbidden HTML element <${token.tagName}>.`);
    if (['html', 'head', 'body'].includes(token.tagName)) explicit.push(token.tagName);
  });
  tokenizer.end(html);
  tokenizer.destroy();
  for (const tag of ['html', 'head', 'body'])
    if (explicit.filter((value) => value === tag).length > 1)
      throw new Error(`Duplicate explicit <${tag}> element.`);
  const document =
    explicit.length === 0
      ? playgroundParser.parseFromString(`<body>${html}</body>`, 'text/html')
      : playgroundParser.parseFromString(html, 'text/html');
  if (!document) throw new Error('Unable to parse playground HTML.');
  validateHtml(document);
  return {
    html: document.body.innerHTML,
    htmlAttributes: attributes(document.documentElement),
    bodyAttributes: attributes(document.body),
    candidates: normalizeClasses(document),
  };
};

/** Validate CSS with PostCSS and return the original fragment. */
export const validateTailwindPlaygroundCss = (css: string): string => {
  const root = postcss.parse(css);
  root.walkAtRules((rule) => {
    // PostCSS can split an escaped identifier between name and params.
    if (rule.name.includes('\\') || (!rule.raws.afterName && rule.params.startsWith('\\')))
      throw new Error('Escaped CSS at-rule names are forbidden in playground fragments.');
    if (forbiddenAtRules.has(rule.name.toLowerCase()))
      throw new Error(`Forbidden CSS at-rule @${rule.name}.`);
  });
  return css;
};

export type TailwindPlaygroundFence = {
  lang: 'html' | 'css';
  value: string;
  meta?: string;
  line: number;
  ordinal: number;
  heading?: string;
};

/** Build canonical definitions from all HTML and CSS fences in one Markdown source. */
export const extractTailwindPlaygrounds = (
  fences: TailwindPlaygroundFence[],
  sourcePath: string,
): PlaygroundDefinition[] => {
  const styles = new Map<string, string>();
  for (const fence of fences) {
    if (fence.lang !== 'css') continue;
    let style;
    try {
      style = parseTailwindPlaygroundStyleMetadata(fence.meta);
    } catch (error) {
      throw new Error(
        `${sourcePath}:${fence.line}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (!style) continue;
    try {
      if (styles.has(style.name)) throw new Error(`Duplicate CSS playground '${style.name}'.`);
      styles.set(style.name, validateTailwindPlaygroundCss(fence.value));
    } catch (error) {
      throw new Error(
        `${sourcePath}:${fence.line}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
  const definitions: PlaygroundDefinition[] = [];
  for (const fence of fences) {
    let metadata;
    try {
      metadata = fence.lang === 'html' ? parseTailwindPlaygroundMetadata(fence.meta) : null;
    } catch (error) {
      throw new Error(
        `${sourcePath}:${fence.line}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    if (!metadata) continue;
    let parsed;
    try {
      parsed = extractTailwindPlaygroundHtml(fence.value);
    } catch (error) {
      throw new Error(
        `${sourcePath}:${fence.line}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    const css = metadata.css ? styles.get(metadata.css) : undefined;
    if (metadata.css && !styles.has(metadata.css))
      throw new Error(`${sourcePath}:${fence.line}: Unknown CSS playground '${metadata.css}'.`);
    const title = resolveTailwindPlaygroundTitle(metadata.title, fence.heading, definitions.length);
    definitions.push({
      sourcePath,
      ordinal: definitions.length,
      line: fence.line,
      sourceFingerprint: playgroundFingerprint(fence.value, fence.meta, { css: css ?? '', title }),
      ...parsed,
      height: metadata.height,
      theme: metadata.theme,
      title,
      css: css ?? '',
      ...(metadata.css
        ? { cssName: metadata.css, cssAnchor: `playground-css-${metadata.css}` }
        : {}),
    });
  }
  return definitions;
};
