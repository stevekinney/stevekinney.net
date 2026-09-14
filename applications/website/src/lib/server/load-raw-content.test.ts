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
});
