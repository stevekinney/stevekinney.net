import { describe, expect, test } from 'bun:test';

import {
  extractTailwindPlaygroundHtml,
  extractTailwindPlaygrounds,
  validateTailwindPlaygroundCss,
} from './tailwind-playground.ts';
import {
  parseTailwindPlaygroundMetadata,
  parseTailwindPlaygroundStyleMetadata,
  playgroundFingerprint,
} from './tailwind-playground-metadata.ts';

describe('tailwind playground metadata', () => {
  test('does not treat quoted words as markers and rejects duplicate or malformed options', () => {
    expect(parseTailwindPlaygroundMetadata('title="A tailwind example"')).toBeNull();
    expect(
      parseTailwindPlaygroundMetadata('title="A tailwind example" tailwind height=160')?.title,
    ).toBe('A tailwind example');
    expect(
      parseTailwindPlaygroundMetadata('tailwind height=160 title="Say \\"hello\\"" {1, 3-5}')
        ?.title,
    ).toBe('Say "hello"');
    for (const metadata of [
      'tailwind height=160 height=200',
      'tailwind height=1e2',
      'tailwind height=0x10',
      'tailwind height=160 unknown=true',
      'tailwind height=160 title="broken',
      'tailwind height=160 {invalid}',
    ]) {
      expect(() => parseTailwindPlaygroundMetadata(metadata)).toThrow();
    }
    expect(parseTailwindPlaygroundStyleMetadata('playground=brand')).toEqual({ name: 'brand' });
    expect(() =>
      parseTailwindPlaygroundStyleMetadata('playground=brand playground=second'),
    ).toThrow();
  });

  test('includes linked CSS and resolved title in source fingerprints', () => {
    const base = playgroundFingerprint('<button>Save</button>', 'tailwind height=160', {
      css: '.button { color: red; }',
      title: 'Buttons — Example 1',
    });
    expect(
      playgroundFingerprint('<button>Save</button>', 'tailwind height=160', {
        css: '.button { color: blue; }',
        title: 'Buttons — Example 1',
      }),
    ).not.toBe(base);
    expect(
      playgroundFingerprint('<button>Save</button>', 'tailwind height=160', {
        css: '.button { color: red; }',
        title: 'Other Buttons — Example 1',
      }),
    ).not.toBe(base);
  });

  test('parses quoted options and defaults theme', () => {
    expect(parseTailwindPlaygroundMetadata('tailwind height=160 title="A button"')).toEqual({
      height: 160,
      theme: 'light',
      title: 'A button',
    });
  });

  test('rejects missing or unsafe heights', () => {
    expect(() => parseTailwindPlaygroundMetadata('tailwind')).toThrow();
    expect(() => parseTailwindPlaygroundMetadata('tailwind height=0')).toThrow();
    expect(parseTailwindPlaygroundMetadata('tailwindcss height=160')).toBeNull();
  });
});

