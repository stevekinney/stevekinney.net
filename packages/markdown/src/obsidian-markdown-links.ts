import path from 'node:path';
import type { RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { getObsidianDocumentMetadata } from './obsidian-document.ts';
import { resolveObsidianReference } from './obsidian-resolver.ts';
import { sourceLine, type SourceEdit } from './obsidian-source-edits.ts';
import { parseObsidianSource } from './obsidian-syntax.ts';
import type {
  NormalizationContext,
  ObsidianDiagnostic,
  PublicationDocument,
} from './obsidian-types.ts';

export type MarkdownLinkOptions = {
  embedded?: boolean;
  hostSourcePath?: string;
  localIds?: ReadonlyMap<string, string>;
  footnotePrefix?: string;
};
const external = (url: string): boolean => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url);

/** Locate the destination without replacing formatted labels or nested children. */
const destinationSpan = (raw: string, node: RootContent): [number, number] | undefined => {
  let cursor: number;
  if (node.type === 'definition') cursor = raw.indexOf(']:') + 2;
  else {
    const childEnd = 'children' in node ? node.children.at(-1)?.position?.end.offset : undefined;
    const from = childEnd === undefined ? 0 : childEnd - (node.position?.start.offset ?? 0);
    cursor = raw.indexOf('](', from) + 2;
  }
  if (cursor < 2) return;
  while (/\s/.test(raw[cursor] ?? '') && cursor < raw.length) cursor++;
  if (raw[cursor] === '<') {
    const end = raw.indexOf('>', cursor + 1);
    return end < 0 ? undefined : [cursor, end + 1];
  }
  const start = cursor;
  let depth = 0;
  while (cursor < raw.length) {
    const character = raw[cursor];
    if (character === '\\') {
      cursor += 2;
      continue;
    }
    if (character === '(') depth++;
    else if (character === ')') {
      if (!depth) break;
      depth--;
    } else if (/\s/.test(character) && !depth) break;
    cursor++;
  }
  return [start, cursor];
};

export const normalizeMarkdownLinks = (
  source: string,
  context: NormalizationContext,
  options: MarkdownLinkOptions = {},
): { edits: SourceEdit[]; diagnostics: ObsidianDiagnostic[]; dependencies: string[] } => {
  const tree = parseObsidianSource(source).tree;
  const edits: SourceEdit[] = [];
  const diagnostics: ObsidianDiagnostic[] = [];
  const dependencies = new Set<string>();
  const issue = (start: number, message: string): void => {
    diagnostics.push({ file: context.sourcePath, line: sourceLine(source, start), message });
  };
  const validateFragment = (
    document: PublicationDocument,
    fragment: string,
    start: number,
  ): string => {
    let id: string;
    try {
      id = decodeURIComponent(fragment);
    } catch {
      issue(start, `Malformed Markdown fragment: ${fragment}`);
      return fragment;
    }
    if (id.startsWith('^')) id = `block-${id.slice(1)}`;
    const metadata = getObsidianDocumentMetadata(document);
    if (
      !metadata.headings.some((heading) => heading.id === id) &&
      !metadata.blocks.some((block) => `block-${block.id}` === id) &&
      !metadata.htmlIds.includes(id)
    )
      issue(start, `Missing Markdown fragment: ${document.sourcePath}#${fragment}`);
    return id;
  };
  visit(tree, (node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined || node.type === 'root') return;
    const raw = source.slice(start, end);
    if ('url' in node && typeof node.url === 'string' && !external(node.url)) {
      const hash = node.url.indexOf('#');
      const beforeFragment = hash < 0 ? node.url : node.url.slice(0, hash);
      const fragment = hash < 0 ? '' : node.url.slice(hash + 1);
      const query = beforeFragment.indexOf('?');
      const target = query < 0 ? beforeFragment : beforeFragment.slice(0, query);
      const queryString = query < 0 ? '' : beforeFragment.slice(query);
      let destination: string | undefined;
      if (!target && fragment) {
        let id: string;
        try {
          id = decodeURIComponent(fragment);
        } catch {
          issue(start, `Malformed Markdown fragment: ${fragment}`);
          return;
        }
        const mapped = options.localIds?.get(id.startsWith('^') ? `block-${id.slice(1)}` : id);
        if (mapped) destination = `#${encodeURIComponent(mapped)}`;
        else if (options.embedded) {
          const document = context.publicationIndex.documents.find(
            (candidate) => candidate.sourcePath === context.sourcePath,
          );
          if (document) {
            const validated = validateFragment(document, fragment, start);
            destination = `${document.route}#${encodeURIComponent(validated)}`;
          }
        }
      } else if (target) {
        // Resolve the query-free target so query parameters do not affect document lookup.
        const result = resolveObsidianReference(target, context);
        if (result.reference?.kind === 'document') {
          const document = result.reference.document;
          dependencies.add(document.sourcePath);
          const id = fragment ? validateFragment(document, fragment, start) : '';
          destination = document.route + queryString + (id ? `#${encodeURIComponent(id)}` : '');
        } else if (/\.md$/i.test(target))
          diagnostics.push(
            ...result.diagnostics.map((item) => ({ ...item, line: sourceLine(source, start) })),
          );
      }
      if (destination === undefined && options.embedded && target && !target.startsWith('/')) {
        // Relative non-document destinations inside an embed must be closed-index assets.
        const result = resolveObsidianReference(target, context, 'attachment');
        if (result.reference?.kind === 'attachment') {
          const attachment = result.reference.attachment;
          dependencies.add(attachment.sourcePath);
          destination =
            node.type === 'image'
              ? path.posix
                  .relative(
                    path.posix.dirname(options.hostSourcePath ?? context.sourcePath),
                    attachment.sourcePath,
                  )
                  .split('/')
                  .map(encodeURIComponent)
                  .join('/')
              : attachment.url;
          destination += queryString;
          if (fragment) destination += `#${fragment}`;
        } else
          diagnostics.push(
            ...result.diagnostics.map((item) => ({ ...item, line: sourceLine(source, start) })),
          );
      }
      if (destination !== undefined && destination !== node.url) {
        const span = destinationSpan(raw, node);
        if (span)
          edits.push({
            start: start + span[0],
            end: start + span[1],
            value: `<${destination.replaceAll('>', '%3E').replaceAll('<', '%3C')}>`,
          });
      }
    }
    const prefix = options.footnotePrefix;
    if (!prefix || !('identifier' in node)) return;
    if (node.type === 'footnoteReference' || node.type === 'footnoteDefinition') {
      const close = raw.indexOf(']');
      if (raw.startsWith('[^') && close > 2)
        edits.push({ start: start + 2, end: start + close, value: prefix + node.identifier });
    } else if (node.type === 'definition') {
      const close = raw.indexOf(']:');
      if (close > 0)
        edits.push({ start: start + 1, end: start + close, value: prefix + node.identifier });
    } else if (node.type === 'linkReference' || node.type === 'imageReference') {
      if (node.referenceType === 'full' || node.referenceType === 'collapsed') {
        const opening = raw.lastIndexOf('[');
        edits.push({ start: start + opening + 1, end: end - 1, value: prefix + node.identifier });
      } else edits.push({ start: end, end, value: `[${prefix + node.identifier}]` });
    }
  });
  return { edits, diagnostics, dependencies: [...dependencies] };
};
