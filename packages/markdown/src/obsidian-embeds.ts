import { createHash } from 'node:crypto';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { getObsidianDocumentMetadata } from './obsidian-document.ts';
import { normalizeMarkdownLinks } from './obsidian-markdown-links.ts';
import { resolveObsidianReference } from './obsidian-resolver.ts';
import {
  applySourceEdits,
  escapeMarkdownLabel,
  escapeObsidianHtml,
  sourceLine,
  type SourceEdit,
} from './obsidian-source-edits.ts';
import { parseObsidianSource } from './obsidian-syntax.ts';
import type {
  NormalizationContext,
  NormalizedMarkdown,
  PublicationDocument,
  ObsidianDiagnostic,
} from './obsidian-types.ts';

const MAXIMUM_BYTES = 10 * 1024 * 1024;
const htmlIdentifierPattern = /(?:^|[\s<])id=(?:(['"])([^'"]+)\1|([^\s"'`=<>]+))/gu;
const htmlIdentifierReplacementPattern = /((?:^|[\s<]))id=(?:(['"])([^'"]+)\2|([^\s"'`=<>]+))/gu;
const htmlFragmentHrefPattern = /(\bhref\s*=\s*)(?:(['"])#([^'"]*)\2|#([^\s"'`=<>]+))/gu;
const encodedPath = (value: string): string => value.split('/').map(encodeURIComponent).join('/');
const wikiEmbedParts = (inner: string): { reference: string; alias?: string } => {
  let pipe = -1;
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] !== '|') continue;
    let slashes = 0;
    for (let previous = index - 1; previous >= 0 && inner[previous] === '\\'; previous -= 1)
      slashes += 1;
    if (slashes % 2 === 0) {
      pipe = index;
      break;
    }
  }
  if (pipe < 0) return { reference: inner.trim() };
  return {
    reference: inner.slice(0, pipe).trim(),
    alias: inner.slice(pipe + 1).replaceAll('\\|', '|'),
  };
};
const fragmentId = (document: PublicationDocument, fragment: string): string | undefined => {
  const metadata = getObsidianDocumentMetadata(document);
  if (fragment.startsWith('^'))
    return metadata.blocks.some((block) => block.id === fragment.slice(1))
      ? `block-${fragment.slice(1)}`
      : undefined;
  return (
    metadata.headings.find((heading) => heading.id === fragment || heading.text === fragment)?.id ??
    (metadata.blocks.some((block) => `block-${block.id}` === fragment) ? fragment : undefined)
  );
};

const namespaceEmbeddedHtmlIdentifiers = (
  source: string,
  start: number,
  end: number,
  prefix: string,
  localIds: Map<string, string>,
  edits: SourceEdit[],
): void => {
  if (!source.slice(start, end).includes('<')) return;
  const tree = unified().use(remarkParse).parse(source.slice(start, end));
  visit(tree, 'html', (node) => {
    for (const match of node.value.matchAll(htmlIdentifierPattern)) {
      const id = match[2] ?? match[3];
      if (id) localIds.set(id, `${prefix}${id}`);
    }
  });
  visit(tree, 'html', (node) => {
    const localStart = node.position?.start.offset;
    const localEnd = node.position?.end.offset;
    if (localStart === undefined || localEnd === undefined) return;
    const nodeStart = start + localStart;
    const nodeEnd = start + localEnd;
    let value = node.value;
    value = value.replace(
      htmlIdentifierReplacementPattern,
      (
        match,
        before: string,
        quote: string | undefined,
        quotedId: string | undefined,
        unquotedId: string | undefined,
      ) => {
        const id = quotedId ?? unquotedId;
        return quote ? `${before}id=${quote}${prefix}${id}${quote}` : `${before}id=${prefix}${id}`;
      },
    );
    value = value.replace(
      htmlFragmentHrefPattern,
      (
        match,
        before: string,
        quote: string | undefined,
        quotedId: string | undefined,
        unquotedId: string | undefined,
      ) => {
        const id = quotedId ?? unquotedId;
        if (!id) return match;
        let decoded: string;
        try {
          decoded = decodeURIComponent(id);
        } catch {
          return match;
        }
        const mapped = localIds.get(decoded);
        if (!mapped) return match;
        const fragment = `#${encodeURIComponent(mapped)}`;
        return quote ? `${before}${quote}${fragment}${quote}` : `${before}${fragment}`;
      },
    );
    if (value !== node.value) edits.push({ start: nodeStart, end: nodeEnd, value });
  });
};

/** Resolve against the closed publication index, retaining the original host source map. */
export const normalizeObsidianReferences = (
  source: string,
  context: NormalizationContext,
): NormalizedMarkdown => {
  const diagnostics: ObsidianDiagnostic[] = [];
  const dependencies = new Set<string>();
  const host = context.publicationIndex.documents.find(
    (document) => document.sourcePath === context.sourcePath,
  );
  const document =
    host?.source === source
      ? host
      : { sourcePath: context.sourcePath, source, route: host?.route ?? '' };
  const hostPrefix = createHash('sha256').update(context.sourcePath).digest('hex').slice(0, 12);
  let occurrence = 0;
  const issue = (document: PublicationDocument, offset: number, message: string): void => {
    diagnostics.push({
      file: document.sourcePath,
      line: sourceLine(document.source, offset),
      message,
    });
  };
  const render = (
    document: PublicationDocument,
    stack: readonly string[],
    start = 0,
    end = document.source.length,
    prefix = '',
    appendDefinitions = true,
  ): ReturnType<typeof applySourceEdits> => {
    const source = document.source;
    const currentContext = { ...context, sourcePath: document.sourcePath };
    const edits: SourceEdit[] = [];
    let expandedBytes = Buffer.byteLength(source.slice(start, end));
    const localIds = new Map<string, string>();
    let metadata: ReturnType<typeof getObsidianDocumentMetadata> | undefined;
    const documentMetadata = (): ReturnType<typeof getObsidianDocumentMetadata> => {
      if (metadata) return metadata;
      metadata = getObsidianDocumentMetadata(document);
      diagnostics.push(...metadata.diagnostics);
      return metadata;
    };
    if (prefix || /\^[\w-]+\s*(?:\r?\n|$)/m.test(source)) {
      for (const heading of documentMetadata().headings)
        if (heading.start >= start && heading.end <= end)
          localIds.set(heading.id, `${prefix}${heading.id}`);
      for (const block of documentMetadata().blocks)
        if (block.start >= start && block.end <= end)
          localIds.set(`block-${block.id}`, `${prefix}block-${block.id}`);
      for (const heading of documentMetadata().headings) {
        if (!prefix) continue;
        // Inserting in the first line also supports setext headings.
        const firstLineEnd = source.indexOf('\n', heading.start);
        const headingLineEnd =
          firstLineEnd < 0 || firstLineEnd > heading.end ? heading.end : firstLineEnd;
        const closingHashes = /\s+#+\s*$/u.exec(source.slice(heading.start, headingLineEnd));
        const insertion = closingHashes
          ? heading.start + closingHashes.index
          : firstLineEnd < 0 || firstLineEnd > heading.end
            ? heading.end
            : firstLineEnd - (source[firstLineEnd - 1] === '\r' ? 1 : 0);
        edits.push({
          start: insertion,
          end: insertion,
          value: `<span data-obsidian-heading="${escapeObsidianHtml(prefix + heading.id)}"></span>`,
        });
      }
      for (const block of documentMetadata().blocks) {
        const anchor = `<span id="${escapeObsidianHtml(prefix + 'block-' + block.id)}"></span>`;
        edits.push({ start: block.markerStart, end: block.markerEnd, value: anchor });
        if (block.start >= start && block.end <= end && block.markerStart >= end)
          edits.push({ start: block.end, end: block.end, value: `\n\n${anchor}` });
      }
    }
    if (prefix) namespaceEmbeddedHtmlIdentifiers(source, start, end, prefix, localIds, edits);
    const links = normalizeMarkdownLinks(source, currentContext, {
      embedded: Boolean(prefix),
      hostSourcePath: context.sourcePath,
      localIds,
      footnotePrefix: prefix,
    });
    edits.push(...links.edits);
    diagnostics.push(...links.diagnostics);
    for (const dependency of links.dependencies) dependencies.add(dependency);
    const nodes = parseObsidianSource(source).nodes;
    for (const node of nodes) {
      if (node.type === 'comment') {
        const comment = source.slice(node.position.start, node.position.end);
        edits.push({ ...node.position, value: '' });
        if (comment.length < 4 || !comment.endsWith('%%'))
          issue(document, node.position.start, 'Unclosed Obsidian comment.');
        continue;
      }
      if (
        node.position.start < start ||
        node.position.end > end ||
        (node.type !== 'embed' && node.type !== 'wikiLink')
      )
        continue;
      const raw = source.slice(node.position.start, node.position.end);
      const inner = raw.slice(node.type === 'embed' ? 3 : 2, -2);
      const parts = wikiEmbedParts(inner);
      const reference = parts.reference;
      const alias = parts.alias;
      const hash = reference.indexOf('#');
      const target = hash < 0 ? reference : reference.slice(0, hash);
      let fragment = hash < 0 ? '' : reference.slice(hash + 1);
      try {
        fragment = decodeURIComponent(fragment);
      } catch {
        issue(document, node.position.start, `Malformed fragment: ${reference}`);
        continue;
      }
      const replace = (value: string): void => {
        const nextBytes = expandedBytes - Buffer.byteLength(raw) + Buffer.byteLength(value);
        if (nextBytes > MAXIMUM_BYTES) {
          issue(document, node.position.start, 'Obsidian expanded output exceeds 10 MiB.');
          return;
        }
        expandedBytes = nextBytes;
        edits.push({ ...node.position, value });
      };
      if (!target && !fragment) {
        issue(document, node.position.start, 'Malformed empty Obsidian reference.');
        continue;
      }
      const documentResult = target ? resolveObsidianReference(target, currentContext) : undefined;
      const isAttachment =
        /\.[a-z0-9]+$/i.test(target) && !target.endsWith('.md') && !documentResult?.reference;
      if (isAttachment) {
        const result = resolveObsidianReference(target, currentContext, 'attachment');
        if (result.reference?.kind !== 'attachment') {
          issue(document, node.position.start, `Unsupported or unpublished attachment: ${target}`);
          continue;
        }
        const attachment = result.reference.attachment;
        dependencies.add(attachment.sourcePath);
        const url = attachment.url + (fragment ? `#${encodeURI(fragment)}` : '');
        if (
          fragment &&
          !(attachment.mimeType === 'application/pdf' && /^page=[1-9]\d*$/.test(fragment))
        ) {
          issue(document, node.position.start, `Unsupported attachment fragment: ${reference}`);
          continue;
        }
        if (node.type === 'wikiLink') {
          replace(`[${escapeMarkdownLabel(alias ?? target)}](<${url}>)`);
          continue;
        }
        const dimensions = alias?.match(/^(\d+)(?:x(\d+))?$/);
        const attributes = dimensions
          ? ` width="${dimensions[1]}"${dimensions[2] ? ` height="${dimensions[2]}"` : ''}`
          : '';
        const label = escapeObsidianHtml(dimensions ? target : (alias ?? target));
        if (attachment.mimeType.startsWith('image/')) {
          // Relative to the HOST because rehype-enhance-images receives the host filename.
          const isPublicStaticAttachment = attachment.sourcePath.includes('/static/');
          const imagePath = isPublicStaticAttachment
            ? attachment.url
            : encodedPath(
                path.posix.relative(path.posix.dirname(context.sourcePath), attachment.sourcePath),
              );
          const publicAttachmentMarker = isPublicStaticAttachment
            ? ' data-obsidian-public-attachment=""'
            : '';
          replace(
            `<img data-obsidian-attachment=""${publicAttachmentMarker} src="${escapeObsidianHtml(imagePath)}" alt="${label}"${attributes}>`,
          );
        } else if (
          attachment.mimeType.startsWith('audio/') ||
          attachment.mimeType.startsWith('video/')
        ) {
          const tag = attachment.mimeType.startsWith('audio/') ? 'audio' : 'video';
          replace(
            `<${tag} src="${escapeObsidianHtml(url)}" controls preload="metadata" aria-label="${label}"${attributes}></${tag}>`,
          );
        } else if (attachment.mimeType === 'application/pdf') {
          replace(
            `<object data="${escapeObsidianHtml(url)}" type="application/pdf" aria-label="${label}"${attributes}><a href="${escapeObsidianHtml(url)}">Open ${label}</a></object>\n\n[Open ${escapeMarkdownLabel(alias ?? target)}](<${url}>)`,
          );
        } else issue(document, node.position.start, `Unsupported Obsidian embed type: ${target}`);
        continue;
      }
      const result = target
        ? documentResult!
        : {
            reference: {
              kind: 'document' as const,
              document: host?.sourcePath === document.sourcePath ? host : document,
            },
            diagnostics: [],
          };
      if (result.reference?.kind !== 'document') {
        diagnostics.push(
          ...result.diagnostics.map((item) => ({
            ...item,
            line: sourceLine(source, node.position.start),
          })),
        );
        continue;
      }
      const destination =
        result.reference.document === document ? document : result.reference.document;
      const id = fragment ? fragmentId(destination, fragment) : '';
      if (fragment && !id) {
        issue(document, node.position.start, `Missing heading or block reference: ${reference}`);
        continue;
      }
      dependencies.add(destination.sourcePath);
      if (node.type === 'wikiLink') {
        const sameDocument = destination.sourcePath === document.sourcePath;
        const url =
          sameDocument && id
            ? `#${encodeURIComponent(localIds.get(id) ?? id)}`
            : destination.route + (id ? `#${encodeURIComponent(id)}` : '');
        replace(`[${escapeMarkdownLabel(alias ?? (target || fragment))}](<${url}>)`);
        continue;
      }
      if (stack.length > 32) {
        issue(document, node.position.start, 'Obsidian embeds exceed 32 nested inclusions.');
        continue;
      }
      const destinationMetadata = getObsidianDocumentMetadata(destination);
      const heading = destinationMetadata.headings.find((heading) => heading.id === id);
      const block = destinationMetadata.blocks.find((block) => `block-${block.id}` === id);
      const sectionStart = heading?.start ?? block?.start ?? destinationMetadata.bodyStart;
      const sectionEnd = heading?.sectionEnd ?? block?.end ?? destination.source.length;
      const overlapsCurrentRange =
        destination === document && sectionStart < end && sectionEnd > start;
      if (
        stack.includes(destination.sourcePath) &&
        !(fragment && (stack.length === 1 || !overlapsCurrentRange))
      ) {
        issue(
          document,
          node.position.start,
          `Obsidian embed cycle: ${[...stack, destination.sourcePath].join(' -> ')}`,
        );
        continue;
      }
      const nested = render(
        destination,
        [...stack, destination.sourcePath],
        sectionStart,
        sectionEnd,
        `embed-${hostPrefix}-${++occurrence}-`,
      );
      if (Buffer.byteLength(nested.markdown) > MAXIMUM_BYTES) {
        issue(document, node.position.start, 'Obsidian expanded output exceeds 10 MiB.');
        continue;
      }
      const lineStart = source.lastIndexOf('\n', node.position.start - 1) + 1;
      const sourceBeforeEmbed = source.slice(lineStart, node.position.start);
      const listContainer = /^(\s*(?:(?:>\s*)+)?)(?:[-+*]|\d+[.)])\s+$/u.exec(sourceBeforeEmbed);
      const blockquoteContainer = /^(\s*(?:>\s+)+)$/u.exec(sourceBeforeEmbed)?.[1];
      const continuationPrefix = listContainer
        ? `${listContainer[1]}${' '.repeat(sourceBeforeEmbed.length - listContainer[1].length)}`
        : blockquoteContainer;
      const expanded = continuationPrefix
        ? nested.markdown.trim().replace(/\r?\n/gu, `\n${continuationPrefix}`)
        : `\n\n${nested.markdown}\n\n`;
      replace(expanded);
    }
    const appendedDefinitions =
      prefix && appendDefinitions
        ? documentMetadata().definitions.filter(
            (definition) => definition.start < start || definition.end > end,
          )
        : [];
    const outputs = [
      applySourceEdits(
        source.slice(start, end),
        edits
          .filter((edit) => edit.start >= start && edit.end <= end)
          .map((edit) => ({
            ...edit,
            start: edit.start - start,
            end: edit.end - start,
          })),
      ),
      ...appendedDefinitions.map((definition) =>
        render(document, stack, definition.start, definition.end, prefix, false),
      ),
    ];
    const result = outputs[0];
    if (outputs.length > 1)
      result.markdown +=
        '\n\n' +
        outputs
          .slice(1)
          .map((output) => output.markdown)
          .join('\n\n');
    if (Buffer.byteLength(result.markdown) > MAXIMUM_BYTES)
      issue(document, start, 'Obsidian expanded output exceeds 10 MiB.');
    return result;
  };
  return {
    ...render(document, [context.sourcePath]),
    dependencies: [...dependencies].sort(),
    diagnostics,
  };
};