describe('tailwind playground extraction', () => {
  test('counts actual document elements and rejects executable data URLs', () => {
    expect(() => extractTailwindPlaygroundHtml('<html><html><body>Example</body>')).toThrow(
      'Duplicate',
    );
    expect(() => extractTailwindPlaygroundHtml('<body><body>Example</body>')).toThrow('Duplicate');
    expect(() =>
      extractTailwindPlaygroundHtml('<!-- <html> --><div title="<body>">Example</div>'),
    ).not.toThrow();
    for (const url of [
      'data:text/html,<h1>Injected</h1>',
      'data:text/html;charset=utf-8,hello',
      'java&#9;script:alert(1)',
    ]) {
      expect(() => extractTailwindPlaygroundHtml(`<a href="${url}">Link</a>`)).toThrow(
        'Executable URL',
      );
    }
  });
  test('preserves semantic markup and attributes while collecting classes', () => {
    const result = extractTailwindPlaygroundHtml(
      '<main data-kind="demo"><details open><summary class="z a a">Hi</summary></details></main>',
    );
    expect(result.html).toContain('<details open="">');
    expect(result.htmlAttributes).toEqual({});
    expect(result.candidates).toEqual(['a', 'z']);
  });

  test('preserves decoded nonbreaking spaces inside class tokens', () => {
    const result = extractTailwindPlaygroundHtml(`<div class="before:content-['A&nbsp;B']"></div>`);
    expect(result.candidates).toEqual(["before:content-['A\u00a0B']"]);
  });

  test('rejects executable HTML and forbidden CSS imports', () => {
    expect(() => extractTailwindPlaygroundHtml('<button onclick="alert(1)">X</button>')).toThrow();
    expect(() => validateTailwindPlaygroundCss('@import "x";')).toThrow();
    expect(() => validateTailwindPlaygroundCss('@im\\port "x";')).toThrow(/Escaped CSS/);
    expect(() =>
      validateTailwindPlaygroundCss('@reference "https://example.com/theme.css";'),
    ).toThrow();
    expect(() => extractTailwindPlaygroundHtml('<frameset><frame src="/x"></frameset>')).toThrow();
    expect(() => extractTailwindPlaygroundHtml('<portal src="/x"></portal>')).toThrow();
  });

  test('keeps top-level noscript in the body and inspects template content', () => {
    expect(extractTailwindPlaygroundHtml('<noscript>Fallback</noscript>').html).toContain(
      '<noscript>Fallback</noscript>',
    );
    expect(() =>
      extractTailwindPlaygroundHtml('<template><script>alert(1)</script></template>'),
    ).toThrow();
  });

  test('resolves named CSS fragments and fingerprints original fence values', () => {
    const [playground] = extractTailwindPlaygrounds(
      [
        {
          lang: 'css',
          value: '.button { @apply font-bold; }',
          meta: 'playground=brand',
          line: 1,
          ordinal: 0,
        },
        {
          lang: 'html',
          value: '<button class="button">Save</button>',
          meta: 'tailwind height=160 css=brand',
          line: 4,
          ordinal: 1,
        },
      ],
      'writing/example.md',
    );
    expect(playground).toMatchObject({
      css: '.button { @apply font-bold; }',
      cssName: 'brand',
      cssAnchor: 'playground-css-brand',
      sourcePath: 'writing/example.md',
      ordinal: 0,
    });
    expect(playground.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  test('requires the HTML language and preserves an authored Example title', () => {
    const playgrounds = extractTailwindPlaygrounds(
      [
        { lang: 'html', value: '<p>ignored</p>', meta: 'tailwind height=160', line: 2, ordinal: 0 },
        {
          lang: 'html',
          value: '<p>shown</p>',
          meta: 'tailwind height=160 title="Example custom"',
          line: 4,
          ordinal: 1,
        },
      ],
      'writing/example.md',
    );
    expect(playgrounds).toHaveLength(2);
    expect(playgrounds[1]?.title).toBe('Example custom');
    expect(
      extractTailwindPlaygrounds(
        [{ lang: 'css', value: '<p>no</p>', meta: 'tailwind height=160', line: 1, ordinal: 0 }],
        'x',
      ),
    ).toEqual([]);
  });

  test('uses the nearest heading for generated titles', () => {
    const playgrounds = extractTailwindPlaygrounds(
      [
        {
          lang: 'html',
          value: '<p>one</p>',
          meta: 'tailwind height=160',
          line: 2,
          ordinal: 0,
          heading: 'First',
        },
        {
          lang: 'html',
          value: '<p>two</p>',
          meta: 'tailwind height=160',
          line: 6,
          ordinal: 1,
          heading: 'Second',
        },
        {
          lang: 'html',
          value: '<p>three</p>',
          meta: 'tailwind height=160',
          line: 10,
          ordinal: 2,
          heading: 'Third',
        },
      ],
      'writing/example.md',
    );
    expect(playgrounds.map(({ title }) => title)).toEqual([
      'First — Example 1',
      'Second — Example 2',
      'Third — Example 3',
    ]);
  });

  test('reports the source location for malformed fence metadata', () => {
    expect(() =>
      extractTailwindPlaygrounds(
        [{ lang: 'html', value: '<p>x</p>', meta: 'tailwind height=1e2', line: 42, ordinal: 0 }],
        'courses/example.md',
      ),
    ).toThrow('courses/example.md:42');
  });
});
