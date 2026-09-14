import { createHash } from 'node:crypto';
import path from 'node:path';
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
const encodedPath = (value: string): string => value.split('/').map(encodeURIComponent).join('/');
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
  ): ReturnType<typeof applySourceEdits> => {
    const metadata = getObsidianDocumentMetadata(document);
    diagnostics.push(...metadata.diagnostics);
    const source = document.source;
    const currentContext = { ...context, sourcePath: document.sourcePath };
    const edits: SourceEdit[] = [];
    let expandedBytes = Buffer.byteLength(source.slice(start, end));
    const localIds = new Map<string, string>();
    for (const heading of metadata.headings) localIds.set(heading.id, `${prefix}${heading.id}`);
    for (const block of metadata.blocks)
      localIds.set(`block-${block.id}`, `${prefix}block-${block.id}`);
    for (const heading of metadata.headings) {
      if (!prefix) continue;
      // Inserting in the first line also supports setext headings.
      const firstLineEnd = source.indexOf('\n', heading.start);
      const insertion =
        firstLineEnd < 0 || firstLineEnd > heading.end
          ? heading.end
          : firstLineEnd - (source[firstLineEnd - 1] === '\r' ? 1 : 0);
      edits.push({
        start: insertion,
        end: insertion,
        value: `<span data-obsidian-heading="${escapeObsidianHtml(prefix + heading.id)}"></span>`,
      });
    }
    for (const block of metadata.blocks) {
      const anchor = `<span id="${escapeObsidianHtml(prefix + 'block-' + block.id)}"></span>`;
      edits.push({ start: block.markerStart, end: block.markerEnd, value: anchor });
      if (prefix && block.start >= start && block.end <= end && block.markerStart >= end)
        edits.push({ start: block.end, end: block.end, value: `\n\n${anchor}` });
    }
    const links = normalizeMarkdownLinks(source, currentContext, {
      embedded: Boolean(prefix),
      hostSourcePath: context.sourcePath,
      localIds,
      footnotePrefix: prefix,
    });
    edits.push(...links.edits);
    diagnostics.push(...links.diagnostics);
    for (const dependency of links.dependencies) dependencies.add(dependency);
    for (const node of parseObsidianSource(source).nodes) {
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
      const pipe = inner.indexOf('|');
      const reference = (pipe < 0 ? inner : inner.slice(0, pipe)).trim();
      const alias = pipe < 0 ? undefined : inner.slice(pipe + 1);
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
          const imagePath = encodedPath(
            path.posix.relative(path.posix.dirname(context.sourcePath), attachment.sourcePath),
          );
          replace(
            `<img data-obsidian-attachment="" src="${escapeObsidianHtml(imagePath)}" alt="${label}"${attributes}>`,
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
        : { reference: { kind: 'document' as const, document }, diagnostics: [] };
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
        result.reference.document.sourcePath === document.sourcePath
          ? document
          : result.reference.document;
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
      if (stack.includes(destination.sourcePath)) {
        issue(
          document,
          node.position.start,
          `Obsidian embed cycle: ${[...stack, destination.sourcePath].join(' -> ')}`,
        );
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
      replace(`\n\n${nested.markdown}\n\n`);
    }
    const ranges = [{ start, end }];
    if (prefix)
      for (const definition of metadata.definitions) {
        if (definition.start < start || definition.end > end)
          ranges.push({ start: definition.start, end: definition.end });
      }
    const outputs = ranges.map((range) =>
      applySourceEdits(
        source.slice(range.start, range.end),
        edits
          .filter((edit) => edit.start >= range.start && edit.end <= range.end)
          .map((edit) => ({
            ...edit,
            start: edit.start - range.start,
            end: edit.end - range.start,
          })),
      ),
    );
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
