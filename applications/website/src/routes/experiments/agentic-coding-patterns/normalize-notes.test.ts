import { describe, expect, it } from 'vitest';

import { buildDataset, formatReport, noteName, parseTypeList, slugify } from './normalize-notes';
import type { NoteSource } from './pattern-types';

const note = (name: string, frontmatter: string, body = '', folder = ''): NoteSource => ({
  path: `${folder}${name}.md`,
  text: `---\n${frontmatter}\n---\n\n${body}`,
});

const completeBody = [
  '## TL;DR',
  'Summary.',
  '## When To Use It',
  'Use it.',
  '## When Not To Use It',
  'Do not.',
  '## Drawbacks and Failure Modes',
  'Costs.',
  '## Related Patterns',
  '- [[Beta]]—why',
].join('\n');

const alpha = note(
  'Alpha',
  'type: pattern\ncategory: verification\nmaturity: established\nconfidence: Strong',
  completeBody,
);
const beta = note(
  'Beta',
  'type: methodology\ncategory: planning\nmaturity: emerging\nconfidence: Experimental',
  completeBody.replace('[[Beta]]', '[[Alpha]]'),
);

describe('buildDataset', () => {
  it('normalizes a note into a record', () => {
    const { entries } = buildDataset([alpha, beta]);
    const entry = entries.find(({ name }) => name === 'Alpha');

    expect(entry).toEqual({
      id: 'alpha',
      name: 'Alpha',
      type: 'pattern',
      category: 'verification',
      maturity: 'established',
      confidence: 'Strong',
      aliases: [],
      summary: 'Summary.',
      whenToUse: 'Use it.',
      whenNotToUse: 'Do not.',
      drawbacks: 'Costs.',
      related: ['Beta'],
      sourcePath: 'Alpha.md',
      missing: [],
    });
  });

  it('finds sections nested under a title heading, so those notes are not partial', () => {
    const nested = note(
      'Agent Handoff',
      'type: pattern\ncategory: multi-agent\nmaturity: established\nconfidence: Emerging',
      [
        '## Agent Handoff',
        '### TL;DR',
        'A handoff transfers control.',
        '### When To Use It',
        'When routing is the workflow.',
        '### When Not To Use It',
        'When you must combine outputs.',
        '### Drawbacks and Failure Modes',
        'Authority transfers too.',
      ].join('\n'),
    );
    const { entries, report } = buildDataset([nested]);

    expect(entries[0]?.summary).toBe('A handoff transfers control.');
    expect(entries[0]?.missing).toEqual([]);
    expect(report.partial).toEqual([]);
  });

  it('marks an entry partial and names each missing section, including an empty one', () => {
    const partial = note(
      'Thin',
      'type: pattern\ncategory: planning\nmaturity: emerging\nconfidence: Emerging',
      '## TL;DR\nOnly this.\n## When To Use It\n\n## Drawbacks and Failure Modes\nCosts.',
    );
    const { entries, report } = buildDataset([partial]);

    expect(entries[0]?.missing).toEqual(['whenToUse', 'whenNotToUse']);
    expect(report.partial).toEqual([
      { id: 'thin', name: 'Thin', sourcePath: 'Thin.md', missing: ['whenToUse', 'whenNotToUse'] },
    ]);
  });

  it('accepts inline, block, and single-string aliases, and mixed-case labels', () => {
    const { entries } = buildDataset([
      note('One', 'type: pattern\naliases: [A, "B, C"]\nmaturity: Established\nconfidence: STRONG'),
      note('Two', 'type: pattern\naliases:\n  - D\n  - E'),
      note('Three', 'type: Pattern\naliases: Just F\nconfidence: experimental'),
    ]);
    const byName = Object.fromEntries(entries.map((entry) => [entry.name, entry]));

    expect(byName.One).toMatchObject({
      aliases: ['A', 'B, C'],
      maturity: 'established',
      confidence: 'Strong',
    });
    expect(byName.Two?.aliases).toEqual(['D', 'E']);
    expect(byName.Three).toMatchObject({
      type: 'pattern',
      aliases: ['Just F'],
      confidence: 'Experimental',
    });
  });

  it('excludes notes with no frontmatter, no type, or another type, each with a reason', () => {
    const { entries, report } = buildDataset([
      alpha,
      { path: 'plain.md', text: '# Just prose' },
      note('Typeless', 'category: planning'),
      note('Index', 'type: index'),
    ]);

    expect(entries.map(({ name }) => name)).toEqual(['Alpha']);
    expect(report.excluded).toEqual([
      {
        path: 'Index.md',
        reason: 'Its type is "index", and only pattern, methodology are included.',
      },
      { path: 'Typeless.md', reason: 'Its frontmatter has no type.' },
      { path: 'plain.md', reason: 'It has no frontmatter.' },
    ]);
  });

  it('includes the types it is given', () => {
    const recipe = note('Pasta', 'type: recipe');
    const { entries, report } = buildDataset([alpha, recipe], { includedTypes: ['Recipe'] });

    expect(entries.map(({ name }) => name)).toEqual(['Pasta']);
    expect(report.includedByType).toEqual({ recipe: 1 });
    expect(report.excluded[0]?.reason).toContain('only recipe is included');
  });

  it('keeps the first of two notes with one name and says where the other was', () => {
    const first = note('Same', 'type: pattern', '## TL;DR\nFirst.', 'a/');
    const second = note('Same', 'type: pattern', '## TL;DR\nSecond.', 'b/');
    const { entries, report } = buildDataset([second, first]);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.summary).toBe('First.');
    expect(report.excluded).toEqual([
      {
        path: 'b/Same.md',
        reason: 'Another note named "Same" comes first, at a/Same.md, so this one is skipped.',
      },
    ]);
  });

  it('gives names that slug alike different ids', () => {
    const { entries } = buildDataset([note('A B', 'type: pattern'), note('A-B', 'type: pattern')]);

    expect(entries.map(({ id }) => id).sort()).toEqual(['a-b', 'a-b-2']);
  });

  it('resolves related links by name, ignoring case, anchors, labels, and self-references', () => {
    const hub = note(
      'Hub',
      'type: pattern',
      [
        '## Related Patterns',
        '- [[alpha]]—lowercase',
        '- [[Alpha|the first one]]—duplicate',
        '- [[Beta#How It Works]]',
        '- [[Hub]]—itself',
        '- [[Missing Note]]',
        '- ![[diagram.svg]]',
      ].join('\n'),
    );
    const { entries, report } = buildDataset([hub, alpha, beta]);
    const entry = entries.find(({ name }) => name === 'Hub');

    expect(entry?.related).toEqual(['Alpha', 'Beta', 'Missing Note']);
    expect(report.dangling).toEqual([{ id: 'hub', name: 'Hub', target: 'Missing Note' }]);
    // Hub has three, Alpha one (Beta), and Beta one (Alpha).
    expect(report.relatedLinkCount).toBe(5);
  });

  it('only reads wikilinks from the Related Patterns section', () => {
    const { entries } = buildDataset([
      note('Prose', 'type: pattern', '## TL;DR\nSee [[Alpha]].\n## Related Patterns\n- [[Beta]]'),
      alpha,
      beta,
    ]);

    expect(entries.find(({ name }) => name === 'Prose')?.related).toEqual(['Beta']);
  });

  it('reports unknown and missing category, maturity, and confidence values', () => {
    const { report } = buildDataset([
      note('Odd', 'type: pattern\ncategory: weird\nmaturity: ancient\nconfidence: Certain'),
      note('Bare', 'type: pattern'),
    ]);

    expect(report.unknown).toEqual([
      { id: 'bare', name: 'Bare', field: 'category', value: '' },
      { id: 'bare', name: 'Bare', field: 'maturity', value: '' },
      { id: 'bare', name: 'Bare', field: 'confidence', value: '' },
      { id: 'odd', name: 'Odd', field: 'category', value: 'weird' },
      { id: 'odd', name: 'Odd', field: 'maturity', value: 'ancient' },
      { id: 'odd', name: 'Odd', field: 'confidence', value: 'Certain' },
    ]);
  });

  it('counts what it included by type and what it read', () => {
    const { report } = buildDataset([alpha, beta, note('Skip', 'type: index')]);

    expect(report).toMatchObject({
      notesRead: 3,
      includedByType: { pattern: 1, methodology: 1 },
      includedTypes: ['pattern', 'methodology'],
    });
  });
});

