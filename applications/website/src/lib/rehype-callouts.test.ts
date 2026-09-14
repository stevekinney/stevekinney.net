import { compile as compileSvelte } from 'svelte/compiler';
import { compile as compileMdsveX } from 'mdsvex';
import { describe, expect, it } from 'vitest';

import rehypeCallouts from '@stevekinney/markdown/rehype-callouts';

const render = async (markdown: string): Promise<string> => {
  const document = await compileMdsveX(markdown, {
    rehypePlugins: [
      rehypeCallouts as NonNullable<Parameters<typeof compileMdsveX>[1]>['rehypePlugins'] extends
        (infer Plugin)[] | undefined
        ? Plugin
        : never,
    ],
  });
  if (!document) throw new Error('mdsvex returned no compiled document');

  compileSvelte(document.code, { generate: 'client' });
  return document.code;
};

describe('rehypeCallouts', () => {
  it('renders escaped source markers from published markdown', async () => {
    const output = await render('> \\[!NOTE] Published title\n> Published body');

    expect(output).toContain('data-callout="note"');
    expect(output).toContain('Published title');
    expect(output).toContain('Published body');
  });

  it('renders a titled callout with the full native structure', async () => {
    const output = await render('> [!NOTE] This is **important**\n> Body');

    expect(output).toContain('data-callout="note"');
    expect(output).toContain('data-collapsible="false"');
    expect(output).toContain('callout-title');
    expect(output).toContain('callout-title-icon');
    expect(output).toContain('callout-title-text');
    expect(output).toContain('callout-content');
    expect(output).toContain('<strong>important</strong>');
  });

  it('uses the default Obsidian title when no title is supplied', async () => {
    const output = await render('> [!TIP]\n> Body');

    expect(output).toContain('>Tip<');
    expect(output).toContain('Body');
  });

  it('renders folding indicators with native details and open state', async () => {
    const collapsed = await render('> [!WARNING]- Closed\n> Body');
    const expanded = await render('> [!NOTE]+ Open\n> Body');

    expect(collapsed).toContain('<details');
    expect(collapsed).toContain('data-collapsible="true"');
    expect(collapsed).not.toContain(' open');
    expect(expanded).toContain('<details');
    expect(expanded).toContain(' open');
  });

  it('supports aliases and formatted titles', async () => {
    const output = await render('> [!warn] **Heads up**\n> Body');

    expect(output).toContain('data-callout="warning"');
    expect(output).toContain('<strong>Heads up</strong>');
  });

  it('supports nested callouts', async () => {
    const output = await render('> [!NOTE] Outer\n>\n> > [!TIP] Inner\n> > Content');

    expect(output.match(/data-callout="/g)).toHaveLength(2);
    expect(output).toContain('Outer');
    expect(output).toContain('Inner');
  });

  it('renders custom aliases, math titles, and nested folding with native state', async () => {
    const output = await render(
      '> [!information]- Outer $x$\n>\n> > [!custom]+ Inner\n> > Content',
    );

    expect(output).toContain('data-callout="info"');
    expect(output).toContain('data-callout="custom"');
    expect(output.match(/<details/g)).toHaveLength(2);
    expect(output.match(/ open/g)).toHaveLength(1);
    expect(output).toContain('Outer $x$');
  });

  it('preserves code braces and renders valid custom markers with note fallback', async () => {
    const output = await render('> [!custom]- Example\n> Use `{ value }`\n\n> ordinary text');

    expect(output).toContain('&#123; value &#125;');
    expect(output).toContain('data-callout="custom"');
    expect(output).toContain('data-collapsible="true"');
    expect(output).toContain('<blockquote>');
  });

  it('leaves malformed and empty markers as quotes', async () => {
    const output = await render('> [!]\n> Body\n\n> ordinary text');

    expect(output.match(/<blockquote>/g)).toHaveLength(2);
    expect(output).not.toContain('data-callout=');
  });

  it('preserves malformed escaped markers as ordinary quote text', async () => {
    const output = await render('> \\[!] Not a callout\n> Body');

    expect(output).toContain('[!] Not a callout');
    expect(output).not.toContain('data-callout=');
  });

  it('leaves a quote alone when a later paragraph starts with a marker', async () => {
    const output = await render('> # A heading\n>\n> [!NOTE] This is ordinary text');

    expect(output).not.toContain('data-callout=');
    expect(output).toContain('[!NOTE] This is ordinary text');
  });
});
