// @vitest-environment jsdom
import { enhanceTableOfContents } from '@stevekinney/content-enhancements/enhance-table-of-contents';
import { beforeEach, describe, expect, test } from 'vitest';

/** Build a content root containing the given headings (`[tag, id, text]`). */
const createRoot = (headings: Array<[tag: 'h2' | 'h3', id: string, text: string]>): HTMLElement => {
  const root = document.createElement('div');
  for (const [tag, id, text] of headings) {
    const heading = document.createElement(tag);
    if (id) heading.id = id;
    heading.textContent = text;
    root.appendChild(heading);
  }
  document.body.appendChild(root);
  return root;
};

describe('enhanceTableOfContents', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('does nothing when there are fewer than three linkable headings', () => {
    const root = createRoot([
      ['h2', 'one', 'One'],
      ['h2', 'two', 'Two'],
    ]);

    const { destroy } = enhanceTableOfContents(root);

    expect(root.querySelector('nav[aria-label="On this page"]')).toBeNull();
    destroy();
  });

  test('injects a navigation before the first heading once there are three headings', () => {
    const root = createRoot([
      ['h2', 'intro', 'Intro'],
      ['h3', 'details', 'Details'],
      ['h2', 'wrap-up', 'Wrap Up'],
    ]);

    enhanceTableOfContents(root);

    const nav = root.querySelector('nav[aria-label="On this page"]');
    expect(nav).not.toBeNull();
    // Injected as the very first child, before the first heading.
    expect(root.firstElementChild).toBe(nav);

    const links = [...(nav?.querySelectorAll('a') ?? [])];
    expect(links).toHaveLength(3);
    expect(links.map((link) => link.textContent)).toEqual(['Intro', 'Details', 'Wrap Up']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#intro',
      '#details',
      '#wrap-up',
    ]);
  });

  test('skips headings with duplicate ids so fragment links stay unambiguous', () => {
    const root = createRoot([
      ['h2', 'setup', 'Setup'],
      ['h2', 'setup', 'Setup Again'],
      ['h2', 'teardown', 'Teardown'],
      ['h2', 'verify', 'Verify'],
    ]);

    enhanceTableOfContents(root);

    const links = [...(root.querySelectorAll('nav[aria-label="On this page"] a') ?? [])];
    // The duplicate `setup` heading is dropped; the first occurrence wins.
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#setup',
      '#teardown',
      '#verify',
    ]);
    expect(links.map((link) => link.textContent)).toEqual(['Setup', 'Teardown', 'Verify']);
  });

  test('ignores headings with empty or whitespace-only text', () => {
    const root = createRoot([
      ['h2', 'real-one', 'Real One'],
      ['h2', 'blank', '   '],
      ['h2', 'real-two', 'Real Two'],
    ]);

    enhanceTableOfContents(root);

    // Only two linkable headings remain, so the nav is not injected.
    expect(root.querySelector('nav[aria-label="On this page"]')).toBeNull();
  });

  test('trims surrounding whitespace from link text', () => {
    const root = createRoot([
      ['h2', 'a', '  Alpha  '],
      ['h2', 'b', 'Beta'],
      ['h2', 'c', 'Gamma'],
    ]);

    enhanceTableOfContents(root);

    const firstLink = root.querySelector('nav[aria-label="On this page"] a');
    expect(firstLink?.textContent).toBe('Alpha');
  });

  test('encodes fragment ids containing spaces or non-ASCII characters', () => {
    const root = createRoot([
      ['h2', 'café-menu', 'Café Menu'],
      ['h2', 'second', 'Second'],
      ['h2', 'third', 'Third'],
    ]);

    enhanceTableOfContents(root);

    const firstLink = root.querySelector('nav[aria-label="On this page"] a');
    // `anchor.hash` percent-encodes the fragment so the link is valid.
    expect(firstLink?.getAttribute('href')).toBe('#caf%C3%A9-menu');
  });

  test('destroy removes the injected navigation', () => {
    const root = createRoot([
      ['h2', 'one', 'One'],
      ['h2', 'two', 'Two'],
      ['h2', 'three', 'Three'],
    ]);

    const { destroy } = enhanceTableOfContents(root);
    expect(root.querySelector('nav[aria-label="On this page"]')).not.toBeNull();

    destroy();
    expect(root.querySelector('nav[aria-label="On this page"]')).toBeNull();
  });
});
