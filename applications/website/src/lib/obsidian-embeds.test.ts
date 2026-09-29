import { describe, expect, it } from 'vitest';
import { Buffer } from 'node:buffer';

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

  it('routes partial-embed links to same-document targets outside the selected range', () => {
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
    expect(result.markdown).toContain('[Outside](</partial#outside>)');
  });

  it('normalizes definitions appended to partial embeds', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/partial-definitions.md',
      route: '/partial-definitions',
      source:
        '# Included\n\nIncluded body.[^outside]\n\n# Outside\n\nOutside body.\n\n[^outside]: [[guide]]',
    };
    const result = normalizeObsidianMarkdown('![[partial-definitions#Included]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [...documents, target], attachments: [] },
    });
    expect(result.diagnostics).toEqual([]);
    const footnotes = [...result.markdown.matchAll(/data-obsidian-footnote="([^"]+)"/gu)].map(
      (match) => Buffer.from(match[1], 'base64url').toString(),
    );
    expect(footnotes).toHaveLength(2);
    expect(footnotes.some((footnote) => footnote.includes('/writing/guide'))).toBe(true);
    expect(result.dependencies).toContain('writing/guide.md');
  });

  it('allows escaped pipes in wiki aliases', () => {
    const result = normalizeObsidianMarkdown('[[guide|A \\| B]]', context());
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('[A \\| B](</writing/guide>)');
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

  it('preserves list syntax for a block identifier attached to an embed', () => {
    const result = normalizeObsidianMarkdown('- ![[guide#^block-one]] ^host', context());

    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toMatch(/^- Block body\./u);
  });

  it('preserves blockquote and nested list containers around expanded embeds', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/quote.md',
      route: '/quote',
      source: 'First line.\n\nSecond line.',
    };
    const result = normalizeObsidianMarkdown('> ![[quote]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toMatch(/^> First line\.\n>\s*\n> Second line\.$/u);

    const listResult = normalizeObsidianMarkdown('- ![[quote]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });
    expect(listResult.diagnostics).toEqual([]);
    expect(listResult.markdown).toMatch(/^- First line\.\n {2}\n {2}Second line\.$/u);
  });

  it('retargets local anchors and namespaces embedded footnotes', () => {
    const result = normalizeObsidianMarkdown('[[guide#Details]]\n\n![[guide]]', context());
    expect(result.markdown).toContain('/writing/guide#details');
    expect(result.markdown).toMatch(/embed-[a-z0-9-]+/u);
  });

  it('retargets local Markdown block anchors inside an embed', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/blocks.md',
      route: '/writing/blocks',
      source: 'Body.\n\n^target\n\n[Jump](#^target)',
    };
    const result = normalizeObsidianMarkdown('![[blocks]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toMatch(/\[Jump\]\(<#embed-[a-z0-9-]+block-target>\)/u);
  });

  it('namespaces raw HTML identifiers and local links inside an embed', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/html-identifiers.md',
      route: '/writing/html-identifiers',
      source:
        '<a href="#details">Jump</a>\n\n<section id="details" data-id="keep">Details</section>',
    };
    const result = normalizeObsidianMarkdown('![[html-identifiers]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toMatch(/id="embed-[a-z0-9-]+details"/u);
    expect(result.markdown).toContain('data-id="keep"');
    expect(result.markdown).toMatch(/href="#embed-[a-z0-9-]+details"/u);
  });

  it('namespaces valid unquoted raw HTML identifiers inside an embed', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/unquoted-html-identifiers.md',
      route: '/writing/unquoted-html-identifiers',
      source: '<a href="#details">Jump</a>\n\n<span id=details>Details</span>',
    };
    const result = normalizeObsidianMarkdown(
      '![[unquoted-html-identifiers]]\n\n![[unquoted-html-identifiers]]',
      {
        sourcePath: 'writing/host.md',
        publicationIndex: { documents: [target], attachments: [] },
      },
    );

    expect(result.diagnostics).toEqual([]);
    const identifiers = [...result.markdown.matchAll(/id=(embed-[a-z0-9-]+details)/gu)].map(
      (match) => match[1],
    );
    expect(identifiers).toHaveLength(2);
    expect(new Set(identifiers).size).toBe(2);
    expect(result.markdown.match(/href="#embed-[a-z0-9-]+details"/gu)).toHaveLength(2);
  });

  it('rebases the real src attribute when another attribute ends in src', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/sub/lazy.md',
      route: '/writing/sub/lazy',
      source: '<img data-src="lazy" src="assets/photo.png">',
    };
    const result = normalizeObsidianMarkdown('![[sub/lazy]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: {
        documents: [target],
        attachments: [
          {
            sourcePath: 'writing/sub/assets/photo.png',
            url: 'https://cdn.example.com/photo.png',
            mimeType: 'image/png',
          },
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('data-src="lazy"');
    expect(result.markdown).toMatch(/ src="sub\/assets\/photo\.png"/u);
  });

  it('only marks embedded sources around playground fences, on their own paragraphs', () => {
    const plain: PublicationDocument = {
      sourcePath: 'writing/plain.md',
      route: '/writing/plain',
      source: 'Plain body.',
    };
    const playground: PublicationDocument = {
      sourcePath: 'writing/playground.md',
      route: '/writing/playground',
      source: '~~~html tailwind\n<div></div>\n~~~',
    };
    const publicationIndex = { documents: [plain, playground], attachments: [] };

    expect(
      normalizeObsidianMarkdown('![[plain]]', { sourcePath: 'writing/host.md', publicationIndex })
        .markdown,
    ).not.toContain('obsidian-embedded-source');
    expect(
      normalizeObsidianMarkdown('![[playground]]', {
        sourcePath: 'writing/host.md',
        publicationIndex,
      }).markdown,
    ).toMatch(
      /<!-- obsidian-embedded-source: writing%2Fplayground\.md -->\n\n~~~html[\s\S]*~~~\n\n<!-- obsidian-embedded-source: writing%2Fhost\.md -->/u,
    );
  });

  it('leaves Svelte component id props alone inside an embed', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/component.md',
      route: '/writing/component',
      source: '<Example id="demo" />\n\n<span id="real"></span>',
    };
    const result = normalizeObsidianMarkdown('![[component]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toContain('<Example id="demo" />');
    expect(result.markdown).toMatch(/id="embed-[a-z0-9-]+real"/u);
  });

  it('retargets label and ARIA references to namespaced identifiers', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/form.md',
      route: '/writing/form',
      source:
        '<label for="email">Email</label><input id="email" aria-describedby="hint email"><span id="hint"></span>',
    };
    const result = normalizeObsidianMarkdown('![[form]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    const email = /id="(embed-[a-z0-9-]+email)"/u.exec(result.markdown)?.[1];
    const hint = /id="(embed-[a-z0-9-]+hint)"/u.exec(result.markdown)?.[1];
    expect(email).toBeDefined();
    expect(result.markdown).toContain(`for="${email}"`);
    expect(result.markdown).toContain(`aria-describedby="${hint} ${email}"`);
  });

  it('escapes wiki-link alias pipes so table cells stay intact', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/guide.md',
      route: '/writing/guide',
      source: 'Body.',
    };
    const result = normalizeObsidianMarkdown('| [[guide|A \\| B]] |\n| - |', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toContain('[A \\| B](');
  });

  it('retargets list, form, and headers references', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/choices.md',
      route: '/writing/choices',
      source: '<input list="choices"><datalist id="choices"></datalist>',
    };
    const result = normalizeObsidianMarkdown('![[choices]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });
    const choices = /id="(embed-[a-z0-9-]+choices)"/u.exec(result.markdown)?.[1];

    expect(choices).toBeDefined();
    expect(result.markdown).toContain(`list="${choices}"`);
  });

  it('ignores identifiers inside HTML comments when namespacing an embed', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/commented.md',
      route: '/writing/commented',
      source: '<!-- <span id="details"> -->\n\n<a href="#details">Jump</a>',
    };
    const result = normalizeObsidianMarkdown('![[commented]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toContain('href="#details"');
  });

  it('marks embedded CSS-only playground notes', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/styles.md',
      route: '/writing/styles',
      source: '~~~css playground=brand\n.brand {}\n~~~',
    };
    const result = normalizeObsidianMarkdown('![[styles]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toContain('obsidian-embedded-source: writing%2Fstyles.md');
  });

  it('links to the source route for a heading outside an embedded section', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/sections.md',
      route: '/writing/sections',
      source: '# One\n\nSee [[#Two]].\n\n# Two\n\nMore.',
    };
    const result = normalizeObsidianMarkdown('![[sections#One]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toContain('](</writing/sections#two>)');
  });

  it('preserves compact blockquote containers around embeds', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/quote.md',
      route: '/writing/quote',
      source: 'First line.\n\nSecond line.',
    };
    const result = normalizeObsidianMarkdown('>![[quote]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toMatch(/^>First line\.\n>\s*\n>Second line\.$/u);
  });

  it('namespaces identifiers written with uppercase attribute names', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/uppercase.md',
      route: '/writing/uppercase',
      source: '<div ID="details"></div>\n\n<a HREF="#details">Jump</a>',
    };
    const result = normalizeObsidianMarkdown('![[uppercase]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toMatch(/ID="embed-[a-z0-9-]+details"/u);
    expect(result.markdown).toMatch(/HREF="#embed-[a-z0-9-]+details"/u);
  });

  it('rebases query-only links from an embedded note to its route', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/printable.md',
      route: '/writing/printable',
      source: '[print](?mode=print)',
    };
    const result = normalizeObsidianMarkdown('![[printable]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toContain('](</writing/printable?mode=print>)');
  });

  it('retargets links to identifiers written with HTML entities', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/entities.md',
      route: '/writing/entities',
      source: '<div id="a&amp;b"></div>\n\n<a href="#a%26b">Jump</a>',
    };
    const result = normalizeObsidianMarkdown('![[entities]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toMatch(/href="#embed-[a-z0-9-]+a%26b"/u);
  });

  it('keeps an embed inside a task-list item', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/steps.md',
      route: '/writing/steps',
      source: 'First line.\n\nSecond line.',
    };
    const result = normalizeObsidianMarkdown('- [ ] ![[steps]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.markdown).toMatch(/^- \[ \] First line\.\n {6}\n {6}Second line\.$/u);
  });

  it('supports whitespace around raw HTML identifier equals signs', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/spaced-html-identifiers.md',
      route: '/writing/spaced-html-identifiers',
      source: '<a href = "#details">Jump</a>\n\n<span id \t=\t details>Details</span>',
    };
    const result = normalizeObsidianMarkdown('![[spaced-html-identifiers]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toMatch(/id \t=\t embed-[a-z0-9-]+details/u);
    expect(result.markdown).toMatch(/href = "#embed-[a-z0-9-]+details"/u);
  });

  it('does not namespace data-href attributes', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/data-href.md',
      route: '/writing/data-href',
      source: '<a data-href="#details">Data</a>\n\n<span id="details">Details</span>',
    };
    const result = normalizeObsidianMarkdown('![[data-href]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('data-href="#details"');
  });

  it('namespaces valid unquoted raw HTML fragment links inside an embed', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/unquoted-html-fragment-links.md',
      route: '/writing/unquoted-html-fragment-links',
      source:
        '<a href=#details>Plain</a>\n\n<a href = #details data-kind="spaced">Spaced</a>\n\n<span id=details>Details</span>',
    };
    const result = normalizeObsidianMarkdown('![[unquoted-html-fragment-links]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toMatch(/href=#embed-[a-z0-9-]+details\b/u);
    expect(result.markdown).toMatch(/href = #embed-[a-z0-9-]+details\b/u);
  });

  it('resolves fragment-only wiki links inside recursively embedded documents', () => {
    const child: PublicationDocument = {
      sourcePath: 'writing/child.md',
      route: '/child',
      source: '# Child\n\n[[#Child]]',
    };
    const result = normalizeObsidianMarkdown('![[child]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [child], attachments: [] },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toMatch(/\]\(<#embed-[a-z0-9-]+child>\)/u);
  });

  it('does not leak BOM-prefixed frontmatter from whole-note embeds', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/bom.md',
      route: '/bom',
      source: '\uFEFF---\ntitle: Hidden\n---\nBody.',
    };
    const result = normalizeObsidianMarkdown('![[bom]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('Body.');
    expect(result.markdown).not.toContain('title: Hidden');
  });

  it('allows nested self-section embeds outside the current section range', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/sections.md',
      route: '/writing/sections',
      source: '# First\n\n![[#Second]]\n\n# Second\n\nSecond body.',
    };
    const result = normalizeObsidianMarkdown('![[sections#First]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: { documents: [target], attachments: [] },
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('Second body.');
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

  it('resolves raw HTML image resources from the embedded note', () => {
    const target: PublicationDocument = {
      sourcePath: 'writing/nested/note.md',
      route: '/writing/nested/note',
      source: '<img src="assets/demo.png" alt="Demo">',
    };
    const result = normalizeObsidianMarkdown('![[nested/note]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: {
        documents: [target],
        attachments: [
          {
            sourcePath: 'writing/nested/assets/demo.png',
            url: '/assets/demo.png',
            mimeType: 'image/png',
          },
        ],
      },
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.markdown).toContain('src="nested/assets/demo.png"');
    expect(result.dependencies).toContain('writing/nested/assets/demo.png');
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
