import type { PlaygroundDefinition } from '@stevekinney/utilities/tailwind-playground-types';

const escapeAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
const attributes = (values: Record<string, string>): string =>
  Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('');

/** Render the validated source without compiling teaching HTML through Svelte. */
export const renderPlaygroundDocument = (
  example: PlaygroundDefinition,
  stylesheetUrl: string,
): string => {
  const rootAttributes = { lang: 'en', ...example.htmlAttributes };
  const head = [
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeAttribute(example.title)}</title>`,
    `<link rel="stylesheet" href="${escapeAttribute(stylesheetUrl)}"></head>`,
  ].join('');
  const body = `<body${attributes(example.bodyAttributes)}>${example.html}</body>`;
  return `<!doctype html>\n<html${attributes(rootAttributes)}>${head}${body}</html>\n`;
};
