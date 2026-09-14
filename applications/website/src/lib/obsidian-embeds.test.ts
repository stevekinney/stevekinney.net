import { describe, expect, it } from 'vitest';

import { normalizeObsidianMarkdown } from '../../../../packages/markdown/src/obsidian-normalization';
import type {
  NormalizationContext,
  PublicationDocument,
} from '../../../../packages/markdown/src/obsidian-types';

const documents: PublicationDocument[] = [
  {
    sourcePath: 'writing/host.md',
    route: '/writing/host',
    source: '# Host\n\nSee [[guide#Details]].\n\n[^host]: host footnote',
  },
  {
    sourcePath: 'writing/guide.md',
    route: '/writing/guide',
    source:
      '---\ntitle: Guide\n---\n# Guide\n\nIntro.\n\n## Details\n\nA ==highlight== with $x^2$.\n\nBlock body.\n^block-one\n\n[^guide]: Guide footnote',
  },
  {
    sourcePath: 'writing/cycle-a.md',
    route: '/writing/cycle-a',
    source: '![[cycle-b]]',
  },
  {
    sourcePath: 'writing/cycle-b.md',
    route: '/writing/cycle-b',
    source: '![[cycle-a]]',
  },
];

const context = (sourcePath = 'writing/host.md'): NormalizationContext => ({
  sourcePath,
  publicationIndex: {
    documents,
    attachments: [
      { sourcePath: 'writing/assets/demo.png', url: '/assets/demo.png', mimeType: 'image/png' },
      {
        sourcePath: 'writing/assets/demo.pdf',
        url: '/assets/demo.pdf',
        mimeType: 'application/pdf',
      },
      { sourcePath: 'writing/assets/demo.mp4', url: '/assets/demo.mp4', mimeType: 'video/mp4' },
    ],
  },
});

