import { describe, expect, it } from 'vitest';

import { resolveObsidianReference } from '../../../../packages/markdown/src/obsidian-resolver';
import { normalizeMarkdownLinks } from '../../../../packages/markdown/src/obsidian-markdown-links';
import { normalizeObsidianMarkdown } from '../../../../packages/markdown/src/obsidian-normalization';
import { applySourceEdits } from '../../../../packages/markdown/src/obsidian-source-edits';
import type {
  NormalizationContext,
  PublicationDocument,
} from '../../../../packages/markdown/src/obsidian-types';

const document = (sourcePath: string, aliases?: readonly string[]): PublicationDocument => ({
  sourcePath,
  route: `/${sourcePath.replace(/\.md$/u, '')}`,
  source: `# ${sourcePath}`,
  aliases,
});

const context = (
  documents: readonly PublicationDocument[],
  sourcePath = 'writing/a.md',
  attachments: NormalizationContext['publicationIndex']['attachments'] = [],
): NormalizationContext => ({ sourcePath, publicationIndex: { documents, attachments } });

describe('resolveObsidianReference', () => {
  it('uses source-relative, root-qualified, basename, then alias precedence', () => {
    const relative = document('writing/x/note.md', ['alias']);
    const root = document('x/note.md');
    const byBasename = document('courses/note.md');
    const result = resolveObsidianReference('x/note', context([relative, root, byBasename]));
    expect(result.reference).toMatchObject({ document: relative });

    const basenameResult = resolveObsidianReference(
      'note',
      context([byBasename, document('writing/alias.md', ['note'])]),
    );
    expect(basenameResult.reference).toMatchObject({ document: byBasename });
  });

  it('resolves valid parent traversal within publication roots', () => {
    const result = resolveObsidianReference(
      '../courses/x/note',
      context([document('courses/x/note.md')]),
    );
    expect(
      result.reference?.kind === 'document' ? result.reference.document.sourcePath : undefined,
    ).toBe('courses/x/note.md');
  });

  it('rejects escaping traversal, malformed encoding, and explicit unmatched paths', () => {
    const alias = document('writing/alias.md', ['secret']);
    expect(resolveObsidianReference('../../../secret', context([alias])).reference).toBeUndefined();
    expect(resolveObsidianReference('%E0%A4%A', context([alias])).reference).toBeUndefined();
    expect(
      resolveObsidianReference('missing/note', context([document('courses/note.md')])).reference,
    ).toBeUndefined();
  });

  it('keeps matching case-sensitive and reports ambiguous basenames', () => {
    const documents = [document('writing/Note.md'), document('courses/Note.md')];
    expect(
      resolveObsidianReference('note', context(documents, 'projects/z.md')).reference,
    ).toBeUndefined();
    expect(
      resolveObsidianReference('Note', context(documents, 'projects/z.md')).diagnostics[0]?.message,
    ).toContain('Ambiguous');
  });

  it('matches static attachment URLs and does not fall back to documents', () => {
    const result = resolveObsidianReference(
      '/audio/file.mp3',
      context([], 'writing/a.md', [
        {
          sourcePath: 'applications/website/static/audio/file.mp3',
          url: '/audio/file.mp3',
          mimeType: 'audio/mpeg',
        },
      ]),
      'attachment',
    );
    expect(
      result.reference?.kind === 'attachment' ? result.reference.attachment.url : undefined,
    ).toBe('/audio/file.mp3');
    const missing = resolveObsidianReference(
      'unknown.mp3',
      context([document('writing/unknown.mp3.md')]),
      'attachment',
    );
    expect(missing.reference).toBeUndefined();
    expect(missing.diagnostics[0]?.message).toContain('attachment');
  });
});

describe('normalizeMarkdownLinks', () => {
  it('returns edits for document links and leaves fenced code untouched', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/target.md',
      route: '/writing/target',
      source: '# Heading\n## Heading\n^block-id',
    };
    const source = '[target](writing/target.md#heading)\n\n```md\n[target](missing.md)\n```';
    const result = normalizeMarkdownLinks(source, context([target]));
    expect(result.edits).toHaveLength(1);
    expect(result.edits[0]?.value).toContain('/writing/target#heading');
    expect(result.diagnostics).toEqual([]);
  });

  it('rewrites local anchors from the supplied identifier map', () => {
    const result = normalizeMarkdownLinks('[jump](#old)', context([]), {
      localIds: new Map([['old', 'host-old']]),
    });
    expect(applySourceEdits('[jump](#old)', result.edits).markdown).toBe('[jump](<#host-old>)');
  });

  it('rewrites local block anchors from the supplied identifier map', () => {
    const source = '[jump](#^old)';
    const result = normalizeMarkdownLinks(source, context([]), {
      embedded: true,
      localIds: new Map([['block-old', 'embed-block-old']]),
    });
    expect(applySourceEdits(source, result.edits).markdown).toBe('[jump](<#embed-block-old>)');
  });

  it('applies returned edits without touching route links or fenced code', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/target.md',
      route: '/writing/target',
      source: '# Heading',
    };
    const source = '[a](/about) [b](writing/target.md#heading)\n```md\n[c](missing.md)\n```';
    const result = normalizeMarkdownLinks(source, context([target]));
    expect(applySourceEdits(source, result.edits).markdown).toContain('[a](/about)');
    expect(applySourceEdits(source, result.edits).markdown).toContain('/writing/target#heading');
    expect(result.diagnostics).toEqual([]);
  });

  it('resolves Markdown paths with queries and validates their fragments', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/target.md',
      route: '/writing/target',
      source: '# Heading',
    };
    const source = '[target](writing/target.md?view=reading#heading)';
    const result = normalizeMarkdownLinks(source, context([target]));

    expect(applySourceEdits(source, result.edits).markdown).toBe(
      '[target](</writing/target?view=reading#heading>)',
    );
    expect(result.dependencies).toEqual(['writing/target.md']);
    expect(result.diagnostics).toEqual([]);

    const missingFragment = normalizeMarkdownLinks(
      '[target](writing/target.md?view=reading#missing)',
      context([target]),
    );
    expect(missingFragment.dependencies).toEqual(['writing/target.md']);
    expect(missingFragment.diagnostics[0]?.message).toContain('Missing Markdown fragment');
  });

  it('resolves query-bearing Markdown paths before checking the extension', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/target.md',
      route: '/writing/target',
      source: '# Heading',
    };
    const source = '[target](writing/target?view=reading#heading)';
    const result = normalizeMarkdownLinks(source, context([target]));

    expect(applySourceEdits(source, result.edits).markdown).toBe(
      '[target](</writing/target?view=reading#heading>)',
    );
    expect(result.dependencies).toEqual(['writing/target.md']);
    expect(result.diagnostics).toEqual([]);
  });

  it('normalizes extensionless internal document links through the full pipeline', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/target.md',
      route: '/writing/target',
      source: '# Heading',
    };
    const source = '[target](writing/target#heading)';
    const result = normalizeObsidianMarkdown(source, context([target]));

    expect(result.markdown).toBe('[target](</writing/target#heading>)');
    expect(result.dependencies).toEqual(['writing/target.md']);
    expect(result.diagnostics).toEqual([]);
  });

  it('namespaces footnote identifiers with narrow edits', () => {
    const source = 'See[^one].\n\n[^one]: note';
    const result = normalizeMarkdownLinks(source, context([]), { footnotePrefix: 'host-' });
    expect(applySourceEdits(source, result.edits).markdown).toBe(
      'See[^host-one].\n\n[^host-one]: note',
    );
  });
});
