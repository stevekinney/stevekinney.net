import { describe, expect, it } from 'vitest';

import {
  defaultModels,
  matchModel,
  modelLabel,
  modelsOffTheRatio,
  normalizeModelId,
  parsePriceTable,
  renamedModelId,
  pricesEqual,
  ratesFor,
  serializePriceTable,
  toModelId,
} from './pricing';

const nameOf = (model: string): string | undefined => matchModel(model, defaultModels)?.name;

describe('matchModel', () => {
  it('matches a model ID on its family and full version', () => {
    expect(nameOf('claude-opus-5')).toBe('Opus 5');
    expect(nameOf('claude-fable-5-1')).toBe('Fable 5.1');
    expect(nameOf('claude-sonnet-5')).toBe('Sonnet 5');
  });

  it('ignores the one-million-token suffix and a snapshot date', () => {
    expect(nameOf('claude-sonnet-4-6[1m]')).toBe('Sonnet 4.6');
    expect(nameOf('claude-haiku-4-5-20251001')).toBe('Haiku 4.5');
  });

  it('never prices a newer version at an older version’s rates', () => {
    expect(nameOf('claude-opus-5-1')).toBeUndefined();
    expect(nameOf('claude-sonnet-5-1')).toBeUndefined();
    expect(nameOf('claude-opus-5-1[1m]')).toBeUndefined();
  });

  it('prices the 5.5 models at their own rates', () => {
    expect(nameOf('claude-opus-5-5')).toBe('Opus 5.5');
    expect(nameOf('claude-opus-5-5[1m]')).toBe('Opus 5.5');
    expect(nameOf('claude-sonnet-5-5')).toBe('Sonnet 5.5');
  });

  it('matches a model the person added to the table', () => {
    const models = [...defaultModels, { id: 'opus-5-1', name: 'Opus 5.1', input: 5, output: 25 }];

    expect(matchModel('claude-opus-5-1', models)?.name).toBe('Opus 5.1');
    expect(matchModel('claude-opus-5', models)?.name).toBe('Opus 5');
  });

  it('is not case sensitive', () => {
    expect(nameOf(' Claude-Opus-5 ')).toBe('Opus 5');
    expect(normalizeModelId('Claude-Opus-5[1m]')).toBe('opus-5');
  });
});

describe('ratesFor', () => {
  it('reads at a tenth of input and writes at twice input for an hour', () => {
    expect(ratesFor({ input: 5, output: 25 }, '1h')).toEqual({
      input: 5,
      output: 25,
      read: 0.5,
      write: 10,
    });
  });

  it('writes at 1.25 times input for five minutes', () => {
    expect(ratesFor({ input: 5, output: 25 }, '5m').write).toBe(6.25);
  });
});

describe('modelLabel', () => {
  it('shows the name and the prices', () => {
    expect(modelLabel(defaultModels[1])).toBe('Opus 5 ($5/$25)');
    expect(modelLabel({ id: 'x', name: 'Custom', input: 1.5, output: 7.5 })).toBe(
      'Custom ($1.5/$7.5)',
    );
  });
});

describe('modelsOffTheRatio', () => {
  it('finds nothing in the default table, where output is always five times input', () => {
    expect(modelsOffTheRatio(defaultModels)).toEqual([]);
  });

  it('names a model whose output price breaks the ratio', () => {
    const odd = { id: 'odd', name: 'Odd', input: 2, output: 12 };

    expect(modelsOffTheRatio([...defaultModels, odd])).toEqual([odd]);
  });
});

describe('pricesEqual', () => {
  it('compares every field in order', () => {
    expect(
      pricesEqual(
        defaultModels,
        defaultModels.map((model) => ({ ...model })),
      ),
    ).toBe(true);
    expect(pricesEqual(defaultModels, defaultModels.slice(1))).toBe(false);
    expect(
      pricesEqual(
        defaultModels,
        defaultModels.map((model, index) => (index === 0 ? { ...model, output: 51 } : model)),
      ),
    ).toBe(false);
  });
});

describe('toModelId', () => {
  it('makes a URL-safe ID from a name', () => {
    expect(toModelId('Opus 5.5')).toBe('opus-5-5');
    expect(toModelId('  Fable   6 (preview) ')).toBe('fable-6-preview');
  });
});

describe('renamedModelId', () => {
  const before = [
    { id: 'a', name: 'A', input: 1, output: 5 },
    { id: 'b', name: 'B', input: 2, output: 10 },
  ];

  it('follows a row whose only change is its ID', () => {
    expect(renamedModelId(before, [before[0], { ...before[1], id: 'b2' }], 'b')).toBe('b2');
  });

  it('returns null for a deletion, a replacement, or a repriced row', () => {
    expect(renamedModelId(before, [before[0]], 'b')).toBeNull();
    expect(
      renamedModelId(before, [before[0], { ...before[1], id: 'c', input: 3 }], 'b'),
    ).toBeNull();
    expect(
      renamedModelId(before, [before[0], { ...before[1], id: 'c', name: 'C' }], 'b'),
    ).toBeNull();
  });
});

describe('parsePriceTable', () => {
  it('round-trips the default table', () => {
    expect(parsePriceTable(serializePriceTable(defaultModels))).toEqual({
      models: [...defaultModels],
    });
  });

  it('accepts a bare list and fills in a missing ID from the name', () => {
    expect(parsePriceTable('[{"name":"Opus 5.5","input":5,"output":25}]')).toEqual({
      models: [{ id: 'opus-5-5', name: 'Opus 5.5', input: 5, output: 25 }],
    });
  });

  it.each([
    ['{"models":[{"id":"Opus_5.5","name":"A","input":1,"output":5}]}', 'lowercase letters'],
    ['{"models":[{"id":"has space","name":"A","input":1,"output":5}]}', 'lowercase letters'],
    [`{"models":[{"id":"${'a'.repeat(61)}","name":"A","input":1,"output":5}]}`, '60 characters'],
    [`{"models":[{"name":"${'long '.repeat(20)}","input":1,"output":5}]}`, '60 characters'],
  ])('rejects an ID that a shared link could not carry: %#', (text, message) => {
    const result = parsePriceTable(text);

    expect('error' in result && result.error).toContain(message);
  });

  it.each([
    ['not json', 'valid JSON'],
    ['{}', 'models'],
    ['{"models":[]}', 'models'],
    ['{"models":[3]}', 'isn’t an object'],
    ['{"models":[{"input":1,"output":5}]}', 'needs a name'],
    ['{"models":[{"name":"A","input":0,"output":5}]}', 'positive'],
    ['{"models":[{"name":"A","input":"1","output":5}]}', 'positive'],
    [
      '{"models":[{"name":"A","input":1,"output":5},{"name":"a","input":1,"output":5}]}',
      'more than once',
    ],
  ])('rejects %s', (text, message) => {
    const result = parsePriceTable(text);

    expect('error' in result && result.error).toContain(message);
  });
});
