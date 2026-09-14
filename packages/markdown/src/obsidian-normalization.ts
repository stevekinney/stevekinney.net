import { lowerObsidianFootnotes } from './obsidian-footnotes.ts';
import { Buffer } from 'node:buffer';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { normalizeObsidianReferences } from './obsidian-embeds.ts';
import { applySourceEdits, sourceLine, type SourceEdit } from './obsidian-source-edits.ts';
import { parseObsidianSource } from './obsidian-syntax.ts';
import type { NormalizationContext, NormalizedMarkdown, SourceMapping } from './obsidian-types.ts';

const requiresNormalization = (tree: Root): boolean => {
  let required = false;
  visit(tree, (node) => {
    if (node.type === 'text' && /\[\[|%%|==|\$|\^/.test(node.value)) required = true;
    if (node.type === 'footnoteReference' || node.type === 'footnoteDefinition') required = true;
    if ('url' in node && /\.md(?:[#?]|$)|#/i.test(node.url)) required = true;
  });
  return required;
};

const originalOffset = (
  mappings: readonly SourceMapping[],
  offset: number,
  end = false,
): number => {
  const mapping = mappings.find(
    (mapping) =>
      offset >= mapping.generatedStart &&
      (offset < mapping.generatedEnd || (end && offset === mapping.generatedEnd)),
  );
  if (!mapping) return offset;
  return mapping.generatedEnd - mapping.generatedStart === mapping.sourceEnd - mapping.sourceStart
    ? mapping.sourceStart + offset - mapping.generatedStart
    : end
      ? mapping.sourceEnd
      : mapping.sourceStart;
};

/** Normalize the exact same content for collection, rendering, and text publication. */
export const normalizeObsidianMarkdown = (
  source: string,
  context: NormalizationContext,
): NormalizedMarkdown => {
  if (
    context.markdownTree &&
    Buffer.byteLength(source) <= 10 * 1024 * 1024 &&
    !requiresNormalization(context.markdownTree)
  )
    return {
      ...applySourceEdits(source, []),
      dependencies: [],
      diagnostics: [],
    };
  const references = normalizeObsidianReferences(source, context);
  // Failed expansion is never publishable. Avoid parsing its potentially large
  // intermediate body again once the inclusion budget has already been exceeded.
  if (references.diagnostics.some((issue) => issue.message.includes('exceeds 10 MiB')))
    return references;
  const edits: SourceEdit[] = [];
  const diagnostics = [...references.diagnostics];
  for (const node of parseObsidianSource(references.markdown).nodes) {
    const { start, end } = node.position;
    const raw = references.markdown.slice(start, end);
    if (node.type === 'comment') {
      edits.push({ start, end, value: '' });
      if (raw.length < 4 || !raw.endsWith('%%'))
        diagnostics.push({
          file: context.sourcePath,
          line: sourceLine(source, originalOffset(references.sourceMap, start)),
          message: 'Unclosed Obsidian comment.',
        });
    } else if (node.type === 'highlight') {
      edits.push(
        { start, end: start + 2, value: '<mark>' },
        { start: end - 2, end, value: '</mark>' },
      );
    } else if (node.type === 'inlineMath' || node.type === 'math') {
      const display = node.type === 'math' ? 'block' : 'inline';
      const tag = display === 'block' ? 'div' : 'span';
      edits.push({
        start,
        end,
        value: `<${tag} data-obsidian-math="${Buffer.from(node.value).toString('base64url')}" data-display="${display}"></${tag}>`,
      });
    }
  }
  const syntax = applySourceEdits(references.markdown, edits);
  const footnotes = lowerObsidianFootnotes(syntax.markdown);
  const lowered = {
    ...footnotes,
    sourceMap: footnotes.sourceMap.map((mapping) => ({
      ...mapping,
      sourceStart: originalOffset(syntax.sourceMap, mapping.sourceStart),
      sourceEnd: originalOffset(syntax.sourceMap, mapping.sourceEnd, true),
    })),
  };
  if (Buffer.byteLength(lowered.markdown) > 10 * 1024 * 1024)
    diagnostics.push({
      file: context.sourcePath,
      line: 1,
      message: 'Obsidian expanded output exceeds 10 MiB.',
    });
  return {
    ...lowered,
    dependencies: references.dependencies,
    diagnostics,
    sourceMap: lowered.sourceMap.map((mapping) => ({
      ...mapping,
      sourceStart: originalOffset(references.sourceMap, mapping.sourceStart),
      sourceEnd: originalOffset(references.sourceMap, mapping.sourceEnd, true),
    })),
  };
};
