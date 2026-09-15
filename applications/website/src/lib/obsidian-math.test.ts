import { Buffer } from 'node:buffer';

import { compile as compileMdsveX } from 'mdsvex';
import { compile as compileSvelte } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import type { MdsvexOptions } from 'mdsvex';

import rehypeObsidianMath, {
  getObsidianMathStylesheet,
} from '@stevekinney/markdown/rehype-obsidian-math';

const marker = (value: string, display: 'inline' | 'block'): string => {
  const tag = display === 'inline' ? 'span' : 'div';
  const encoded = Buffer.from(value, 'utf8').toString('base64url');
  return `<${tag} data-obsidian-math="${encoded}" data-display="${display}"></${tag}>`;
};

const render = async (markdown: string): Promise<string> => {
  type Pluggable = NonNullable<MdsvexOptions['rehypePlugins']>[number];
  const document = await compileMdsveX(markdown, {
    rehypePlugins: [rehypeObsidianMath as Pluggable],
  });
  if (!document) throw new Error('mdsvex returned no compiled document');
  compileSvelte(document.code, { generate: 'client' });
  return document.code;
};

describe('rehypeObsidianMath', () => {
  it('renders inline and display markers through MathJax', async () => {
    const output = await render(`${marker('x^2', 'inline')}\n\n${marker('\\frac{1}{2}', 'block')}`);
    expect(output).toContain('<mjx-container');
    expect(output).toContain('display="true"');
    expect(output).not.toContain('data-obsidian-math');
    expect(output).not.toContain('<style');
  });

  it('does not duplicate identifiers for repeated equations', async () => {
    const output = await render(`${marker('x^2', 'inline')} ${marker('x^2', 'inline')}`);
    const ids = [...output.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rejects malformed markers and invalid TeX', async () => {
    await expect(
      render('<span data-obsidian-math="%%%" data-display="inline"></span>'),
    ).rejects.toThrow('Invalid Obsidian math marker encoding');
    await expect(render(marker('\\notacommand', 'inline'))).rejects.toThrow('Invalid Obsidian TeX');
  });

  it('exports a nonempty global stylesheet', () => {
    expect(getObsidianMathStylesheet()).toMatch(/mjx-container|math/);
  });
  it('preserves ordinary colored markup and valid colored equations', async () => {
    await expect(render('<svg><path fill="red" /></svg>')).resolves.toContain('fill="red"');
    await expect(render(`Text ${marker('\\color{red}x', 'inline')} after`)).resolves.toContain(
      'mjx-container',
    );
  });
});
