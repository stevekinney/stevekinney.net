import { describe, expect, it } from 'vitest';

import { extractSection, findHeadings } from './sections';

const read = (markdown: string, heading: string): string | null => {
  const lines = markdown.split('\n');

  return extractSection(lines, findHeadings(lines), heading);
};

describe('extractSection', () => {
  it('matches the heading text at any level, case-insensitively', () => {
    expect(read('## TL;DR\nTwo.\n## Next\nx', 'tl;dr')).toBe('Two.');
    expect(read('## Pattern\n### tl;dr\nNested.\n### Next\nx', 'TL;DR')).toBe('Nested.');
  });

  it('runs to the next heading of the same or a higher level, and keeps deeper ones', () => {
    const markdown = '## Use\nA\n### Detail\nB\n## Stop\nC';

    expect(read(markdown, 'Use')).toBe('A\n### Detail\nB');
  });

  it('stops a nested section at the next section or at the end of its parent', () => {
    const markdown = '## Pattern\n### When To Use It\nA\n### Next\nB\n## Other\nC';

    expect(read(markdown, 'When To Use It')).toBe('A');
  });

  it('takes the first occurrence when a heading repeats', () => {
    const markdown =
      '## Drawbacks and Failure Modes\nFirst.\n## Follow-up\n### Drawbacks and Failure Modes\nSecond.';

    expect(read(markdown, 'Drawbacks and Failure Modes')).toBe('First.');
  });

  it('ignores headings inside fenced code', () => {
    const markdown = '## Pattern\n```bash\n# When To Use It\n```\n## When To Use It\nReal.';

    expect(read(markdown, 'When To Use It')).toBe('Real.');
    expect(read('## A\n```\n## B\n```\ntext', 'A')).toBe('```\n## B\n```\ntext');
  });

  it('returns null when there is no such heading and an empty string for an empty section', () => {
    expect(read('## Other\nx', 'TL;DR')).toBeNull();
    expect(read('## TL;DR\n\n## Next', 'TL;DR')).toBe('');
  });

  it('tolerates emphasis and a trailing colon in a heading', () => {
    expect(read('## **TL;DR:**\nText', 'TL;DR')).toBe('Text');
  });
});
