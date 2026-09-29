import { Buffer } from 'node:buffer';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import { visit } from 'unist-util-visit';
import type { Element } from 'hast';
import { applySourceEdits, type SourceEdit } from './obsidian-source-edits.ts';

const parser = unified().use(remarkParse).use(remarkGfm);

/** Carry modern GFM footnotes past mdsvex's older Markdown parser. */
export const lowerObsidianFootnotes = (source: string): ReturnType<typeof applySourceEdits> => {
  if (!source.includes('[^')) return applySourceEdits(source, []);
  const tree = parser.parse(source);
  const references: Array<{ start: number; end: number }> = [];
  const edits: SourceEdit[] = [];
  visit(tree, (node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    if (node.type === 'footnoteReference') references.push({ start, end });
    if (node.type === 'footnoteDefinition') edits.push({ start, end, value: '' });
  });
  if (!references.length) return applySourceEdits(source, edits);
  const html = toHast(tree, { allowDangerousHtml: true });
  const links = new Map<number, Element>();
  let section: Element | undefined;
  visit(html, 'element', (node) => {
    if (
      node.tagName === 'sup' &&
      node.position?.start.offset !== undefined &&
      node.children.some((child) => child.type === 'element' && child.properties.dataFootnoteRef)
    )
      links.set(node.position.start.offset, node);
    if (node.tagName === 'section' && node.properties.dataFootnotes) section = node;
  });
  if (!section || links.size !== references.length)
    throw new Error('Could not render Obsidian footnotes consistently.');
  const transport = (node: Element, inline: boolean): string => {
    const escaped = toHtml(node, { allowDangerousHtml: true })
      .replaceAll('{', '&#123;')
      .replaceAll('}', '&#125;')
      .replaceAll('`', '&#96;');
    const encoded = Buffer.from(escaped).toString('base64url');
    const tag = inline ? 'span' : 'div';
    return `<${tag} data-obsidian-footnote="${encoded}"></${tag}>`;
  };
  references.forEach((reference) =>
    edits.push({ ...reference, value: transport(links.get(reference.start)!, true) }),
  );
  edits.push({
    start: source.length,
    end: source.length,
    value: `\n\n${transport(section, false)}\n`,
  });
  return applySourceEdits(source, edits);
};
