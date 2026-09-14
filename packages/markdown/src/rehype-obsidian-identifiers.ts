import { Buffer } from 'node:buffer';
import type { Element, Root } from 'hast';
import type { Raw } from 'mdast-util-to-hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { fromHtml } from 'hast-util-from-html';

/** Restore explicit embed heading IDs before rehype-slug assigns ordinary heading IDs. */
const rehypeObsidianIdentifiers: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'raw', (node, index, parent) => {
    if (index === undefined || !parent) return;
    const match =
      /^<(span|div) data-obsidian-footnote="([A-Za-z0-9_-]+)">(<\/(?:span|div)>)?$/.exec(
        node.value,
      );
    if (!match) return;
    const closing = `</${match[1]}>`;
    const next = parent.children[index + 1];
    if (match[3] ? match[3] !== closing : next?.type !== 'raw' || next.value !== closing)
      throw new Error('Invalid Obsidian footnote marker.');
    const decoded = Buffer.from(match[2], 'base64url');
    if (decoded.toString('base64url') !== match[2])
      throw new Error('Invalid Obsidian footnote encoding.');
    const parsed = fromHtml(decoded.toString('utf8'), { fragment: true });
    parent.children.splice(
      index,
      match[3] ? 1 : 2,
      ...parsed.children.filter((child) => child.type !== 'doctype'),
    );
  });
  visit(tree, 'raw', (node, index, parent) => {
    if (
      index === undefined ||
      !parent ||
      !node.value.startsWith('<img data-obsidian-attachment="" ')
    )
      return;
    const parsed = fromHtml(node.value, { fragment: true });
    const element = parsed.children[0];
    if (parsed.children.length === 1 && element?.type === 'element' && element.tagName === 'img') {
      delete element.properties.dataObsidianAttachment;
      parent.children.splice(index, 1, element);
    }
  });
  visit(tree, 'element', (node: Element) => {
    if (!/^h[1-6]$/.test(node.tagName)) return;
    node.children = node.children.filter((child) => {
      if (child.type !== 'raw') return true;
      const raw: Raw = child;
      const match = /^<span data-obsidian-heading="([^"]+)"><\/span>$/.exec(raw.value);
      if (!match) return true;
      const parsed = fromHtml(raw.value, { fragment: true }).children[0];
      if (parsed?.type === 'element')
        node.properties.id = String(parsed.properties.dataObsidianHeading ?? '');
      return false;
    });
    // mdsvex splits inline opening and closing tags into adjacent raw nodes.
    for (let index = 0; index < node.children.length - 1; index++) {
      const child = node.children[index];
      const next = node.children[index + 1];
      if (child.type !== 'raw' || next.type !== 'raw' || next.value !== '</span>') continue;
      if (!/^<span data-obsidian-heading="[^"]+">$/.test(child.value)) continue;
      const parsed = fromHtml(`${child.value}</span>`, { fragment: true }).children[0];
      if (parsed?.type === 'element')
        node.properties.id = String(parsed.properties.dataObsidianHeading ?? '');
      node.children.splice(index, 2);
      index--;
    }
  });
};
export default rehypeObsidianIdentifiers;

/** Reject collisions after slug generation, including explicitly authored HTML IDs. */
export const rehypeValidateObsidianIdentifiers: Plugin<[], Root> = () => (tree, file) => {
  const identifiers = new Set<string>();
  const check = (id: unknown): void => {
    if (typeof id !== 'string' || !id || id.includes('{')) return;
    if (identifiers.has(id))
      throw new Error(`Duplicate HTML identifier '${id}' in ${file.path || 'document'}.`);
    identifiers.add(id);
  };
  visit(tree, 'element', (node) => check(node.properties.id));
  visit(tree, 'raw', (node) => {
    visit(fromHtml(node.value, { fragment: true }), 'element', (element) =>
      check(element.properties.id),
    );
  });
};
