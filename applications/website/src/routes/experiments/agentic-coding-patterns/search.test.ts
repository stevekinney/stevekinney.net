import { describe, expect, it } from 'vitest';

import { buildDataset } from './normalize-notes';
import { buildSearchDocuments, findRanges, parseQuery, search, toSegments } from './search';

const note = (name: string, fields: Record<string, string>, aliases = '') => ({
  path: `${name}.md`,
  text: `---\ntype: pattern\naliases: [${aliases}]\n---\n${Object.entries(fields)
    .map(([heading, body]) => `## ${heading}\n${body}`)
    .join('\n')}`,
});

const { entries } = buildDataset([
  note(
    'Circuit Breaker',
    {
      'TL;DR': 'Bound the loop by something the **agent** does not control.',
      'When To Use It': 'Always, on an unattended loop.',
      'When Not To Use It': 'Never omit it.',
      'Drawbacks and Failure Modes':
        'The dominant human failure is cap inflation. The run hits the limit.',
    },
    'Budget Cap, Kill Switch',
  ),
  note('Loop Guard', {
    'TL;DR': 'A circuit around a loop.',
    'When To Use It': 'When the circuit is open.',
  }),
  note('Handoff', {
    'TL;DR': 'Transfer control.',
    'Drawbacks and Failure Modes': 'Cap on scope; inflation of trust.',
  }),
]);

const documents = buildSearchDocuments(entries);
const ids = (query: string): string[] =>
  search(documents, parseQuery(query))
    .sort((first, second) => first.score - second.score || first.id.localeCompare(second.id))
    .map(({ id }) => id);

describe('parseQuery', () => {
  it('splits words and keeps quoted phrases together', () => {
    expect(parseQuery('circuit "cap inflation"  loop')).toEqual([
      { text: 'circuit', phrase: false },
      { text: 'cap inflation', phrase: true },
      { text: 'loop', phrase: false },
    ]);
  });

  it('treats an unclosed quote as a phrase to the end and ignores empty ones', () => {
    expect(parseQuery('"cap infl')).toEqual([{ text: 'cap infl', phrase: true }]);
    expect(parseQuery('"" ""   ')).toEqual([]);
  });

  it('accepts curly quotes', () => {
    expect(parseQuery('“cap inflation”')).toEqual([{ text: 'cap inflation', phrase: true }]);
  });
});

describe('search', () => {
  it('finds a phrase that only appears in the drawbacks and names the section', () => {
    const [hit, ...rest] = search(documents, parseQuery('"cap inflation"'));

    expect(rest).toEqual([]);
    expect(hit).toMatchObject({ id: 'circuit-breaker', field: 'drawbacks' });
    expect(hit?.snippet?.text).toContain('cap inflation');
    expect(hit?.snippet?.ranges).toEqual([
      [
        hit?.snippet?.text.indexOf('cap inflation'),
        (hit?.snippet?.text.indexOf('cap inflation') ?? 0) + 13,
      ],
    ]);
  });

  it('requires a quoted phrase to appear together, while loose words may be apart', () => {
    expect(ids('"inflation cap"')).toEqual([]);
    expect(ids('cap inflation')).toEqual(['circuit-breaker', 'handoff']);
  });

  it('requires every word to match somewhere', () => {
    expect(ids('circuit agent')).toEqual(['circuit-breaker']);
    expect(ids('circuit nonsense')).toEqual([]);
  });

  it('ranks a name match above an alias match above a summary match above the rest', () => {
    expect(ids('circuit')).toEqual(['circuit-breaker', 'loop-guard']);
    expect(ids('kill')).toEqual(['circuit-breaker']);
    expect(search(documents, parseQuery('kill'))[0]).toMatchObject({ field: 'aliases' });
    expect(search(documents, parseQuery('unattended'))[0]).toMatchObject({ field: 'whenToUse' });
    expect(search(documents, parseQuery('transfer'))[0]).toMatchObject({ field: 'summary' });
    expect(
      search(documents, parseQuery('circuit')).find(({ id }) => id === 'loop-guard'),
    ).toMatchObject({
      field: 'summary',
    });
  });

  it('matches case-insensitively and across formatting', () => {
    expect(ids('AGENT DOES')).toEqual(['circuit-breaker']);
  });

  it('returns nothing for an empty query', () => {
    expect(search(documents, [])).toEqual([]);
  });

  it('does not treat regular expression characters in a query as syntax', () => {
    expect(ids('(.*')).toEqual([]);
    expect(ids('a+b')).toEqual([]);
  });
});

describe('highlighting', () => {
  it('finds and merges overlapping matches', () => {
    expect(findRanges('circuit circuits', parseQuery('circuit circuits'))).toEqual([
      [0, 7],
      [8, 16],
    ]);
    expect(findRanges('Cap Inflation', parseQuery('"cap inflation" cap'))).toEqual([[0, 13]]);
  });

  it('cuts text into marked and plain segments', () => {
    expect(toSegments('a cap b', [[2, 5]])).toEqual([
      { text: 'a ', match: false },
      { text: 'cap', match: true },
      { text: ' b', match: false },
    ]);
  });
});