describe('formatReport', () => {
  it('prints every part of the report', () => {
    const lines = formatReport(
      buildDataset([
        alpha,
        note('Thin', 'type: pattern\ncategory: nope', '## Related Patterns\n- [[Nowhere]]'),
        note('Skip', 'type: index'),
      ]),
    ).join('\n');

    expect(lines).toContain('Included: 2 of 3 notes (2 pattern).');
    expect(lines).toContain('Skip.md: Its type is "index"');
    expect(lines).toContain('Thin: missing summary, whenToUse, whenNotToUse');
    expect(lines).toContain('Thin -> Nowhere');
    expect(lines).toContain('Thin: category "nope" is unknown');
    expect(lines).toContain('Related links: 2 links in total.');
  });
});

describe('helpers', () => {
  it('slugifies names', () => {
    expect(slugify('Orchestrator-Workers')).toBe('orchestrator-workers');
    expect(slugify('Agent OS')).toBe('agent-os');
    expect(slugify('Café Étude')).toBe('cafe-etude');
    expect(slugify('***')).toBe('note');
  });

  it('names a note after its file', () => {
    expect(noteName('folder/Agent Teams.md')).toBe('Agent Teams');
    expect(noteName('C:\\notes\\Plan.MD')).toBe('Plan');
  });

  it('parses a comma list of types', () => {
    expect(parseTypeList(' Pattern, methodology ,, pattern')).toEqual(['pattern', 'methodology']);
  });
});