describe('normalizeObsidianMarkdown embeds', () => {
  it('expands whole and heading embeds without leaking frontmatter', () => {
    const result = normalizeObsidianMarkdown('![[guide]]\n\n![[guide#Details]]', context());
    expect(result.markdown).toContain('Intro.');
    expect(result.markdown).toContain('A ');
    expect(result.markdown).not.toContain('title: Guide');
    expect(result.dependencies).toContain('writing/guide.md');
  });

  it('supports self heading and block embeds without treating them as cycles', () => {
    const source = '# Heading\n\nHeading body.\n\nBlock body.\n^block\n';
    const result = normalizeObsidianMarkdown('![[#Heading]]\n\n![[#^block]]', {
      sourcePath: 'writing/self.md',
      publicationIndex: {
        documents: [{ sourcePath: 'writing/self.md', route: '/self', source }],
        attachments: [],
      },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown.match(/Heading body\./g)).toHaveLength(1);
    expect(result.markdown.match(/Block body\./g)).toHaveLength(2);
  });

  it('keeps local links outside a partial embed in their original namespace', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/partial.md',
      route: '/partial',
      source: '# Included\n\n[Outside](#outside)\n\n# Outside\n\nOutside body.',
    };
    const result = normalizeObsidianMarkdown('![[partial#Included]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('[Outside](#outside)');
  });

  it('allows escaped pipes in wiki aliases', () => {
    const result = normalizeObsidianMarkdown('[[guide|A \\| B]]', context());
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('[A | B](</writing/guide>)');
  });

  it('expands block embeds and keeps repeated embeds independently addressable', () => {
    const result = normalizeObsidianMarkdown(
      '![[guide#^block-one]]\n\n![[guide#^block-one]]',
      context(),
    );
    expect(result.markdown.match(/Block body\./g)).toHaveLength(2);
    const identifiers = [...result.markdown.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(identifiers).toHaveLength(2);
    expect(new Set(identifiers).size).toBe(2);
  });

  it('retargets local anchors and namespaces embedded footnotes', () => {
    const result = normalizeObsidianMarkdown('[[guide#Details]]\n\n![[guide]]', context());
    expect(result.markdown).toContain('/writing/guide#details');
    expect(result.markdown).toMatch(/embed-[a-z0-9-]+/u);
  });

  it('expands approved media with dimensions and PDF fragments', () => {
    const result = normalizeObsidianMarkdown(
      '![[assets/demo.png|320x200]] ![[assets/demo.mp4]] ![[assets/demo.pdf#page=2]]',
      context(),
    );
    expect(result.markdown).toContain('src="assets/demo.png"');
    expect(result.markdown).toContain('width="320"');
    expect(result.markdown).toContain('<video');
    expect(result.markdown).toContain('page=2');
  });

  it('keeps approved static image embeds on their public URL', () => {
    const result = normalizeObsidianMarkdown('![[/images/approved.png]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: {
        documents: [],
        attachments: [
          {
            sourcePath: 'applications/website/static/images/approved.png',
            url: '/images/approved.png',
            mimeType: 'image/png',
          },
        ],
      },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('src="/images/approved.png"');
  });

  it('removes comments and preserves highlights and math inside an embed', () => {
    const result = normalizeObsidianMarkdown('![[guide#Details]]', context());
    expect(result.markdown).toContain('<mark>highlight</mark>');
    expect(result.markdown).toContain('data-obsidian-math');
    expect(result.markdown).not.toContain('%%');
  });

  it('reports cycles, missing references, and ambiguous references', () => {
    const cycle = normalizeObsidianMarkdown('![[cycle-b]]', context('writing/cycle-a.md'));
    expect(cycle.diagnostics.some((diagnostic) => diagnostic.message.includes('cycle'))).toBe(true);
    const missing = normalizeObsidianMarkdown('![[missing]]', context());
    expect(missing.diagnostics.some((diagnostic) => diagnostic.message.includes('Missing'))).toBe(
      true,
    );
    const ambiguousDocuments = [
      ...documents,
      { ...documents[1], sourcePath: 'writing/archive/other.md' },
      { ...documents[1], sourcePath: 'courses/archive/other.md' },
    ];
    const ambiguousContext = {
      ...context(),
      publicationIndex: { ...context().publicationIndex, documents: ambiguousDocuments },
    };
    const ambiguous = normalizeObsidianMarkdown('![[other]]', ambiguousContext);
    expect(
      ambiguous.diagnostics.some((diagnostic) => diagnostic.message.includes('Ambiguous')),
    ).toBe(true);
  });
});

it('reports an embedded unclosed comment against its original document', () => {
  const target = {
    sourcePath: 'writing/private-comment.md',
    route: '/private-comment',
    source: 'First line\n%% secret',
  };
  const result = normalizeObsidianMarkdown('![[private-comment]]\n\nHost text.', {
    sourcePath: 'writing/host.md',
    publicationIndex: { documents: [target], attachments: [] },
  });
  expect(result.diagnostics).toContainEqual({
    file: target.sourcePath,
    line: 2,
    message: 'Unclosed Obsidian comment.',
  });
  expect(result.markdown).not.toContain('secret');
  expect(result.markdown).toContain('Host text.');
});

it('allows 32 nested inclusions and rejects the next inclusion', () => {
  const chain = (count: number): PublicationDocument[] =>
    Array.from({ length: count }, (_, index) => ({
      sourcePath: `writing/note-${index}.md`,
      route: `/note-${index}`,
      source: index + 1 < count ? `![[note-${index + 1}]]` : 'Leaf.',
    }));
  const run = (count: number) =>
    normalizeObsidianMarkdown('![[note-0]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: chain(count), attachments: [] },
    });
  expect(run(32).diagnostics).toEqual([]);
  expect(run(32).markdown).toContain('Leaf.');
  expect(run(33).diagnostics.some((issue) => issue.message.includes('32 nested inclusions'))).toBe(
    true,
  );
});

it('reports the 10 MiB expanded output ceiling without truncating an embed', () => {
  const child: PublicationDocument = {
    sourcePath: 'writing/large.md',
    route: '/large',
    source: 'Leaf line '.repeat(20_000),
  };
  const source = Array.from({ length: 60 }, () => '![[large]]').join('\n\n');
  const result = normalizeObsidianMarkdown(source, {
    sourcePath: 'writing/host.md',
    publicationIndex: { documents: [child], attachments: [] },
  });

  expect(
    result.diagnostics.some(
      (diagnostic) => diagnostic.message === 'Obsidian expanded output exceeds 10 MiB.',
    ),
  ).toBe(true);
  expect(result.markdown).toContain('Leaf line ');
  expect(result.markdown.match(/!\[\[large\]\]/g)?.length).toBeGreaterThan(0);
  expect(result.markdown.length).toBeGreaterThan(child.source.length);
});
