import { describe, expect, it } from 'vitest';

import { parseLenientJson, stripJsonExtras } from './lenient-json';

describe('parseLenientJson', () => {
  it('parses strict JSON without marking it lenient', () => {
    expect(parseLenientJson('{"a": 1}')).toEqual({ value: { a: 1 }, lenient: false });
  });

  it('accepts comments and trailing commas', () => {
    const text = `{
      // the main model
      "model": "opus", /* inline */
      "env": { "A": "1", },
      "list": [1, 2,],
    }`;

    expect(parseLenientJson(text)).toEqual({
      value: { model: 'opus', env: { A: '1' }, list: [1, 2] },
      lenient: true,
    });
  });

  it('leaves slashes, commas, and brackets inside strings alone', () => {
    const text = '{"url": "https://example.com/a,b]", "note": "/* not a comment */", }';

    expect(parseLenientJson(text)?.value).toEqual({
      url: 'https://example.com/a,b]',
      note: '/* not a comment */',
    });
    expect(stripJsonExtras('{"a": "x\\"//y",}')).toBe('{"a": "x\\"//y"}');
  });

  it('returns null for text that is not JSON at all', () => {
    expect(parseLenientJson('not json')).toBeNull();
  });
});
