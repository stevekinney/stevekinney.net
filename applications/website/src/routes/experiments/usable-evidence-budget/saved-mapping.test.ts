import { describe, expect, it } from 'vitest';

import { sanitizeMapping } from './saved-mapping';

describe('sanitizeMapping', () => {
  it('keeps labels assigned to a term or to ignore', () => {
    expect(sanitizeMapping({ 'plugin listing': 'instructions', beta: 'ignore' })).toEqual({
      'plugin listing': 'instructions',
      beta: 'ignore',
    });
  });

  it('drops anything else, since storage can hold whatever an earlier version or another script wrote', () => {
    expect(sanitizeMapping({ a: 'nonsense', b: 5, c: 'free', '': 'tools' })).toEqual({});
    expect(sanitizeMapping(null)).toEqual({});
    expect(sanitizeMapping(['tools'])).toEqual({});
    expect(sanitizeMapping('tools')).toEqual({});
  });
});
