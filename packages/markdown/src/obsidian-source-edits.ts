import type { NormalizedMarkdown, SourceMapping } from './obsidian-types.ts';

export type SourceEdit = { start: number; end: number; value: string };

/** Apply positioned edits; untouched spans remain byte-for-byte identical. */
export const applySourceEdits = (
  source: string,
  edits: readonly SourceEdit[],
): Pick<NormalizedMarkdown, 'markdown' | 'sourceMap'> => {
  const chunks: string[] = [];
  const sourceMap: SourceMapping[] = [];
  let cursor = 0;
  let generated = 0;
  const append = (value: string, start: number, end: number): void => {
    chunks.push(value);
    sourceMap.push({
      generatedStart: generated,
      generatedEnd: generated + value.length,
      sourceStart: start,
      sourceEnd: end,
    });
    generated += value.length;
  };
  for (const edit of [...edits].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (edit.start < cursor) continue;
    if (edit.start < 0 || edit.end < edit.start || edit.end > source.length)
      throw new Error('Invalid Obsidian source edit offsets.');
    if (cursor < edit.start) append(source.slice(cursor, edit.start), cursor, edit.start);
    append(edit.value, edit.start, edit.end);
    cursor = edit.end;
  }
  if (cursor < source.length) append(source.slice(cursor), cursor, source.length);
  return { markdown: chunks.join(''), sourceMap };
};

export const escapeObsidianHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
    .replaceAll('`', '&#96;');

export const escapeMarkdownLabel = (value: string): string =>
  value.replace(/[\\[\]`*_<>{}]/g, '\\$&');

export const sourceLine = (source: string, offset: number): number =>
  source.slice(0, offset).split('\n').length;
