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

  test('resolves authored URLs against the source route before relocating the document', () => {
    const [lesson] = extractTailwindPlaygrounds(
      [
        {
          lang: 'html',
          value:
            '<a href="next">Next</a><a href="#section">Section</a><img src="image.png" srcset="small.png 1x,data:image/png;base64,AAAA 2x,large.png 3x"><img src="/already-root/../asset.png"><img src="https://example.com/asset.png"><img src="data:image/png;base64,AAAA"><div style="background: url(icons/icon.svg)"></div><svg><use href="icons.svg#check" xlink:href="symbols.svg#check" /></use></svg><form action="submit" formaction="/save"><blockquote cite="notes.txt">Quote</blockquote></form>',
          meta: 'tailwind height=160',
          line: 1,
          ordinal: 0,
        },
      ],
      'courses/testing/the-basics.md',
    );
    expect(lesson?.html).toContain('href="/courses/testing/next"');
    expect(lesson?.html).toContain('href="#section"');
    expect(lesson?.html).toContain('src="/courses/testing/image.png"');
    expect(lesson?.html).toContain(
      'srcset="/courses/testing/small.png 1x, data:image/png;base64,AAAA 2x, /courses/testing/large.png 3x"',
    );
    expect(lesson?.html).toContain('src="/already-root/../asset.png"');
    expect(lesson?.html).toContain('src="https://example.com/asset.png"');
    expect(lesson?.html).toContain('src="data:image/png;base64,AAAA"');
    expect(lesson?.html).toContain('style="background: url(/courses/testing/icons/icon.svg)"');
    expect(lesson?.html).toContain('href="/courses/testing/icons.svg#check"');
    expect(lesson?.html).toContain('xlink:href="/courses/testing/symbols.svg#check"');
    expect(lesson?.html).toContain('action="/courses/testing/submit"');
    expect(lesson?.html).toContain('formaction="/save"');
    expect(lesson?.html).toContain('cite="/courses/testing/notes.txt"');
  });

  test('resolves course README URLs against the course route', () => {
    const [course] = extractTailwindPlaygrounds(
      [
        {
          lang: 'html',
          value: '<img src="cover.png">',
          meta: 'tailwind height=160',
          line: 1,
          ordinal: 0,
        },
      ],
      'courses/testing/README.md',
    );
    expect(course?.html).toContain('src="/courses/testing/cover.png"');
  });

  test('resolves writing URLs against the writing route', () => {
    const [writing] = extractTailwindPlaygrounds(
      [
        {
          lang: 'html',
          value: '<img src="asset.png">',
          meta: 'tailwind height=160',
          line: 1,
          ordinal: 0,
        },
      ],
      'writing/example.md',
    );
    expect(writing?.html).toContain('src="/writing/asset.png"');
  });

  test('resolves relative URLs in linked CSS per source route before grouping', () => {
    const playgrounds = extractTailwindPlaygrounds(
      [
        {
          lang: 'css',
          value: '.card { background: url(./texture%20one.png); mask: url("#mask"); }',
          meta: 'playground=cards',
          line: 1,
          ordinal: 0,
        },
        {
          lang: 'html',
          value: '<div class="card">One</div>',
          meta: 'tailwind height=160 css=cards',
          line: 3,
          ordinal: 1,
        },
        {
          lang: 'html',
          value: '<div class="card">Two</div>',
          meta: 'tailwind height=160 css=cards',
          line: 5,
          ordinal: 2,
        },
      ],
      'courses/testing/one.md',
    );
    expect(playgrounds[0]?.css).toContain('url(/courses/testing/texture%20one.png)');
    expect(playgrounds[0]?.css).toContain('url("#mask")');
    expect(playgrounds[0]?.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  test('keeps CSS configurations distinct when their relative resource bases differ', () => {
    const definitions = ['courses/one/lesson.md', 'courses/two/lesson.md'].map(
      (sourcePath) =>
        extractTailwindPlaygrounds(
          [
            {
              lang: 'css',
              value: '.card { background: url(texture.png); }',
              meta: 'playground=card',
              line: 1,
              ordinal: 0,
            },
            {
              lang: 'html',
              value: '<div class="card">Card</div>',
              meta: 'tailwind height=160 css=card',
              line: 4,
              ordinal: 1,
            },
          ],
          sourcePath,
        )[0]!,
    );
    expect(definitions[0].css).toContain('/courses/one/texture.png');
    expect(definitions[1].css).toContain('/courses/two/texture.png');
    expect(definitions[0].css).not.toBe(definitions[1].css);
    expect(definitions[0].sourceFingerprint).toBe(definitions[1].sourceFingerprint);
  });

  test('preserves local fragments and all parsed srcset descriptors', () => {
    const result = extractTailwindPlaygroundHtml(
      '<a href=" #section ">Jump</a><img srcset="zero.png 0x, sized.png 100w 50h">',
      '/courses/testing/lesson',
    );
    expect(result.html).toContain('href=" #section "');
    expect(result.html).toContain(
      'srcset="/courses/testing/zero.png 0x, /courses/testing/sized.png 100w 50h"',
    );
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
