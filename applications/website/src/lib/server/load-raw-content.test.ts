import { describe, expect, it, vi } from 'vitest';
import type { PublicationIndex } from '@stevekinney/markdown/obsidian-types';

vi.mock('$app/server', () => ({ read: vi.fn() }));
vi.mock('$lib/server/content', () => ({
  getCourseRoute: vi.fn(),
  getLessonRoute: vi.fn(),
  getProjectRoute: vi.fn(),
  getWritingRoute: vi.fn(),
}));

import { rewritePublishedAttachments } from './load-raw-content';

const publicationIndex: PublicationIndex = {
  documents: [],
  attachments: [
    {
      sourcePath: 'writing/assets/diagram.png',
      url: 'https://cdn.example.com/diagram.png',
      mimeType: 'image/png',
    },
  ],
};

describe('rewritePublishedAttachments', () => {
  it('rewrites relative Markdown images and removes Obsidian image markers', () => {
    const markdown = [
      '![Diagram](assets/diagram.png)',
      '',
      '<img data-obsidian-attachment="" src="assets/diagram.png" alt="Diagram">',
    ].join('\n');

    expect(rewritePublishedAttachments(markdown, 'writing/post.md', publicationIndex)).toBe(
      [
        '![Diagram](<https://cdn.example.com/diagram.png>)',
        '',
        '<img src="https://cdn.example.com/diagram.png" alt="Diagram">',
      ].join('\n'),
    );
  });

  it('does not rewrite code examples or external images', () => {
    const markdown = [
      '```md',
      '![Diagram](assets/diagram.png)',
      '```',
      '',
      '![Remote](https://example.com/image.png)',
    ].join('\n');

    expect(rewritePublishedAttachments(markdown, 'writing/post.md', publicationIndex)).toBe(
      markdown,
    );
  });

  it('decodes relative paths and ignores query strings and fragments', () => {
    const markdown = [
      '![Diagram](assets/diagram%20final.png?width=640#preview)',
      '',
      '<img data-obsidian-attachment="" src="assets/diagram%20final.png?width=640#preview">',
    ].join('\n');
    const index: PublicationIndex = {
      documents: [],
      attachments: [
        {
          sourcePath: 'writing/assets/diagram final.png',
          url: 'https://cdn.example.com/diagram-final.png',
          mimeType: 'image/png',
        },
      ],
    };

    expect(rewritePublishedAttachments(markdown, 'writing/post.md', index)).toBe(
      [
        '![Diagram](<https://cdn.example.com/diagram-final.png>)',
        '',
        '<img src="https://cdn.example.com/diagram-final.png">',
      ].join('\n'),
    );
  });

  it('rewrites ordinary HTML images decoded from footnote transport', () => {
    const markdown =
      '<section data-footnotes><p><img src="assets/diagram.png" alt="Diagram"></p></section>';

    expect(rewritePublishedAttachments(markdown, 'writing/post.md', publicationIndex)).toBe(
      '<section data-footnotes><p><img src="https://cdn.example.com/diagram.png" alt="Diagram"></p></section>',
    );
  });
});
