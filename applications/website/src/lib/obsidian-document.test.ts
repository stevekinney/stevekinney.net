import { describe, expect, it } from 'vitest';

import { getObsidianDocumentMetadata } from '../../../../packages/markdown/src/obsidian-document';
import type { PublicationDocument } from '../../../../packages/markdown/src/obsidian-types';

const makeDocument = (source: string): PublicationDocument => ({
  sourcePath: 'writing/example.md',
  route: '/writing/example',
  source,
});

describe('getObsidianDocumentMetadata', () => {
  it('slugifies duplicate headings and computes same-depth section boundaries', () => {
    const document = makeDocument('# Intro\nA\n## Child\nB\n# Intro\nC');
    const metadata = getObsidianDocumentMetadata(document);
    expect(metadata.headings.map((heading) => heading.id)).toEqual(['intro', 'child', 'intro-1']);
    expect(metadata.headings[0]?.sectionEnd).toBe(metadata.headings[2]?.start);
  });

  it('preserves frontmatter offsets and finds inline and standalone block markers', () => {
    const source =
      '---\ntitle: Example\n---\n# Heading\nParagraph text ^inline\n\nPrevious\n^standalone\n';
    const metadata = getObsidianDocumentMetadata(makeDocument(source));
    expect(metadata.bodyStart).toBe(source.indexOf('# Heading'));
    expect(metadata.blocks.map((block) => block.id)).toEqual(['inline', 'standalone']);
    expect(source.slice(metadata.blocks[0]!.markerStart, metadata.blocks[0]!.markerEnd)).toBe(
      '^inline',
    );
    expect(source.slice(metadata.blocks[0]!.start, metadata.blocks[0]!.end)).toContain(
      'Paragraph text',
    );
    expect(source.slice(metadata.blocks[1]!.start, metadata.blocks[1]!.end)).toBe('Previous');
  });

  it('selects the preceding list block and keeps UTF-16 offsets', () => {
    const source = '😀\n- First item\n^item\n';
    const metadata = getObsidianDocumentMetadata(makeDocument(source));
    const block = metadata.blocks[0];
    expect(block).toBeDefined();
    expect(source.slice(block!.start, block!.end)).toContain('- First item');
    expect(source.slice(block!.markerStart, block!.markerEnd)).toBe('^item');
  });

  it('derives formatted heading text and detects block-prefixed collisions', () => {
    const source = '# **Hello** [[target|Visible]]\n\n# block-thing\n\nText\n^thing';
    const metadata = getObsidianDocumentMetadata(makeDocument(source));
    expect(metadata.headings[0]).toMatchObject({ id: 'hello-visible', text: 'Hello Visible' });
    expect(metadata.diagnostics.map((item) => item.message)).toContain(
      'Duplicate Obsidian block identifier: thing',
    );
  });

  it('collects HTML identifiers outside protected regions only', () => {
    const source =
      '%%\n<div id="private-comment">\n%%\n<div id="public">\n\n```html\n<div id="private-code">\n```';
    const metadata = getObsidianDocumentMetadata(makeDocument(source));
    expect(metadata.htmlIds).toEqual(['public']);
  });

  it('reports detached and colliding block identifiers', () => {
    const metadata = getObsidianDocumentMetadata(
      makeDocument('^detached\n\n# Block\n^Block\n\nText ^Block'),
    );
    expect(metadata.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(
      expect.arrayContaining([
        'Duplicate Obsidian block identifier: Block',
        'Detached block reference: ^detached',
      ]),
    );
  });

  it('caches metadata by document identity', () => {
    const document = makeDocument('# Heading');
    expect(getObsidianDocumentMetadata(document)).toBe(getObsidianDocumentMetadata(document));
  });
});
