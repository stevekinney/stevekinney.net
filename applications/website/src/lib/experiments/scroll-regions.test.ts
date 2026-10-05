import { describe, expect, it } from 'vitest';

// A wide table scrolls inside a `role="region"` element. With `tabindex="-1"`
// a keyboard can't reach it, so its hidden columns can't be scrolled into view.
const sources = import.meta.glob<string>('/src/routes/experiments/**/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Every opening tag with `role="region"` that scrolls, read up to the first `>`
 * outside an expression. A region that doesn't scroll, such as a fixed tray, is
 * a landmark and needs no tab stop.
 */
const regions = Object.entries(sources).flatMap(([file, source]) =>
  [...source.matchAll(/<(?:div|section)\b(?:[^>{]|\{[^}]*\})*role="region"(?:[^>{]|\{[^}]*\})*>/g)]
    .map(([tag]) => ({ file: file.replace('/src/routes/experiments/', ''), tag }))
    .filter(({ tag }) => /overflow-|tableRegionClasses/.test(tag)),
);

describe('scrollable regions in the experiments', () => {
  it('finds the regions it checks', () => {
    expect(regions.length).toBeGreaterThan(20);
  });

  it.each(regions)('$file has a region a keyboard can reach', ({ tag }) => {
    expect(tag).toContain('tabindex="0"');
    expect(tag).toMatch(/aria-label(?:ledby)?=/);
  });
});
